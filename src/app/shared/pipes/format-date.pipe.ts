import { Pipe, PipeTransform } from '@angular/core';

/**
 * Format date from Unix timestamp
 */
@Pipe({
  name: 'formatDate',
  standalone: true,
  pure: true
})
export class FormatDatePipe implements PipeTransform {
  transform(timestamp: number): string {
    if (!timestamp || isNaN(timestamp)) {
      return '';
    }
    
    return new Date(timestamp * 1000).toLocaleDateString();
  }
}
