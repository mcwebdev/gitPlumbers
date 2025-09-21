import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Params } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  queryParams?: Params;
  isActive?: boolean;
}

@Component({
  selector: 'app-breadcrumb-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb-nav.component.html',
  styleUrl: './breadcrumb-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbNavComponent {
  readonly items = input.required<BreadcrumbItem[]>();

  readonly structuredData = computed(() => {
    const breadcrumbItems = this.items();
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: this.buildStructuredDataUrl(item),
      })),
    };
  });

  trackByLabel(index: number, item: BreadcrumbItem): string {
    return item.label;
  }

  private buildStructuredDataUrl(item: BreadcrumbItem): string | undefined {
    if (!item.url) return undefined;
    const querySuffix = this.createQueryString(item.queryParams);
    return `https://gitplumbers.com${item.url}${querySuffix}`;
  }

  private createQueryString(params: Params | undefined): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) return;

      if (Array.isArray(value)) {
        value.forEach((entry) => searchParams.append(key, String(entry)));
        return;
      }

      searchParams.append(key, String(value));
    });

    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }
}
