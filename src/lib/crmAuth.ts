import { Auth, User, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
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

interface ManagerLookupResult {
  manager: CenterManager;
  docId: string;
  isCanonical: boolean;
}

export const SUPER_ADMIN_EMAIL = 'aq8algerie@gmail.com';
export const SUPER_ADMIN_NAME = 'Hanane';

export function normalizeEmail(email: string | null | undefined) {
  return (email || '').trim().toLowerCase();
}

function normalizeManager(manager: CenterManager, email: string): CenterManager {
  return {
    ...manager,
    email,
    id: manager.id || email
  };
}

async function assertCenterExists(centerId: string) {
  const centerSnap = await getDoc(doc(requireFirestore(), 'centers', centerId));

  if (!centerSnap.exists()) {
    throw new CrmAuthError('crm/center-not-found', 'Votre centre de rattachement est inexistant ou desactive.');
  }

  return centerSnap.data() as Center;
}

async function findManagerByEmail(email: string): Promise<ManagerLookupResult | null> {
  const db = requireFirestore();
  const canonicalRef = doc(db, 'managers', email);
  const canonicalSnap = await getDoc(canonicalRef);

  if (canonicalSnap.exists()) {
    return {
      manager: normalizeManager(canonicalSnap.data() as CenterManager, email),
      docId: canonicalSnap.id,
      isCanonical: true
    };
  }

  const legacyQuery = query(collection(db, 'managers'), where('email', '==', email), limit(1));
  const legacySnap = await getDocs(legacyQuery);

  if (legacySnap.empty) {
    return null;
  }

  const legacyDoc = legacySnap.docs[0];
  return {
    manager: normalizeManager(legacyDoc.data() as CenterManager, email),
    docId: legacyDoc.id,
    isCanonical: legacyDoc.id === email
  };
}

async function repairCanonicalManagerDoc(email: string, lookup: ManagerLookupResult) {
  if (lookup.isCanonical) {
    return;
  }

  await setDoc(
    doc(requireFirestore(), 'managers', email),
    {
      ...lookup.manager,
      email,
      legacySourceId: lookup.docId
    },
    { merge: true }
  );
}

async function validateManagerLookup(email: string) {
  const lookup = await findManagerByEmail(email);

  if (!lookup) {
    throw new CrmAuthError('crm/manager-not-found', "Aucun compte gerant actif n'est associe a cet e-mail.");
  }

  const manager = normalizeManager(lookup.manager, email);

  if (!manager.active) {
    throw new CrmAuthError('crm/manager-disabled', 'Votre compte gerant a ete desactive par le super administrateur.');
  }

  if (!manager.centerId) {
    throw new CrmAuthError('crm/manager-center-missing', "Votre compte gerant n'est rattache a aucun centre.");
  }

  await assertCenterExists(manager.centerId);

  return { lookup, manager };
}

export async function resolveCrmSession(user: User): Promise<CrmSession> {
  const email = normalizeEmail(user.email);

  if (!email) {
    throw new CrmAuthError('crm/email-required', "Le compte Firebase n'a pas d'adresse e-mail associee.");
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

  const { lookup, manager } = await validateManagerLookup(email);
  await repairCanonicalManagerDoc(email, lookup);

  return {
    uid: user.uid,
    email,
    role: 'center_manager',
    centerId: manager.centerId,
    managerName: manager.name || email
  };
}

export async function provisionCrmUserAccount(auth: Auth, email: string, password: string): Promise<CrmSession> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new CrmAuthError('crm/email-required', "Le compte Firebase n'a pas d'adresse e-mail associee.");
  }

  if (normalizedEmail !== SUPER_ADMIN_EMAIL) {
    await validateManagerLookup(normalizedEmail);
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    return resolveCrmSession(credential.user);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';

    if (code === 'auth/email-already-in-use') {
      throw new CrmAuthError('crm/account-exists', 'Adresse e-mail ou mot de passe incorrect.');
    }

    throw error;
  }
}

export function getCrmAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'crm/account-exists':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez patienter avant de reessayer.';
    case 'auth/network-request-failed':
      return 'Connexion reseau impossible. Verifiez votre connexion puis reessayez.';
    case 'crm/manager-not-found':
      return "Aucun compte gerant actif n'est associe a cet e-mail.";
    case 'crm/manager-disabled':
      return 'Votre compte gerant a ete desactive par le super administrateur.';
    case 'crm/center-not-found':
    case 'crm/manager-center-missing':
      return 'Votre centre de rattachement est inexistant ou desactive.';
    case 'crm/email-required':
      return "Le compte Firebase n'a pas d'adresse e-mail associee.";
    default:
      if (error instanceof Error && error.message.includes('Firebase Auth is not configured')) {
        return "Firebase Auth n'est pas configure. Verifiez la configuration AQ8 embarquee ou surchargez-la avec VITE_FIREBASE_* au build.";
      }

      if (error instanceof Error && error.message.includes('Firebase Firestore is not configured')) {
        return "Firestore n'est pas configure. Verifiez la configuration AQ8 embarquee ou surchargez-la avec VITE_FIREBASE_* au build.";
      }

      return 'Erreur lors de la connexion. Veuillez verifier vos identifiants.';
  }
}