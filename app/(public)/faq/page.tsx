import type { Metadata } from "next";
import { getSeoForPage } from "@/lib/seo";
import { FaqInteractiveView } from "@/components/faq/FaqInteractiveView";
import { FAQ_ITEMS } from "@/components/faq/faqData";

export const metadata: Metadata = {
  title: getSeoForPage("faq").title,
  description: getSeoForPage("faq").description,
};

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FaqInteractiveView />
    </>
  );
}
