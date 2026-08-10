export default function manifest() {
  return {
    name: "AQ8 Algérie CRM",
    short_name: "AQ8 CRM",
    description: "Portail CRM d'électrostimulation active AQ8 et Wonder en Algérie",
    start_url: "/crm",
    display: "standalone",
    background_color: "#111115",
    theme_color: "#0284c7",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
