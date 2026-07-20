import fs from "node:fs";
import process from "node:process";

const DEFAULT_HOURS = 48;

const DEFAULT_CAPACITY = { aq8: 1, wonder: 1 };
const CENTER_CAPACITIES = {
  "center-1": { aq8: 3, wonder: 1 },
  "center-2": { aq8: 2, wonder: 1 },
  "center-3": { aq8: 1, wonder: 1 },
  "center-4": { aq8: 2, wonder: 1 },
  "center-5": { aq8: 3, wonder: 1 },
};

function parseArgs(argv) {
  const args = {
    execute: false,
    projectId: undefined,
    hours: DEFAULT_HOURS,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--project=")) args.projectId = arg.split("=")[1];
    else if (arg === "--project") args.projectId = argv[++index];
    else if (arg.startsWith("--hours=")) args.hours = Number(arg.split("=")[1]);
    else if (arg === "--hours") args.hours = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!Number.isFinite(args.hours) || args.hours < 0) {
    throw new Error("--hours doit etre un nombre positif");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run expire:booking-requests
  npm run expire:booking-requests:execute
  npm run expire:booking-requests -- --hours 24

Options:
  --execute          Applique les modifications dans Firestore (met a jour les demandes et libere les verrous).
                     Sans cette option: dry-run (simulation/audit uniquement).
  --hours N          Seuil d'expiration en heures. Defaut: ${DEFAULT_HOURS} heures.
  --project ID       Projet Firebase. Defaut: FIREBASE_PROJECT_ID, GCLOUD_PROJECT, puis .firebaserc.
`);
}

function readFirebaseRcProject() {
  try {
    const raw = fs.readFileSync(".firebaserc", "utf8");
    const parsed = JSON.parse(raw);
    return parsed.projects?.default;
  } catch {
    return undefined;
  }
}

function resolveProjectId(args) {
  return args.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || readFirebaseRcProject();
}

async function loadAdmin(projectId) {
  if (!projectId) {
    throw new Error("Projet Firebase introuvable. Utiliser --project, FIREBASE_PROJECT_ID, GCLOUD_PROJECT ou .firebaserc.");
  }

  const adminApp = await import("firebase-admin/app");
  const adminFirestore = await import("firebase-admin/firestore");

  if (adminApp.getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      adminApp.initializeApp({ credential: adminApp.cert(JSON.parse(serviceAccountJson)), projectId });
    } else {
      adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId });
    }
  }

  return adminFirestore.getFirestore();
}

function getCenterBookingCapacity(centerId, centerDocData) {
  const defaults = CENTER_CAPACITIES[centerId] || DEFAULT_CAPACITY;
  const configured = centerDocData?.bookingCapacity;
  return {
    aq8: (configured && typeof configured.aq8 === 'number') ? configured.aq8 : defaults.aq8,
    wonder: (configured && typeof configured.wonder === 'number') ? configured.wonder : defaults.wonder,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveProjectId(args);
  const db = await loadAdmin(projectId);

  console.log(`Initialisation de l'expiration des demandes de reservation...`);
  console.log(`Projet Firebase : ${projectId}`);
  console.log(`Seuil d'expiration : ${args.hours} heures`);
  console.log(`Mode : ${args.execute ? "EXECUTION (les donnees seront modifiees)" : "SIMULATION (dry-run)"}`);

  const thresholdMs = args.hours * 60 * 60 * 1000;
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - thresholdMs);

  console.log(`Recherche des demandes au statut 'pending' creees avant le : ${thresholdDate.toISOString()}`);

  const snapshot = await db.collection("booking_requests").where("status", "==", "pending").get();
  const allPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const expiredRequests = allPending.filter(req => {
    const createdAt = new Date(req.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt < thresholdDate;
  });

  console.log(`Demandes en attente trouvees au total : ${allPending.length}`);
  console.log(`Demandes expirees identifiees (> ${args.hours}h) : ${expiredRequests.length}`);

  if (expiredRequests.length === 0) {
    console.log("Aucune demande de reservation a expirer.");
    return;
  }

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const req of expiredRequests) {
    try {
      const requestId = req.id;
      const centerId = req.centerId;
      const dateTime = `${req.bookingDate}T${req.bookingTime}`;
      const slotId = encodeURIComponent(dateTime);
      
      console.log(`\nTraitement de la demande [${requestId}] : ${req.firstName} ${req.lastName} - Centre: ${req.centerName || centerId} - Date: ${dateTime} (Creee le: ${req.createdAt})`);

      await db.runTransaction(async (transaction) => {
        const requestRef = db.collection("booking_requests").doc(requestId);
        const requestSnapshot = await transaction.get(requestRef);
        
        if (!requestSnapshot.exists) {
          throw new Error("La demande n'existe plus.");
        }
        
        const requestData = requestSnapshot.data();
        if (requestData.status !== "pending") {
          console.log(`-> Sautee : Le statut est deja '${requestData.status}'`);
          skippedCount++;
          return;
        }

        const centerRef = db.collection("centers").doc(centerId);
        const centerSnapshot = await transaction.get(centerRef);
        const centerConfig = centerSnapshot.exists ? centerSnapshot.data() : null;
        const capacities = getCenterBookingCapacity(centerId, centerConfig);

        const slotRef = db.collection("appointment_slots").doc(centerId).collection("slots").doc(slotId);
        const slotSnapshot = await transaction.get(slotRef);
        
        let nextSlot = null;
        let holdFound = false;

        if (slotSnapshot.exists) {
          const slotData = slotSnapshot.data();
          const appointments = { ...(slotData.appointments || {}) };
          
          for (const [entryId, entry] of Object.entries(appointments)) {
            if (entry.requestId === requestId || entryId === `request-${requestId}`) {
              delete appointments[entryId];
              holdFound = true;
            }
          }

          if (holdFound) {
            const counts = { aq8: 0, wonder: 0 };
            for (const entry of Object.values(appointments)) {
              if (entry.serviceType === "aq8" || entry.serviceType === "wonder") {
                counts[entry.serviceType] += 1;
              }
            }

            nextSlot = {
              ...slotData,
              capacities,
              counts,
              appointments,
              updatedAt: new Date().toISOString()
            };
          }
        }

        if (args.execute) {
          transaction.update(requestRef, {
            status: "rejected",
            statusReason: "expired_48h",
            expiredAt: new Date().toISOString()
          });

          if (nextSlot) {
            const publicSlotRef = db.collection("public_booking_slots").doc(centerId).collection("slots").doc(slotId);
            const totalApts = Object.keys(nextSlot.appointments).length;

            if (totalApts === 0) {
              transaction.delete(slotRef);
              transaction.delete(publicSlotRef);
              console.log("-> Verrou de creneau vide supprime.");
            } else {
              transaction.set(slotRef, nextSlot);
              
              const [date, time] = nextSlot.dateTime.split("T");
              const publicSlot = {
                id: nextSlot.id,
                centerId: nextSlot.centerId,
                dateTime: nextSlot.dateTime,
                date: date || "",
                time: time || "",
                capacities: nextSlot.capacities,
                counts: nextSlot.counts,
                remaining: {
                  aq8: Math.max(nextSlot.capacities.aq8 - nextSlot.counts.aq8, 0),
                  wonder: Math.max(nextSlot.capacities.wonder - nextSlot.counts.wonder, 0),
                },
                updatedAt: nextSlot.updatedAt,
              };
              transaction.set(publicSlotRef, publicSlot);
              console.log("-> Verrou de creneau mis a jour (hold libere).");
            }
          } else {
            console.log("-> Aucun verrou de creneau trouve en base pour cette demande (deja supprime ou absent).");
          }
        } else {
          console.log(`-> [SIMULATION] Serait expiree. Verrou de creneau associe trouve : ${holdFound ? "oui" : "non"}`);
        }
        
        successCount++;
      });
    } catch (error) {
      console.error(`-> Erreur lors du traitement de la demande :`, error.message);
      errorCount++;
    }
  }

  console.log(`\n--- Bilan ---`);
  console.log(`Succes : ${successCount}`);
  console.log(`Sautees : ${skippedCount}`);
  console.log(`Erreurs : ${errorCount}`);
  console.log(`Mode : ${args.execute ? "EXECUTION COMPLETEE" : "SIMULATION (aucun changement reel en base)"}`);
}

main().catch(error => {
  console.error("Erreur fatale lors de l'execution du script :", error);
  process.exit(1);
});
