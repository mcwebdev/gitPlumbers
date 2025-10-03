import { Pipe, PipeTransform } from '@angular/core';

/**
 * Get invoice status severity for UI styling
 */
@Pipe({
  name: 'statusSeverity',
  standalone: true,
  pure: true
})
export class StatusSeverityPipe implements PipeTransform {
  transform(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'draft': 'info',
      'open': 'warning',
      'paid': 'success',
      'uncollectible': 'danger',
      'void': 'info'
    };
    return severityMap[status || ''] || 'info';
  }
}
