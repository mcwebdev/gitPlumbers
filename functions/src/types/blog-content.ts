export interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  deck?: string;
  content: string;
  categorySlug: string;
  keywords: string[];
  published: boolean;
  publishedOn?: string;
  createdAt?: string;
  updatedAt?: string;
  featuredImage?: string;
  author?: string;
  readingTime?: number;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  internalLinks?: Array<{
    text: string;
    url: string;
  }>;
  cta?: {
    text: string;
    url: string;
  };
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  color?: string;
}
