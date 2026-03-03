const ORGANIZATION = {
  "@type": "Organization" as const,
  "name": "Priva.TOOLS",
  "url": "https://priva.tools",
  "logo": "https://priva.tools/favicon.svg",
};

interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Priva.TOOLS",
    "url": "https://priva.tools",
    "logo": "https://priva.tools/favicon.svg",
    "description": "Free online PDF and image tools with 100% client-side processing. Your files never leave your browser.",
    "sameAs": [
      "https://www.youtube.com/@privatools",
    ],
  };
}

export function buildWebAppSchema(input: { name: string; url: string; description: string; category: 'pdf' | 'image' }) {
  const categoryLabel: Record<string, string> = {
    pdf: "PDF Tools",
    image: "Image Tools",
  };
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": input.name,
    "url": input.url,
    "description": input.description,
    "applicationCategory": "UtilitiesApplication",
    "applicationSubCategory": categoryLabel[input.category] ?? "Utilities",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "browserRequirements": "Requires JavaScript and WebAssembly support",
    "permissions": "none",
    "isAccessibleForFree": true,
    "publisher": ORGANIZATION,
  };
}

interface VideoSchemaInput {
  title: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  embedUrl: string;
  contentUrl?: string;
}

export function buildVideoSchema(input: VideoSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": input.title,
    "description": input.description,
    "thumbnailUrl": input.thumbnailUrl,
    "uploadDate": input.uploadDate,
    "duration": input.duration,
    "embedUrl": input.embedUrl,
    ...(input.contentUrl && { "contentUrl": input.contentUrl }),
    "publisher": ORGANIZATION,
  };
}

interface ArticleSchemaInput {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
}

export function buildArticleSchema(input: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": input.title,
    "description": input.description,
    "url": input.url,
    "datePublished": input.datePublished,
    "dateModified": input.dateModified ?? input.datePublished,
    "publisher": ORGANIZATION,
  };
}
