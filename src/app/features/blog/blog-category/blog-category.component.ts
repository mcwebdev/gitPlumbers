import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BlogContentService } from '../blog-content.service';
import { BlogStore } from '../blog.store';
import { BlogCategory, BlogPost } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-blog-category',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIf, NgFor, DatePipe, LoadingSpinnerComponent],
  templateUrl: './blog-category.component.html',
  styleUrl: './blog-category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogCategoryComponent implements OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _content = inject(BlogContentService);
  private readonly _blogStore = inject(BlogStore);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(map((params) => params.get('slug') ?? 'guides')),
    { initialValue: 'guides' }
  );

  protected readonly requestedSlug = computed(() => this._slug());

  private readonly _requestedCategory = computed<BlogCategory | undefined>(() =>
    this._content.getCategoryBySlug(this.requestedSlug())
  );

  protected readonly category = computed<BlogCategory>(() =>
    this._requestedCategory() ?? this._content.getCategoryBySlug('guides')!
  );

  protected readonly unknownCategory = computed(() => !this._requestedCategory());

  protected readonly posts = computed<ReadonlyArray<BlogPost>>(() =>
    this._blogStore.getPostsByCategory(this.category().slug)
  );

  protected readonly isLoading = computed(() => this._blogStore.loading());

  private readonly _seoEffect = effect(() => {
    const slug = this.requestedSlug();
    const category = this._requestedCategory();

    if (!category) {
      this._seo.updateMetadata({
        title: 'Category not found | GitPlumbers Insights',
        description:
          'The category you are trying to reach is unavailable. Explore our latest modernisation thinking.',
        keywords: 'GitPlumbers blog category not found',
        robotsIndex: false,
        robotsFollow: false,
      });
      return;
    }

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: `${category.title} | GitPlumbers Insights`,
      description: category.seoDescription,
      keywords: [...category.keywords],
      url: `https://gitplumbers-35d92.firebaseapp.com/blog/category/${slug}`,
    });

    this._seo.updateMetadata(metadata);
    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Blog',
          item: 'https://gitplumbers-35d92.firebaseapp.com/blog',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category.title,
          item: `https://gitplumbers-35d92.firebaseapp.com/blog/category/${slug}`,
        },
      ],
    });
  });

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}
