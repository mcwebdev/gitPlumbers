import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BlogContentService } from '../blog-content.service';
import { CaseStudy } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-case-study-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './case-study-detail.component.html',
  styleUrl: './case-study-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseStudyDetailComponent implements OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(map((params) => params.get('slug') ?? 'healthcare-angular-modernization')),
    { initialValue: 'healthcare-angular-modernization' }
  );

  protected readonly slug = computed(() => this._slug());

  private readonly _requestedStudy = computed<CaseStudy | undefined>(() =>
    this._content.getCaseStudy(this.slug())
  );

  protected readonly study = computed<CaseStudy>(() =>
    this._requestedStudy() ?? this._content.getCaseStudies()[0]
  );

  protected readonly unknownStudy = computed(() => !this._requestedStudy());

  protected readonly relatedStudies = computed(() =>
    this._content
      .getCaseStudies()
      .filter((item) => item.slug !== this.study().slug)
      .slice(0, 2)
  );

  private readonly _seoEffect = effect(() => {
    const slug = this.slug();
    const study = this._requestedStudy();
    const canonicalUrl = `https://gitplumbers.com/blog/case-studies/${slug}/`;

    if (!study) {
      this._seo.updateMetadata({
        title: 'Case study not found | GitPlumbers',
        description: 'The case study you attempted to reach is unavailable. Review our recent wins instead.',
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        robotsIndex: false,
        robotsFollow: false,
      });
      return;
    }

    const metadata = this._seo.generateAiOptimizedMetadata({
      title: `${study.title} | GitPlumbers Case Study`,
      description: study.summary,
      keywords: [...study.keywords],
      url: canonicalUrl,
    });

    this._seo.updateMetadata(metadata);
    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'CaseStudy',
      name: study.title,
      description: study.summary,
      url: canonicalUrl,
      audience: 'Engineering leaders modernising software platforms',
      about: study.challenge,
      provider: {
        '@type': 'Organization',
        name: 'GitPlumbers',
      },
      headline: study.title,
      industry: study.industry,
      outcome: study.outcomes,
      hasPart: study.approach.map((item) => ({
        '@type': 'HowToStep',
        name: item,
      })),
    });
  });

  ngOnDestroy(): void {
    this._seoEffect.destroy();
  }
}

