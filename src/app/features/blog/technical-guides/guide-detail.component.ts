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
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BlogContentService } from '../blog-content.service';
import { GuideSummary } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-guide-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgFor, NgIf],
  templateUrl: './guide-detail.component.html',
  styleUrl: './guide-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuideDetailComponent implements OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(map((params) => params.get('slug') ?? 'react-production-hardening-guide')),
    { initialValue: 'react-production-hardening-guide' }
  );

  protected readonly slug = computed(() => this._slug());

  private readonly _requestedGuide = computed<GuideSummary | undefined>(() =>
    this._content.getGuide(this.slug())
  );

  protected readonly guide = computed<GuideSummary>(() =>
    this._requestedGuide() ?? this._content.getGuides()[0]
  );

  protected readonly unknownGuide = computed(() => !this._requestedGuide());

  protected readonly relatedGuides = computed(() =>
    this._content
      .getGuides()
      .filter((item) => item.slug !== this.guide().slug)
      .slice(0, 2)
  );

  private readonly _seoEffect = effect(() => {
    const slug = this.slug();
    const guide = this._requestedGuide();

    if (!guide) {
      this._seo.updateMetadata({
        title: 'Guide not found | GitPlumbers',
        description: 'The guide you were looking for is unavailable. Explore our other playbooks.',
        robotsIndex: false,
        robotsFollow: false,
      });
      return;
    }

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: `${guide.title} | GitPlumbers Guide`,
      description: guide.summary,
      keywords: [...guide.keywords],
      url: `https://gitplumbers.com/blog/guides/${slug}`,
    });

    this._seo.updateMetadata(metadata);
    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: guide.title,
      description: guide.summary,
      tool: guide.stack,
      step: guide.takeaways.map((takeaway, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: takeaway,
      })),
      supply: guide.checkpoints,
      url: `https://gitplumbers.com/blog/guides/${slug}`,
    });
  });

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}
