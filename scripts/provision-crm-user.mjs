import process from "node:process";

function parseArgs(argv) {
  const args = {
    execute: false,
    active: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") args.execute = true;
    else if (arg === "--email") args.email = argv[++index];
    else if (arg.startsWith("--email=")) args.email = arg.split("=")[1];
    else if (arg === "--role") args.role = argv[++index];
    else if (arg.startsWith("--role=")) args.role = arg.split("=")[1];
    else if (arg === "--center-id") args.centerId = argv[++index];
    else if (arg.startsWith("--center-id=")) args.centerId = arg.split("=")[1];
    else if (arg === "--name") args.name = argv[++index];
    else if (arg.startsWith("--name=")) args.name = arg.split("=")[1];
    else if (arg === "--inactive") args.active = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run provision:crm-user -- --email user@example.com --role super_admin --name "Nom" --execute
  npm run provision:crm-user -- --email manager@example.com --role center_manager --center-id center-1 --execute
  npm run provision:crm-user -- --email manager@example.com --execute

Options:
  --email VALUE       E-mail du compte Firebase Auth a rattacher. Obligatoire.
  --role VALUE        super_admin ou center_manager. Optionnel si l'e-mail existe dans managers.
  --center-id VALUE   Centre du manager. Obligatoire pour center_manager sauf inference managers.
  --name VALUE        Nom affiche dans le CRM. Optionnel.
  --inactive          Cree/met a jour le profil en active=false.
  --execute           Ecrit dans Firestore. Sans cette option: dry-run.
`);
}

async function loadAdmin(projectId) {
  const adminApp = await import("firebase-admin/app");
  const adminAuth = await import("firebase-admin/auth");
  const adminFirestore = await import("firebase-admin/firestore");

  if (adminApp.getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      adminApp.initializeApp({
        credential: adminApp.cert(JSON.parse(serviceAccountJson)),
        projectId,
      });
    } else {
      adminApp.initializeApp({
        credential: adminApp.applicationDefault(),
        projectId,
      });
    }
  }

  return {
    auth: adminAuth.getAuth(),
    db: adminFirestore.getFirestore(),
    FieldValue: adminFirestore.FieldValue,
  };
}

async function findManagerByEmail(db, email) {
  const snapshot = await db.collection("managers").where("email", "==", email).limit(1).get();
  if (!snapshot.empty) return snapshot.docs[0].data();

  const lowerSnapshot = await db.collection("managers").get();
  const match = lowerSnapshot.docs
    .map((doc) => doc.data())
    .find((manager) => String(manager.email || "").toLowerCase().trim() === email);
  return match || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const email = String(args.email || "").toLowerCase().trim();
  if (!email) throw new Error("--email est obligatoire");

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "aq8algerie-4f675";
  const { auth, db, FieldValue } = await loadAdmin(projectId);

  const authUser = await auth.getUserByEmail(email);
  const manager = await findManagerByEmail(db, email);

  const role = args.role || (manager ? "center_manager" : null);
  if (role !== "super_admin" && role !== "center_manager") {
    throw new Error("--role doit valoir super_admin ou center_manager quand l'e-mail n'est pas trouve dans managers");
  }

  const centerId = role === "center_manager" ? (args.centerId || manager?.centerId || null) : null;
  if (role === "center_manager" && !centerId) {
    throw new Error("--center-id est obligatoire pour un center_manager quand il n'est pas inferable depuis managers");
  }

  const displayName = args.name || manager?.name || authUser.displayName || authUser.email || "Utilisateur CRM";
  const profile = {
    uid: authUser.uid,
    email,
    role,
    centerId,
    name: displayName,
    displayName,
    active: args.active,
    updatedAt: new Date().toISOString(),
  };

  const existingSnapshot = await db.collection("users").doc(authUser.uid).get();
  const existing = existingSnapshot.exists ? existingSnapshot.data() : null;

  console.log(JSON.stringify({
    mode: args.execute ? "execute" : "dry-run",
    projectId,
    authUser: {
      uid: authUser.uid,
      email: authUser.email,
      disabled: authUser.disabled,
    },
    inferredFromManager: Boolean(manager),
    existingProfile: existing,
    profileToWrite: profile,
  }, null, 2));

  if (!args.execute) {
    console.log("Dry-run OK. Ajoute --execute pour ecrire le profil CRM.");
    return;
  }

  await db.collection("users").doc(authUser.uid).set({
    ...profile,
    createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Profil CRM ecrit: users/${authUser.uid}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
