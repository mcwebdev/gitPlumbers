import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
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
        item: item.url ? `https://gitplumbers.com${item.url}` : undefined,
      })),
    };
  });

  trackByLabel(index: number, item: BreadcrumbItem): string {
    return item.label;
  }
}
