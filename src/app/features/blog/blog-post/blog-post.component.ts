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
import { BlogPost } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterLink, NgFor, NgIf, LoadingSpinnerComponent],
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

  private readonly _seoEffect = effect(() => {
    const slug = this.slug();
    const post = this.post();

    if (!post) {
      this._seo.updateMetadata({
        title: 'Post not found | GitPlumbers Insights',
        description: 'The resource you requested is unavailable. Explore our latest insights instead.',
        robotsIndex: false,
        robotsFollow: false,
      });
      return;
    }

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: `${post.title} | GitPlumbers Insights`,
      description: post.summary,
      keywords: [...post.keywords],
      url: `https://gitplumbers-35d92.firebaseapp.com/blog/${slug}`,
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
      url: `https://gitplumbers-35d92.firebaseapp.com/blog/${slug}`,
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

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}
