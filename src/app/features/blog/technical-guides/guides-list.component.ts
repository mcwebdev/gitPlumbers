import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogContentService } from '../blog-content.service';
import { GuideSummary } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-guides-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgFor],
  templateUrl: './guides-list.component.html',
  styleUrl: './guides-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidesListComponent implements OnInit {
  private readonly _content = inject(BlogContentService);
  private readonly _seo = inject(SeoService);

  protected readonly guides: ReadonlyArray<GuideSummary> = this._content.getGuides();

  ngOnInit(): void {
    this._seo.updateMetadata(
      this._seo.generateAiOptimizedMetadata({
        title: 'Technical Guides & Playbooks | GitPlumbers',
        description:
          'Downloadable playbooks for React, Angular, Node.js, and Python teams facing AI-assisted code debt and platform upgrades.',
        keywords: [
          'software modernization guide',
          'React hardening playbook',
          'Angular signals migration guide',
          'Node reliability checklist',
        ],
        url: 'https://gitplumbers.com/blog/guides/',
      })
    );

    this._seo.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'GitPlumbers Technical Guides',
      itemListElement: this.guides.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: guide.title,
        url: `https://gitplumbers.com/blog/guides/${guide.slug}/`,
      })),
    });
  }
}

