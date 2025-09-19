import { Injectable } from '@angular/core';
import {
  BLOG_CATEGORIES,
  BLOG_POSTS,
  CASE_STUDIES,
  GUIDES,
  FEATURED_POST_SLUGS,
  BlogCategory,
  BlogPost,
  CaseStudy,
  GuideSummary,
  getBlogPostBySlug,
  getCaseStudyBySlug,
  getCategoryBySlug,
  getGuideBySlug,
  getPostsByCategory,
} from './blog-content';

@Injectable({ providedIn: 'root' })
export class BlogContentService {
  get categories(): ReadonlyArray<BlogCategory> {
    return BLOG_CATEGORIES;
  }

  get featuredPosts(): ReadonlyArray<BlogPost> {
    return FEATURED_POST_SLUGS.map((slug) => getBlogPostBySlug(slug)).filter(
      (post): post is BlogPost => Boolean(post)
    );
  }

  get recentPosts(): ReadonlyArray<BlogPost> {
    return [...BLOG_POSTS].sort((a, b) => (a.publishedOn < b.publishedOn ? 1 : -1)).slice(0, 5);
  }

  getCategoryBySlug(slug: string): BlogCategory | undefined {
    return getCategoryBySlug(slug);
  }

  getPostsByCategory(slug: string): ReadonlyArray<BlogPost> {
    return getPostsByCategory(slug);
  }

  getPostBySlug(slug: string): BlogPost | undefined {
    return getBlogPostBySlug(slug);
  }

  getCaseStudies(): ReadonlyArray<CaseStudy> {
    return Object.values(CASE_STUDIES);
  }

  getCaseStudy(slug: string): CaseStudy | undefined {
    return getCaseStudyBySlug(slug);
  }

  getGuides(): ReadonlyArray<GuideSummary> {
    return Object.values(GUIDES);
  }

  getGuide(slug: string): GuideSummary | undefined {
    return getGuideBySlug(slug);
  }

  getRelatedPosts(currentSlug: string, categorySlug: string): ReadonlyArray<BlogPost> {
    const related = BLOG_POSTS.filter(
      (post) => post.slug !== currentSlug && post.categorySlug === categorySlug
    );

    return related.length > 0 ? related : BLOG_POSTS.filter((post) => post.slug !== currentSlug).slice(0, 2);
  }
}
