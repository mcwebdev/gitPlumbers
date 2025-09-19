import { Injectable } from '@angular/core';
import {
  BLOG_CATEGORIES,
  CASE_STUDIES,
  GUIDES,
  BlogCategory,
  BlogPost,
  CaseStudy,
  GuideSummary,
  getCaseStudyBySlug,
  getCategoryBySlug,
  getGuideBySlug,
} from './blog-content';

@Injectable({ providedIn: 'root' })
export class BlogContentService {
  get categories(): ReadonlyArray<BlogCategory> {
    return BLOG_CATEGORIES;
  }

  getCategoryBySlug(slug: string): BlogCategory | undefined {
    return getCategoryBySlug(slug);
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
}