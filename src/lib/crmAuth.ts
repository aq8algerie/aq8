import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Center, CenterManager } from '../types';
import { requireFirestore } from './firebase';

export type CrmRole = 'super_admin' | 'center_manager';

export interface CrmSession {
  uid: string;
  email: string;
  role: CrmRole;
  centerId: string | null;
  managerName: string;
}

export class CrmAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CrmAuthError';
    this.code = code;
  }
}

const SUPER_ADMIN_EMAIL = 'karim@aq8algerie.com';
const SUPER_ADMIN_NAME = 'Karim Benchikh';

export function normalizeEmail(email: string | null | undefined) {
  return (email || '').trim().toLowerCase();
}

async function assertCenterExists(centerId: string) {
  const centerSnap = await getDoc(doc(requireFirestore(), 'centers', centerId));

  if (!centerSnap.exists()) {
    throw new CrmAuthError('crm/center-not-found', 'Votre centre de rattachement est inexistant ou désactivé.');
  }

  return centerSnap.data() as Center;
}

export async function resolveCrmSession(user: User): Promise<CrmSession> {
  const email = normalizeEmail(user.email);

  if (!email) {
    throw new CrmAuthError('crm/email-required', "Le compte Firebase n'a pas d'adresse e-mail associée.");
  }

  if (email === SUPER_ADMIN_EMAIL) {
    return {
      uid: user.uid,
      email,
      role: 'super_admin',
      centerId: null,
      managerName: SUPER_ADMIN_NAME
    };
  }

  const managerSnap = await getDoc(doc(requireFirestore(), 'managers', email));

  if (!managerSnap.exists()) {
    throw new CrmAuthError('crm/manager-not-found', "Aucun compte gérant actif n'est associé à cet e-mail.");
  }

  const manager = managerSnap.data() as CenterManager;

  if (!manager.active) {
    throw new CrmAuthError('crm/manager-disabled', 'Votre compte gérant a été désactivé par le super administrateur.');
  }

  if (!manager.centerId) {
    throw new CrmAuthError('crm/manager-center-missing', "Votre compte gérant n'est rattaché à aucun centre.");
  }

  await assertCenterExists(manager.centerId);

  return {
    uid: user.uid,
    email,
    role: 'center_manager',
    centerId: manager.centerId,
    managerName: manager.name || email
  };
}

export function getCrmAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    case 'auth/network-request-failed':
      return 'Connexion réseau impossible. Vérifiez votre connexion puis réessayez.';
    case 'crm/manager-not-found':
      return "Aucun compte gérant actif n'est associé à cet e-mail.";
    case 'crm/manager-disabled':
      return 'Votre compte gérant a été désactivé par le super administrateur.';
    case 'crm/center-not-found':
    case 'crm/manager-center-missing':
      return 'Votre centre de rattachement est inexistant ou désactivé.';
    case 'crm/email-required':
      return "Le compte Firebase n'a pas d'adresse e-mail associée.";
    default:
      if (error instanceof Error && error.message.includes('Firebase Auth is not configured')) {
        return "Firebase Auth n'est pas configuré. Ajoutez les variables VITE_FIREBASE_* dans .env.local.";
      }

      if (error instanceof Error && error.message.includes('Firebase Firestore is not configured')) {
        return "Firestore n'est pas configuré. Ajoutez les variables VITE_FIREBASE_* dans .env.local.";
      }

      return 'Erreur lors de la connexion. Veuillez vérifier vos identifiants.';
  }
}