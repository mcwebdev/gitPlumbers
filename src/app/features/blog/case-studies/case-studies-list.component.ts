import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogContentService } from '../blog-content.service';
import { CaseStudy } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-case-studies-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './case-studies-list.component.html',
  styleUrl: './case-studies-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseStudiesListComponent implements OnInit {
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);

  protected readonly studies: ReadonlyArray<CaseStudy> = this._content.getCaseStudies();

  ngOnInit(): void {
    this._seo.updateMetadata(
      this._seo.generateAiOptimizedMetadata({
        title: 'Modernisation Case Studies | GitPlumbers Success Stories',
        description:
          'Detailed case studies covering Angular, React, and Vue modernisation programmes that reduced incidents, sped up delivery, and satisfied regulators.',
        keywords: [
          'software modernisation case studies',
          'legacy remediation success stories',
          'AI code stabilisation results',
          'GitPlumbers client outcomes',
        ],
        url: 'https://gitplumbers.com/blog/case-studies/',
      })
    );

    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'GitPlumbers Case Studies',
      itemListElement: this.studies.map((study, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: study.title,
        url: `https://gitplumbers.com/blog/case-studies/${study.slug}/`,
      })),
    });
  }
}

