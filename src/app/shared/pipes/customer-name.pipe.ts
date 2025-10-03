import { Pipe, PipeTransform } from '@angular/core';
import { StripeCustomer } from '../models/stripe.interface';

/**
 * Get customer name from customer object or ID
 */
@Pipe({
  name: 'customerName',
  standalone: true,
  pure: true
})
export class CustomerNamePipe implements PipeTransform {
  transform(customer: string | StripeCustomer, customers: StripeCustomer[] = []): string {
    if (typeof customer === 'string') {
      const foundCustomer = customers.find(c => c.id === customer);
      return foundCustomer?.name || foundCustomer?.email || customer;
    }
    return customer.name || customer.email || customer.id;
  }
}
