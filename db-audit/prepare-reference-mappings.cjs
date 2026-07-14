const fs = require("fs");
const path = require("path");

const reservationsPath = process.argv[2] || path.join(process.cwd(), "db-audit", "out", "reservation-import", "reservations-import.review.csv");
const clientsPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "client-import", "clients-import.review.csv");
const outDir = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "reference-mapping");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((line) => line.length > 1 || line[0] !== "");
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function crmServiceFor(title, type) {
  const text = `${title} ${type}`.toLowerCase();
  if (text.includes("wonder")) return "srv-3";
  if (text.includes("face")) return "srv-3";
  if (text.includes("combin") || text.includes("mix")) return "srv-4";
  if (text.includes("aq8")) return "srv-1";
  return "";
}

function serviceConfidence(title, type) {
  const text = `${title} ${type}`.toLowerCase();
  if (text.includes("wonder face")) return "medium";
  if (text.includes("wonder") || text.includes("aq8")) return "high";
  return "low";
}

function centerForSite(site) {
  const text = String(site || "").toLowerCase();
  if (text.includes("ouled")) return "center-2";
  if (text.includes("blida")) return "center-3";
  if (text.includes("tlemcen")) return "center-4";
  if (text.includes("sidi")) return "center-5";
  if (text.includes("birkhadem") || text.includes("bir khadem")) return "center-1";
  return "";
}

function managerForCenter(centerId) {
  return {
    "center-1": "mgr-1",
    "center-2": "mgr-2",
    "center-3": "mgr-3",
    "center-4": "mgr-4",
    "center-5": "mgr-5",
  }[centerId] || "";
}

function main() {
  ensureDir(outDir);
  const reservations = parseCsv(fs.readFileSync(reservationsPath, "utf8"));
  const clients = parseCsv(fs.readFileSync(clientsPath, "utf8"));

  const serviceCounts = new Map();
  const coachCounts = new Map();
  const siteCounts = new Map();
  const centerCounts = new Map();

  for (const row of reservations) {
    increment(serviceCounts, [row.legacyServiceId, row.legacyServiceTitle, row.legacyServiceType, row.serviceId].join("|"));
    increment(coachCounts, [row.legacyCoachId, row.legacyCoachTitle, row.centerId, row.legacyServiceTitle].join("|"));
    increment(centerCounts, row.centerId || "center-unknown");
  }

  for (const row of clients) {
    increment(siteCounts, [row.legacySite, row.centerId].join("|"));
  }

  const services = [...serviceCounts.entries()]
    .map(([key, count]) => {
      const [legacyServiceId, legacyServiceTitle, legacyServiceType, currentCrmServiceId] = key.split("|");
      const suggestedCrmServiceId = crmServiceFor(legacyServiceTitle, legacyServiceType) || currentCrmServiceId;
      return {
        legacyServiceId,
        legacyServiceTitle,
        legacyServiceType,
        currentCrmServiceId,
        suggestedCrmServiceId,
        confidence: serviceConfidence(legacyServiceTitle, legacyServiceType),
        reservationsCount: count,
        decision: suggestedCrmServiceId ? "ready" : "needs-review",
        note: legacyServiceTitle === "Wonder Face" ? "Verifier si Wonder Face doit rester srv-3 ou devenir un service CRM distinct." : "",
      };
    })
    .sort((a, b) => Number(b.reservationsCount) - Number(a.reservationsCount));

  const sites = [...siteCounts.entries()]
    .map(([key, count]) => {
      const [legacySite, currentCenterId] = key.split("|");
      const suggestedCenterId = centerForSite(legacySite) || (currentCenterId !== "center-unknown" ? currentCenterId : "");
      return {
        legacySite,
        currentCenterId,
        suggestedCenterId,
        confidence: legacySite && suggestedCenterId ? "high" : currentCenterId !== "center-unknown" ? "medium" : "low",
        clientsCount: count,
        decision: suggestedCenterId ? "ready" : "needs-review",
      };
    })
    .sort((a, b) => Number(b.clientsCount) - Number(a.clientsCount));

  const coaches = [...coachCounts.entries()]
    .map(([key, count]) => {
      const [legacyCoachId, legacyCoachTitle, centerId, legacyServiceTitle] = key.split("|");
      const suggestedManagerId = managerForCenter(centerId);
      const titleLooksLikeService = /aq8|wonder|accueil/i.test(legacyCoachTitle || "");
      const confidence = legacyCoachTitle && !titleLooksLikeService ? "medium" : centerId !== "center-unknown" ? "low" : "very-low";
      return {
        legacyCoachId,
        legacyCoachTitle,
        centerId,
        legacyServiceTitle,
        suggestedManagerId,
        confidence,
        reservationsCount: count,
        decision: confidence === "medium" ? "candidate" : "needs-review",
        note: titleLooksLikeService ? "Le libelle ressemble a un service ou accueil, pas a un coach nominatif." : "",
      };
    })
    .sort((a, b) => Number(b.reservationsCount) - Number(a.reservationsCount));

  const centers = [...centerCounts.entries()]
    .map(([centerId, count]) => ({
      centerId,
      crmName: {
        "center-1": "BirKhadem - Gym",
        "center-2": "AQ8 Ouled Fayet",
        "center-3": "AQ8 Blida",
        "center-4": "AQ8 Tlemcen",
        "center-5": "AQ8 Sidi Yahia",
        "center-unknown": "A determiner",
      }[centerId] || "",
      reservationsCount: count,
      suggestedManagerId: managerForCenter(centerId),
    }))
    .sort((a, b) => Number(b.reservationsCount) - Number(a.reservationsCount));

  writeCsv(path.join(outDir, "service-mapping.csv"), services, Object.keys(services[0] || {}));
  writeCsv(path.join(outDir, "site-center-mapping.csv"), sites, Object.keys(sites[0] || {}));
  writeCsv(path.join(outDir, "coach-mapping.csv"), coaches, Object.keys(coaches[0] || {}));
  writeCsv(path.join(outDir, "center-summary.csv"), centers, Object.keys(centers[0] || {}));

  const summary = {
    services: services.length,
    sites: sites.length,
    coachRows: coaches.length,
    centers: centers.length,
    serviceDecisions: services.reduce((acc, row) => {
      acc[row.decision] = (acc[row.decision] || 0) + 1;
      return acc;
    }, {}),
    siteDecisions: sites.reduce((acc, row) => {
      acc[row.decision] = (acc[row.decision] || 0) + 1;
      return acc;
    }, {}),
    coachDecisions: coaches.reduce((acc, row) => {
      acc[row.decision] = (acc[row.decision] || 0) + 1;
      return acc;
    }, {}),
  };

  fs.writeFileSync(path.join(outDir, "reference-mapping.summary.json"), JSON.stringify(summary, null, 2), "utf8");

  const report = [
    "# Mapping referentiels legacy -> CRM",
    "",
    `- Services legacy detectes: ${services.length}`,
    `- Sites legacy detectes: ${sites.length}`,
    `- Combinaisons coach/centre/service detectees: ${coaches.length}`,
    "",
    "## Decisions proposees",
    "- Services AQ8 -> srv-1.",
    "- Services Wonder et Wonder Face -> srv-3, avec revue recommandee pour Wonder Face si le CRM doit distinguer le visage.",
    "- Sites BirKhadem, Ouled Fayet, Blida, Tlemcen, Sidi Yahia -> centres CRM existants.",
    "- Coachs legacy: mapping non force. Les IDs existent, mais les libelles sont majoritairement absents ou non nominaux.",
    "",
    "## Fichiers",
    "- db-audit/out/reference-mapping/service-mapping.csv",
    "- db-audit/out/reference-mapping/site-center-mapping.csv",
    "- db-audit/out/reference-mapping/coach-mapping.csv",
    "- db-audit/out/reference-mapping/center-summary.csv",
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "reference-mapping.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main();
