import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PaginationState, PaginationControls } from '../../models/pagination.model';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly pagination = input.required<PaginationState>();
  readonly controls = input.required<PaginationControls>();
  readonly showInfo = input<boolean>(true);
  readonly showFirstLast = input<boolean>(true);
  readonly showPrevNext = input<boolean>(true);

  readonly pageChange = output<number>();
  readonly firstPage = output<void>();
  readonly previousPage = output<void>();
  readonly nextPage = output<void>();
  readonly lastPage = output<void>();

  protected readonly hasMultiplePages = computed(() => 
    this.pagination().totalPages > 1
  );

  protected readonly pageInfo = computed(() => {
    const pagination = this.pagination();
    const startItem = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const endItem = Math.min(
      pagination.currentPage * pagination.pageSize,
      pagination.totalItems
    );
    
    return {
      startItem,
      endItem,
      totalItems: pagination.totalItems,
    };
  });

  protected onPageClick(page: number): void {
    if (page !== this.pagination().currentPage) {
      this.pageChange.emit(page);
    }
  }

  protected onFirstClick(): void {
    this.firstPage.emit();
  }

  protected onPreviousClick(): void {
    this.previousPage.emit();
  }

  protected onNextClick(): void {
    this.nextPage.emit();
  }

  protected onLastClick(): void {
    this.lastPage.emit();
  }

  protected isCurrentPage(page: number): boolean {
    return page === this.pagination().currentPage;
  }
}
