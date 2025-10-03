import { Pipe, PipeTransform } from '@angular/core';

/**
 * Format currency amount for display
 * Converts from cents to dollars and formats with proper currency symbol
 */
@Pipe({
  name: 'formatAmount',
  standalone: true,
  pure: true
})
export class FormatAmountPipe implements PipeTransform {
  transform(amount: number, currency: string = 'usd'): string {
    if (amount == null || isNaN(amount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
  }
}
