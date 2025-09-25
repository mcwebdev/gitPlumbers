import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BlogContentService } from '../blog-content.service';
import { BlogStore } from '../blog.store';
import { BlogPost, InternalLink, CTA } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { BreadcrumbNavComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb-nav/breadcrumb-nav.component';
import { ReadingProgressComponent } from '../../../shared/components/reading-progress/reading-progress.component';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterLink, NgFor, NgIf, LoadingSpinnerComponent, BreadcrumbNavComponent, ReadingProgressComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPostComponent implements OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _content = inject(BlogContentService);
  private readonly _blogStore = inject(BlogStore);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(map((params) => params.get('slug') ?? 'react-refactors-without-regressions')),
    { initialValue: 'react-refactors-without-regressions' }
  );

  protected readonly slug = computed(() => this._slug());

  protected readonly post = computed(() => {
    const slug = this.slug();
    return this._blogStore.getPostBySlug(slug);
  });

  protected readonly unknownPost = computed(() => !this.post());

  protected readonly relatedPosts = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return [];
    return this._blogStore.getRelatedPosts(currentPost.slug, currentPost.categorySlug);
  });

  protected readonly isLoading = computed(() => this._blogStore.loading());

  protected readonly breadcrumbItems = computed((): BreadcrumbItem[] => {
    const currentPost = this.post();
    if (!currentPost) return [];

    return [
      { label: 'Home', url: '/' },
      { label: 'Blog', url: '/blog' },
      {
        label: currentPost.categorySlug.replace('-', ' '),
        url: '/blog',
        queryParams: { category: currentPost.categorySlug },
      },
      { label: currentPost.title, isActive: true },
    ];
  });

  private readonly _seoEffect = effect(() => {
    const slug = this.slug();
    const post = this.post();
    const isLoading = this.isLoading();
    const canonicalUrl = `https://gitplumbers.com/blog/${slug}/`;

    if (isLoading) {
      this._seo.updateMetadata({
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
      });
      return;
    }

    if (!post) {
      this._seo.updateMetadata({
        title: 'Post not found | GitPlumbers Insights',
        description: 'The resource you requested is unavailable. Explore our latest insights instead.',
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        robotsIndex: false,
        robotsFollow: false,
      });
      return;
    }

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: `${post.title} | GitPlumbers Insights`,
      description: post.summary,
      keywords: [...post.keywords],
      url: canonicalUrl,
    });

    this._seo.updateMetadata(metadata);

    const structuredData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.summary,
      datePublished: post.publishedOn,
      articleSection: post.categorySlug,
      author: {
        '@type': 'Organization',
        name: 'GitPlumbers',
      },
      publisher: {
        '@type': 'Organization',
        name: 'GitPlumbers',
      },
      url: canonicalUrl,
    };

    if (post.faq && post.faq.length) {
      structuredData['mainEntity'] = post.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      }));
    }

    this._seo.addStructuredData(structuredData);
  });

  // SEO Helper Methods
  protected getArticleSchema(post: BlogPost): object {
    return this._content.generateArticleSchema(post);
  }

  protected getFAQSchema(post: BlogPost): object | null {
    return this._content.generateFAQSchema(post);
  }

  protected getInternalLinkUrl(link: InternalLink): string {
    const slug = this.slug();
    return this._content.renderInternalLink(link, slug);
  }

  protected getCTAUrl(cta: CTA): string {
    const slug = this.slug();
    return this._content.renderCTA(cta, slug);
  }

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}

