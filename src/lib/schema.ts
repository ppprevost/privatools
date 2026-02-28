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
    "publisher": {
      "@type": "Organization",
      "name": "PrivaTools",
      "url": "https://privatools.com",
    },
  };
}
