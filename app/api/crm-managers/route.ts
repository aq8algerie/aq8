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
    try {
      const user = await auth.createUser({
        email,
        displayName: name,
        disabled: true,
      });
      return { user, created: true };
    } catch (createErr) {
      console.warn('[crm-managers] createUser error:', createErr);
      throw createErr;
    }
  }
}

async function disableCrmIdentity(uid: string): Promise<void> {
  try {
    const auth = getAdminAuthInstance();
    const user = await auth.getUser(uid);
    const claims = { ...(user.customClaims || {}) };
    delete claims.crmRole;
    delete claims.crmCenterId;
    await auth.updateUser(uid, { disabled: true });
    await auth.setCustomUserClaims(uid, claims);
    await auth.revokeRefreshTokens(uid);
  } catch (err) {
    console.warn('[crm-managers] disableCrmIdentity warning:', err);
  }
}

async function enableManagerIdentity(uid: string, name: string, centerId: string): Promise<void> {
  try {
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
  } catch (err) {
    console.warn('[crm-managers] enableManagerIdentity warning:', err);
  }
}

async function ensureIdentityIsNotSuperAdmin(uid: string): Promise<void> {
  try {
    const profile = await getAdminDb().collection('users').doc(uid).get();
    if (profile.exists && profile.data()?.role === 'super_admin') {
      throw new CrmAccessError('Ce compte appartient au super administrateur et ne peut pas devenir manager.', 409);
    }
  } catch (err) {
    if (err instanceof CrmAccessError) throw err;
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
    const now = new Date().toISOString();

    if (payload.action === 'upsert') {
      const name = requiredText(payload.name, 'Nom du manager');
      const email = normalizedEmail(payload.email);
      const centerId = requiredText(payload.centerId, 'Centre', 80);
      const active = payload.active === true;

      // Robust center existence check
      let centerSnapshot = await db.collection('centers').doc(centerId).get();
      let centerName = centerId;

      if (centerSnapshot.exists) {
        centerName = String(centerSnapshot.data()?.name || centerId);
      } else {
        // Fallback: check centers collection
        const allCentersSnap = await db.collection('centers').limit(100).get();
        const matched = allCentersSnap.docs.find(d => d.id === centerId || String(d.data()?.id) === centerId);
        if (matched) {
          centerSnapshot = matched;
          centerName = String(matched.data()?.name || centerId);
        } else {
          // If center doc is freshly created locally, create placeholder record in Firestore
          centerName = centerId;
        }
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

      let authUid = managerId;
      try {
        const identity = await findOrCreateAuthUser(email, name);
        authUid = identity.user.uid;
        await ensureIdentityIsNotSuperAdmin(authUid);
        const previousUid = await resolvePreviousUid(previous);
        if (previousUid && previousUid !== authUid) {
          await disableCrmIdentity(previousUid);
        }
        if (!active) {
          await disableCrmIdentity(authUid);
        }
      } catch (authErr) {
        console.warn('[crm-managers] Admin Auth sync warning, continuing Firestore update:', authErr);
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
        centerName,
      });

      await batch.commit();

      if (active) {
        await enableManagerIdentity(authUid, name, centerId);
      }

      return NextResponse.json({ ok: true, manager });
    }

    if (payload.action === 'set_active') {
      const managerId = requiredText(payload.managerId, 'Identifiant manager', 120);
      const active = payload.active === true;
      const managerRef = db.collection('managers').doc(managerId);
      const snapshot = await managerRef.get();
      if (!snapshot.exists) {
        throw new CrmAccessError('Manager introuvable.', 404);
      }

      const manager = snapshot.data() as CenterManager;
      const authUid = await resolvePreviousUid(manager);

      if (authUid) {
        await ensureIdentityIsNotSuperAdmin(authUid);
        if (active) {
          await enableManagerIdentity(authUid, manager.name, manager.centerId);
        } else {
          await disableCrmIdentity(authUid);
        }
      }

      const batch = db.batch();
      batch.set(managerRef, { active, updatedAt: now }, { merge: true });
      if (authUid) {
        batch.set(db.collection('users').doc(authUid), { active, updatedAt: now }, { merge: true });
      }
      batch.set(db.collection('audit_logs').doc(), {
        timestamp: now,
        userId: actor.uid,
        userName: actor.name,
        role: actor.role,
        action: active ? 'ACTIVATE_MANAGER_ACCESS' : 'DEACTIVATE_MANAGER_ACCESS',
        details: `${active ? 'Activation' : 'Désactivation'} de l’accès manager ${manager.name} (${manager.email}).`,
        targetId: managerId,
        targetType: 'manager',
        centerId: manager.centerId,
        centerName: null,
      });
      await batch.commit();

      return NextResponse.json({
        ok: true,
        manager: { ...manager, active, updatedAt: now },
      });
    }

    if (payload.action === 'archive') {
      const managerId = requiredText(payload.managerId, 'Identifiant manager', 120);
      const managerRef = db.collection('managers').doc(managerId);
      const snapshot = await managerRef.get();
      if (!snapshot.exists) {
        return NextResponse.json({ ok: true });
      }

      const manager = snapshot.data() as CenterManager;
      const authUid = await resolvePreviousUid(manager);

      if (authUid) {
        await disableCrmIdentity(authUid);
      }

      const batch = db.batch();
      batch.delete(managerRef);
      if (authUid) {
        batch.set(db.collection('users').doc(authUid), {
          active: false,
          archivedAt: now,
          updatedAt: now,
        }, { merge: true });
      }
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
    }

    throw new CrmAccessError('Action non prise en charge.', 400);
  } catch (error) {
    console.error('[crm-managers] mutation failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
