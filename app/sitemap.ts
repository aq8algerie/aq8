import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { Center } from "../src/types";

export default async function sitemap() {
  const baseUrl = "https://www.aq8algerie-dz.com";

  // Static routes
  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/a-propos`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/aq8`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/wonder`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/centres`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  // Dynamic Center routes based on live Firestore data
  let dynamicCenterRoutes: any[] = [];
  try {
    const centersSnapshot = await getDocs(collection(db, "centers"));
    const centers: Center[] = [];
    centersSnapshot.forEach((doc) => {
      centers.push(doc.data() as Center);
    });

    // Only generate routes for active/published centers
    const activeCenters = centers.filter(c => c.status !== "suspended");

    dynamicCenterRoutes = activeCenters.map((center) => ({
      url: `${baseUrl}/centres/${center.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("Failed to generate dynamic sitemap routes:", error);
  }

  return [...staticRoutes, ...dynamicCenterRoutes];
}
