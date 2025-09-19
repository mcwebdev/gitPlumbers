export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    bio: string;
    avatar?: string;
    expertise: string[];
  };
  publishedAt: Date;
  updatedAt: Date;
  tags: string[];
  category: BlogCategory;
  seoMetadata: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
    canonicalUrl?: string;
  };
  readTimeMinutes: number;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  likes: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  client: {
    name: string;
    industry: string;
    size: 'startup' | 'scaleup' | 'enterprise';
  };
  challenge: string;
  solution: string;
  results: {
    metric: string;
    value: string;
    description: string;
  }[];
  technologies: string[];
  timeline: string;
  testimonial?: {
    quote: string;
    author: string;
    title: string;
    company: string;
  };
  seoMetadata: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  publishedAt: Date;
  featured: boolean;
}

export interface TechnicalGuide {
  id: string;
  title: string;
  slug: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  framework: string;
  content: string;
  codeExamples: {
    language: string;
    code: string;
    description: string;
  }[];
  prerequisites: string[];
  estimatedTime: number;
  seoMetadata: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  publishedAt: Date;
  updatedAt: Date;
  author: string;
}
