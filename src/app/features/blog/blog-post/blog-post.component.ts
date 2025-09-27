import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
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
import { BlogPostResolverResult } from './blog-post.resolver';

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

  // Get resolver data
  private readonly _resolverData = toSignal(
    this._route.data.pipe(map((data) => data['blogPost'] as BlogPostResolverResult)),
    { initialValue: { slug: '', post: null, relatedPosts: [], foundExact: false } }
  );

  protected readonly slug = computed(() => this._slug());

  protected readonly post = computed(() => {
    const resolverData = this._resolverData();
    return resolverData.post;
  });

  protected readonly unknownPost = computed(() => !this.post());

  protected readonly relatedPosts = computed(() => {
    const resolverData = this._resolverData();
    return resolverData.relatedPosts;
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

  // SEO metadata is now applied in the resolver during route resolution (server-side)
  // This ensures metadata appears in the initial HTML response

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
    // Clean up structured data when component is destroyed
    this._seo.removeStructuredData('blog-article');
    this._seo.removeStructuredData('blog-faq');
  }
}

