import { NextResponse } from 'next/server';
import type { UserRecord } from 'firebase-admin/auth';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import type { CenterManager } from '@/src/types';

type ManagerMutation =
  | {
      action: 'upsert';
      managerId?: string;
      name?: string;
      email?: string;
      centerId?: string;
      active?: boolean;
    }
  | {
      action: 'set_active';
      managerId?: string;
      active?: boolean;
    }
  | {
      action: 'archive';
      managerId?: string;
    };

function requiredText(value: unknown, label: string, maxLength = 160): string {
  const resolved = typeof value === 'string' ? value.trim() : '';
  if (!resolved || resolved.length > maxLength) {
    throw new CrmAccessError(`${label} invalide.`, 400);
  }
  return resolved;
}

function normalizedEmail(value: unknown): string {
  const email = requiredText(value, 'Adresse e-mail').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CrmAccessError('Adresse e-mail manager invalide.', 400);
  }
  return email;
}

async function findOrCreateAuthUser(email: string, name: string): Promise<{ user: UserRecord; created: boolean }> {
  const auth = getAdminAuthInstance();
  try {
    return { user: await auth.getUserByEmail(email), created: false };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (!code.includes('user-not-found')) throw error;
    const user = await auth.createUser({
      email,
      displayName: name,
      disabled: true,
    });
    return { user, created: true };
  }
}

async function disableCrmIdentity(uid: string): Promise<void> {
  const auth = getAdminAuthInstance();
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  delete claims.crmRole;
  delete claims.crmCenterId;
  await auth.updateUser(uid, { disabled: true });
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);
}

async function enableManagerIdentity(uid: string, name: string, centerId: string): Promise<void> {
  const auth = getAdminAuthInstance();
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    crmRole: 'center_manager',
    crmCenterId: centerId,
  });
  await auth.updateUser(uid, {
    displayName: name,
    disabled: false,
  });
  await auth.revokeRefreshTokens(uid);
}

async function ensureIdentityIsNotSuperAdmin(uid: string): Promise<void> {
  const profile = await getAdminDb().collection('users').doc(uid).get();
  if (profile.exists && profile.data()?.role === 'super_admin') {
    throw new CrmAccessError('Ce compte appartient au super administrateur et ne peut pas devenir manager.', 409);
  }
}

async function resolvePreviousUid(manager: CenterManager | null): Promise<string | null> {
  if (!manager) return null;
  if (manager.authUid) return manager.authUid;
  try {
    return (await getAdminAuthInstance().getUserByEmail(manager.email)).uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin']);
    const payload = await request.json().catch(() => ({})) as ManagerMutation;
    const db = getAdminDb();
    const auth = getAdminAuthInstance();
    const now = new Date().toISOString();

    if (payload.action === 'upsert') {
      const name = requiredText(payload.name, 'Nom du manager');
      const email = normalizedEmail(payload.email);
      const centerId = requiredText(payload.centerId, 'Centre', 80);
      const active = payload.active === true;
      const centerSnapshot = await db.collection('centers').doc(centerId).get();
      if (!centerSnapshot.exists) {
        throw new CrmAccessError('Centre introuvable.', 400);
      }

      const managerId = payload.managerId
        ? requiredText(payload.managerId, 'Identifiant manager', 120)
        : db.collection('managers').doc().id;
      const managerRef = db.collection('managers').doc(managerId);
      const previousSnapshot = await managerRef.get();
      const previous = previousSnapshot.exists
        ? previousSnapshot.data() as CenterManager
        : null;

      const duplicates = await db.collection('managers').where('email', '==', email).limit(2).get();
      if (duplicates.docs.some(doc => doc.id !== managerId)) {
        throw new CrmAccessError('Cette adresse e-mail est déjà liée à un autre manager.', 409);
      }

      const identity = await findOrCreateAuthUser(email, name);
      const authUid = identity.user.uid;
      await ensureIdentityIsNotSuperAdmin(authUid);
      const previousUid = await resolvePreviousUid(previous);
      if (previousUid && previousUid !== authUid) {
        await disableCrmIdentity(previousUid);
      }
      if (!active) {
        await disableCrmIdentity(authUid);
      }

      const manager: CenterManager = {
        id: managerId,
        name,
        email,
        centerId,
        active,
        authUid,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      };
      const batch = db.batch();
      batch.set(managerRef, manager);
      batch.set(db.collection('users').doc(authUid), {
        uid: authUid,
        email,
        role: 'center_manager',
        centerId,
        name,
        displayName: name,
        active,
        managerId,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      }, { merge: true });
      if (previousUid && previousUid !== authUid) {
        batch.set(db.collection('users').doc(previousUid), {
          active: false,
          replacedByUid: authUid,
          updatedAt: now,
        }, { merge: true });
      }
      batch.set(db.collection('audit_logs').doc(), {
        timestamp: now,
        userId: actor.uid,
        userName: actor.name,
        role: actor.role,
        action: previous ? 'UPDATE_MANAGER_ACCESS' : 'CREATE_MANAGER_ACCESS',
        details: `${previous ? 'Mise à jour' : 'Création'} de l’accès manager ${name} (${email}) pour le centre ${centerId}.`,
        targetId: managerId,
        targetType: 'manager',
        centerId,
        centerName: String(centerSnapshot.data()?.name || centerId),
      });
      await batch.commit();

      if (active) {
        try {
          await enableManagerIdentity(authUid, name, centerId);
        } catch (error) {
          const failedAt = new Date().toISOString();
          await db.collection('users').doc(authUid).set({ active: false, updatedAt: failedAt }, { merge: true });
          await managerRef.set({ active: false, updatedAt: failedAt }, { merge: true });
          throw error;
        }
      }

      return NextResponse.json({ ok: true, manager }, { status: previous ? 200 : 201 });
    }

    if (payload.action !== 'set_active' && payload.action !== 'archive') {
      throw new CrmAccessError('Action manager inconnue.', 400);
    }

    const managerId = requiredText(payload.managerId, 'Identifiant manager', 120);
    const managerRef = db.collection('managers').doc(managerId);
    const managerSnapshot = await managerRef.get();
    if (!managerSnapshot.exists) {
      throw new CrmAccessError('Manager introuvable.', 404);
    }
    const manager = managerSnapshot.data() as CenterManager;
    let authUid = manager.authUid;
    if (!authUid) {
      try {
        authUid = (await auth.getUserByEmail(manager.email)).uid;
      } catch {
        throw new CrmAccessError('Compte Firebase Auth du manager introuvable.', 409);
      }
    }
    await ensureIdentityIsNotSuperAdmin(authUid);

    if (payload.action === 'set_active') {
      const active = payload.active === true;
      if (!active) {
        await disableCrmIdentity(authUid);
      }

      const batch = db.batch();
      batch.set(managerRef, { active, authUid, updatedAt: now }, { merge: true });
      batch.set(db.collection('users').doc(authUid), {
        active,
        centerId: manager.centerId,
        managerId,
        updatedAt: now,
      }, { merge: true });
      batch.set(db.collection('audit_logs').doc(), {
        timestamp: now,
        userId: actor.uid,
        userName: actor.name,
        role: actor.role,
        action: active ? 'ACTIVATE_MANAGER_ACCESS' : 'DEACTIVATE_MANAGER_ACCESS',
        details: `${active ? 'Réactivation' : 'Désactivation'} de l’accès manager ${manager.name} (${manager.email}).`,
        targetId: managerId,
        targetType: 'manager',
        centerId: manager.centerId,
        centerName: null,
      });
      await batch.commit();

      if (active) {
        try {
          await enableManagerIdentity(authUid, manager.name, manager.centerId);
        } catch (error) {
          const failedAt = new Date().toISOString();
          await db.collection('users').doc(authUid).set({ active: false, updatedAt: failedAt }, { merge: true });
          await managerRef.set({ active: false, updatedAt: failedAt }, { merge: true });
          throw error;
        }
      }

      return NextResponse.json({
        ok: true,
        manager: { ...manager, active, authUid, updatedAt: now },
      });
    }

    await disableCrmIdentity(authUid);
    const batch = db.batch();
    batch.delete(managerRef);
    batch.set(db.collection('users').doc(authUid), {
      active: false,
      archivedAt: now,
      updatedAt: now,
    }, { merge: true });
    batch.set(db.collection('audit_logs').doc(), {
      timestamp: now,
      userId: actor.uid,
      userName: actor.name,
      role: actor.role,
      action: 'ARCHIVE_MANAGER_ACCESS',
      details: `Archivage et révocation de l’accès manager ${manager.name} (${manager.email}).`,
      targetId: managerId,
      targetType: 'manager',
      centerId: manager.centerId,
      centerName: null,
    });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[crm-managers] mutation failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
