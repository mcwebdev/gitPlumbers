import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogContentService } from '../blog-content.service';
import { BlogStore } from '../blog.store';
import { BlogCategory, BlogPost, CaseStudy, GuideSummary } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, LoadingSpinnerComponent],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListComponent implements OnInit {
  private readonly _content = inject(BlogContentService);
  private readonly _blogStore = inject(BlogStore);
  private readonly _seo = inject(SeoService);

  protected readonly categories: ReadonlyArray<BlogCategory> = this._content.categories;
  protected readonly featuredPosts = this._blogStore.featuredPosts;
  protected readonly recentPosts = this._blogStore.recentPosts;
  protected readonly caseStudiesPreview: ReadonlyArray<CaseStudy> = this._content
    .getCaseStudies()
    .slice(0, 2);
  protected readonly guideHighlights: ReadonlyArray<GuideSummary> = this._content
    .getGuides()
    .slice(0, 2);

  protected readonly isLoading = this._blogStore.loading;

  ngOnInit(): void {
    this._seo.updateMetadata(
      this._seo.generateAiOptimizedMetadata({
        title: 'GitPlumbers Insights: Modernisation Guides & Engineering Case Studies',
        description:
          'Modernisation guides, case studies, and AI delivery playbooks authored by GitPlumbers consultants who ship remediation work every week.',
        keywords: [
          'software modernization blog',
          'engineering case studies',
          'AI delivery guide',
          'technical debt remediation tips',
        ],
        url: 'https://gitplumbers.com/blog/',
      })
    );

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'GitPlumbers Insights',
      description:
        'Articles, case studies, and guides covering software modernization, AI-assisted delivery, and high-performing engineering teams.',
      url: 'https://gitplumbers.com/blog/',
      publisher: {
        '@type': 'Organization',
        name: 'GitPlumbers',
      },
      hasPart: this.featuredPosts().map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: `https://gitplumbers.com/blog/${post.slug}/`,
        datePublished: post.publishedOn,
        articleSection: post.categorySlug,
      })),
    };

    this._seo.addStructuredData(schema);
  }
}

