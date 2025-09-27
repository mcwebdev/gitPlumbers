# GitPlumbers SEO Migration TODO

## Overview

Migrate GitPlumbers from static HTML meta tags to dynamic SSR-based SEO. This will enable blog-specific SEO metadata and better dynamic content management.

## Current State

- ✅ Static meta tags in `src/index.html`
- ✅ Clean, organized formatting with HTML comments
- ✅ Complete meta tag coverage (mobile app, Microsoft, Apple-specific)
- ❌ No dynamic blog-specific SEO
- ❌ No article-specific meta tags
- ❌ No structured data for blog posts

## Target State

- ✅ Dynamic SEO metadata applied during SSR
- ✅ Blog-specific meta tags (article type, author, publish dates)
- ✅ Structured data (JSON-LD) for articles and FAQs
- ✅ Clean, organized formatting
- ✅ Complete meta tag coverage

---

## 1. Create Blog Post Resolver

**File:** `src/app/components/blog/blog-post/blog-post.resolver.ts`

```typescript
import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, ResolveFn } from "@angular/router";
import { BlogSearchService } from "../../../services/blog-search.service";
import { SeoService } from "../../../services/seo.service";
import { BlogPost, getBlogPostBySlug, getPostsByCategory } from "../blog-content";

export interface BlogPostResolverResult {
  slug: string;
  post: BlogPost | null;
  relatedPosts: BlogPost[];
  foundExact: boolean;
}

export const blogPostResolver: ResolveFn<BlogPostResolverResult> = async (route: ActivatedRouteSnapshot) => {
  const slug = route.paramMap.get("slug") ?? "";
  const blogSearch = inject(BlogSearchService);
  const seoService = inject(SeoService);

  // ... resolver logic similar to IntegrityLens ...

  // Apply SEO metadata during route resolution (server-side)
  if (post) {
    const canonicalUrl = `https://gitplumbers.com/blog/${slug}/`;

    if (post.seoMetadata) {
      // Use pre-generated metadata from database
      const seo = post.seoMetadata;
      seoService.updateMetadata({
        title: seo.title,
        description: seo.description,
        ogTitle: seo.ogTitle,
        ogDescription: seo.ogDescription,
        ogImage: seo.ogImage,
        ogUrl: canonicalUrl,
        ogType: "article",
        twitterTitle: seo.twitterTitle,
        twitterDescription: seo.twitterDescription,
        twitterImage: seo.twitterImage,
        articleSection: seo.articleSection,
        articleAuthor: post.author?.name,
        articlePublishedTime: post.publishedOn,
        articleModifiedTime: post.updatedAt ?? post.publishedOn,
        canonical: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });

      // Add structured data
      seoService.addStructuredData(seo.structuredDataArticle, {
        identifier: "blog-article",
      });
      if (seo.structuredDataFAQ) {
        seoService.addStructuredData(seo.structuredDataFAQ, {
          identifier: "blog-faq",
        });
      }
    } else {
      // Fallback for posts without pre-generated SEO
      seoService.updateMetadata({
        title: post.title ? `${post.title} | GitPlumbers Insights` : "Post not found | GitPlumbers",
        description: post.summary ?? "Explore our latest insights on code optimization and modernization.",
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        robotsIndex: foundExact,
        robotsFollow: foundExact,
      });
    }
  }

  return resolved;
};
```

---

## 2. Update Blog Post Component

**File:** `src/app/components/blog/blog-post/blog-post.component.ts`

**Changes needed:**

- Remove SEO metadata application from component constructor
- Use resolver data instead of component-based SEO
- Add cleanup for structured data

```typescript
// Remove this from constructor:
private readonly _seoEffect = effect(() => {
  // ... SEO logic ...
});

// Replace with:
constructor() {
  // SEO metadata is now applied in the resolver during route resolution (server-side)
  // This ensures metadata appears in the initial HTML response
}

ngOnDestroy(): void {
  this._seo.removeStructuredData('blog-article');
  this._seo.removeStructuredData('blog-faq');
}
```

---

## 3. Update Blog Routes

**File:** `src/app/components/blog/blog.routes.ts`

Add resolver to blog post route:

```typescript
import { blogPostResolver } from "./blog-post/blog-post.resolver";

export const blogRoutes: Routes = [
  {
    path: "",
    component: BlogListComponent,
  },
  {
    path: ":slug",
    component: BlogPostComponent,
    resolve: { blogPost: blogPostResolver }, // Add this line
  },
  // ... other routes
];
```

---

## 4. Update SEO Service

**File:** `src/app/services/seo.service.ts`

**Changes needed:**

- Remove browser-only checks for SSR compatibility
- Add missing meta tags (mobile app, Microsoft, Apple-specific)
- Add HTML comments for organization
- Add structured data methods

```typescript
// Remove these browser checks:
// if (!this._isBrowser) return;

// Add missing meta tags:
this._meta.updateTag({ name: 'msapplication-config', content: '/browserconfig.xml' });
this._meta.updateTag({ name: 'format-detection', content: 'telephone=no' });
this._meta.updateTag({ name: 'mobile-web-app-capable', content: 'yes' });
this._meta.updateTag({ name: 'apple-mobile-web-app-capable', content: 'yes' });
this._meta.updateTag({ name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
this._meta.updateTag({ name: 'apple-mobile-web-app-title', content: 'GitPlumbers' });
this._meta.updateTag({ name: 'application-name', content: 'GitPlumbers' });
this._meta.updateTag({ name: 'msapplication-tooltip', content: 'GitPlumbers - AI Code Optimization' });
this._meta.updateTag({ name: 'msapplication-starturl', content: '/' });

// Add structured data methods:
addStructuredData(schema: Record<string, unknown>, options: { identifier?: string } = {}): void {
  // Implementation similar to IntegrityLens
}

removeStructuredData(identifier: string): void {
  // Implementation similar to IntegrityLens
}
```

---

## 5. Update Blog Content Types

**File:** `src/app/components/blog/blog-content.ts`

**Changes needed:**

- Add `seoMetadata` field to `BlogPost` interface
- Add structured data fields

```typescript
export interface BlogPost {
  // ... existing fields ...
  readonly seoMetadata?: {
    readonly title: string;
    readonly description: string;
    readonly ogTitle: string;
    readonly ogDescription: string;
    readonly ogImage: string;
    readonly twitterTitle: string;
    readonly twitterDescription: string;
    readonly twitterImage: string;
    readonly articleSection: string;
    readonly structuredDataArticle: Record<string, unknown>;
    readonly structuredDataFAQ?: Record<string, unknown>;
  };
  readonly author?: Author;
  readonly updatedAt?: string | Date;
}
```

---

## 6. Update Blog Search Service

**File:** `src/app/services/blog-search.service.ts`

**Changes needed:**

- Ensure `seoMetadata` is fetched from Firestore
- Handle structured data fields

```typescript
// In getPostBySlug method, ensure seoMetadata is included:
const doc = await this._firestore.collection("blog_posts").doc(slug).get();

if (doc.exists) {
  const data = doc.data();
  return {
    // ... existing fields ...
    seoMetadata: data?.seoMetadata,
    author: data?.author,
    updatedAt: data?.updatedAt,
  } as BlogPost;
}
```

---

## 7. Check blog generator fireabse fn

**File:** `functions/src/seo/blog-generator.js`

does it need modified from all the other changes

---

## 8. Update Index.html

**File:** `src/index.html`

**Changes needed:**

- Remove static meta tags (they'll be added dynamically)
- Keep only essential static tags (charset, viewport, base, favicon)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />
    <link rel="apple-touch-icon" href="logo.png" />
    <link rel="manifest" href="/manifest.json" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
```

---

## 9. Testing Checklist

- [ ] Blog post pages show dynamic meta tags in page source
- [ ] Meta tags are properly formatted with line breaks
- [ ] HTML comments appear for organization
- [ ] All mobile app and platform-specific tags are present
- [ ] Article-specific tags (og:type="article", author, publish dates) work
- [ ] Structured data (JSON-LD) appears in page source
- [ ] Canonical URLs are correct
- [ ] SEO metadata is applied during SSR (not client-side)

---

## 10. Deployment Notes

- Ensure SSR is properly configured in `angular.json`
- Test that meta tags appear in page source (not just dev tools)
- Verify that blog posts load with correct SEO metadata
- Check that structured data validates in Google's Rich Results Test

---

## Priority Order

1. **High Priority:** Create blog post resolver and update component
2. **High Priority:** Update SEO service for SSR compatibility
3. **Medium Priority:** Add missing meta tags and HTML comments
4. **Medium Priority:** Update blog content types and search service
5. **Low Priority:** Create blog generator (if needed)
6. **Low Priority:** Clean up static index.html

This migration will give GitPlumbers the same dynamic SEO capabilities as IntegrityLens while maintaining the clean, organized formatting.
