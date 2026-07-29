import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import {
  CrmAccessError,
  getCrmErrorResponse,
  type ServerCrmProfile,
  verifyServerCrmAccess,
} from '@/src/lib/serverCrmAccess';
import type { Client, ClientStatus } from '@/src/types';

type ClientMutation =
  | {
      action: 'upsert';
      centerId?: string;
      client?: Partial<Client> & { id?: string };
    }
  | {
      action: 'set_status';
      centerId?: string;
      clientIds?: string[];
      status?: ClientStatus;
    }
  | {
      action: 'archive';
      centerId?: string;
      clientIds?: string[];
    };

function requiredText(value: unknown, label: string, maxLength = 160): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) {
    throw new CrmAccessError(`${label} invalide.`, 400);
  }
  return text;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (value == null || value === '') return undefined;
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maxLength) {
    throw new CrmAccessError('Une information client dépasse la longueur autorisée.', 400);
  }
  return text || undefined;
}

function assertCenterAccess(actor: ServerCrmProfile, centerId: string): void {
  if (actor.role === 'center_manager' && actor.centerId !== centerId) {
    throw new CrmAccessError("Ce client n'appartient pas à votre centre.", 403);
  }
}

function readClientIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new CrmAccessError('Sélection de clients invalide.', 400);
  }
  const ids = Array.from(new Set(value.map(item => requiredText(item, 'Client', 120))));
  if (ids.length === 0 || ids.length > 30) {
    throw new CrmAccessError('Sélectionnez entre 1 et 30 clients par opération.', 400);
  }
  return ids;
}

function normalizedEmail(value: unknown): string {
  const email = optionalText(value, 160)?.toLowerCase() || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CrmAccessError('Adresse e-mail client invalide.', 400);
  }
  return email;
}

function normalizeClientInput(
  input: Partial<Client>,
  centerId: string,
): Partial<Client> {
  const firstName = requiredText(input.firstName, 'Prénom', 80);
  const lastName = requiredText(input.lastName, 'Nom', 80);
  const phone = requiredText(input.phone, 'Téléphone', 40);
  return {
    firstName,
    lastName,
    phone,
    email: normalizedEmail(input.email),
    centerId,
    notes: optionalText(input.notes, 2000),
    gender: input.gender === 'H' || input.gender === 'F' ? input.gender : undefined,
    dob: optionalText(input.dob, 20),
    bloodType: optionalText(input.bloodType, 10),
    profession: optionalText(input.profession, 120),
    emergencyContactName: optionalText(input.emergencyContactName, 160),
    emergencyContactPhone: optionalText(input.emergencyContactPhone, 40),
    medicalConditions: optionalText(input.medicalConditions, 2000),
    sportGoals: Array.isArray(input.sportGoals)
      ? input.sportGoals.slice(0, 20).map(goal => requiredText(goal, 'Objectif', 120))
      : [],
    avatarUrl: optionalText(input.avatarUrl, 500),
  };
}

function auditData(
  actor: ServerCrmProfile,
  input: {
    action: string;
    details: string;
    targetId: string;
    centerId: string;
    timestamp: string;
  },
) {
  return {
    timestamp: input.timestamp,
    userId: actor.uid,
    userName: actor.name,
    role: actor.role,
    action: input.action,
    details: input.details,
    targetId: input.targetId,
    targetType: 'client',
    centerId: input.centerId,
    centerName: null,
  };
}

async function upsertClient(
  actor: ServerCrmProfile,
  payload: Extract<ClientMutation, { action: 'upsert' }>,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  assertCenterAccess(actor, centerId);
  if (!payload.client || typeof payload.client !== 'object') {
    throw new CrmAccessError('Fiche client invalide.', 400);
  }

  const clientId = payload.client.id
    ? requiredText(payload.client.id, 'Identifiant client', 120)
    : `cli-${db.collection('clients').doc().id}`;
  const normalized = normalizeClientInput(payload.client, centerId);

  return db.runTransaction(async transaction => {
    const clientRef = db.collection('clients').doc(clientId);
    const existingSnapshot = await transaction.get(clientRef);
    const existing = existingSnapshot.exists ? existingSnapshot.data() as Client : null;
    if (existing && existing.centerId !== centerId) {
      throw new CrmAccessError("Ce client n'appartient pas à votre centre.", 403);
    }
    if (existing?.status === 'archived') {
      throw new CrmAccessError('Une fiche archivée ne peut pas être modifiée.', 409);
    }

    const now = new Date().toISOString();
    const client: Client = {
      ...(existing || {}),
      ...normalized,
      id: clientId,
      centerId,
      createdAt: existing?.createdAt || now.slice(0, 10),
      status: existing?.status || 'active',
      updatedAt: now,
    } as Client;

    transaction.set(clientRef, client);
    transaction.set(db.collection('audit_logs').doc(), auditData(actor, {
      action: existing ? 'UPDATE_CLIENT' : 'CREATE_CLIENT',
      details: `${existing ? 'Mise à jour' : 'Création'} de la fiche client ${client.firstName} ${client.lastName}.`,
      targetId: clientId,
      centerId,
      timestamp: now,
    }));
    return { ok: true, created: !existing, client };
  });
}

async function mutateClientState(
  actor: ServerCrmProfile,
  payload: Extract<ClientMutation, { action: 'set_status' | 'archive' }>,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  const clientIds = readClientIds(payload.clientIds);
  assertCenterAccess(actor, centerId);
  const targetStatus = payload.action === 'archive'
    ? 'archived'
    : payload.status;
  if (!['active', 'suspended', 'archived'].includes(String(targetStatus))) {
    throw new CrmAccessError('Statut client invalide.', 400);
  }

  return db.runTransaction(async transaction => {
    const clientRefs = clientIds.map(clientId => db.collection('clients').doc(clientId));
    const snapshots = await transaction.getAll(...clientRefs);
    const clients = snapshots.map(snapshot => {
      if (!snapshot.exists) {
        throw new CrmAccessError('Un client sélectionné est introuvable.', 404);
      }
      const client = { ...snapshot.data(), id: snapshot.id } as Client;
      if (client.centerId !== centerId) {
        throw new CrmAccessError("Un client sélectionné n'appartient pas à votre centre.", 403);
      }
      if (client.status === 'archived' && targetStatus !== 'archived') {
        throw new CrmAccessError('Une fiche archivée ne peut pas être réactivée depuis la liste active.', 409);
      }
      return client;
    });

    if (targetStatus === 'archived') {
      for (const client of clients) {
        const bookedSnapshot = await transaction.get(
          db.collection('appointments')
            .where('clientId', '==', client.id)
            .where('status', '==', 'booked')
            .limit(1),
        );
        if (!bookedSnapshot.empty) {
          throw new CrmAccessError(
            `${client.firstName} ${client.lastName} a encore une réservation planifiée.`,
            409,
          );
        }
        const activePackageSnapshot = await transaction.get(
          db.collection('client_packages')
            .where('clientId', '==', client.id)
            .where('status', '==', 'active')
            .limit(5),
        );
        if (activePackageSnapshot.docs.some(doc => Number(doc.data().sessionsRemaining) > 0)) {
          throw new CrmAccessError(
            `${client.firstName} ${client.lastName} possède encore un forfait actif avec des crédits.`,
            409,
          );
        }
      }
    }

    const now = new Date().toISOString();
    clients.forEach((client, index) => {
      const nextStatus = targetStatus as ClientStatus;
      transaction.update(clientRefs[index], {
        status: nextStatus,
        updatedAt: now,
        ...(nextStatus === 'suspended' ? { suspendedAt: now } : {}),
        ...(nextStatus === 'active' ? { reactivatedAt: now } : {}),
        ...(nextStatus === 'archived'
          ? { archivedAt: now, archivedByUserId: actor.uid, archivedByUserName: actor.name }
          : {}),
      });
      transaction.set(db.collection('audit_logs').doc(), auditData(actor, {
        action: nextStatus === 'archived'
          ? 'ARCHIVE_CLIENT'
          : nextStatus === 'suspended'
            ? 'SUSPEND_CLIENT'
            : 'ACTIVATE_CLIENT',
        details: `${nextStatus === 'archived' ? 'Archivage' : nextStatus === 'suspended' ? 'Suspension' : 'Réactivation'} du client ${client.firstName} ${client.lastName}.`,
        targetId: client.id,
        centerId,
        timestamp: now,
      }));
    });

    return { ok: true, count: clients.length, status: targetStatus };
  });
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin', 'center_manager']);
    const payload = await request.json().catch(() => ({})) as ClientMutation;
    let result;
    if (payload.action === 'upsert') {
      result = await upsertClient(actor, payload);
    } else if (payload.action === 'set_status' || payload.action === 'archive') {
      result = await mutateClientState(actor, payload);
    } else {
      throw new CrmAccessError('Opération client inconnue.', 400);
    }
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const response = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: response.message }, { status: response.status });
  }
}
