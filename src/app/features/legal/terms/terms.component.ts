import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss'
})
export class TermsComponent {
  private readonly _seo = inject(SeoService);

  constructor() {
    this._seo.updateMetadata({
      title: 'Terms of Service | GitPlumbers',
      description: 'Read GitPlumbers Terms of Service. Understand your rights and responsibilities when using our code optimization and enterprise modernization services.',
      keywords: ['terms of service', 'user agreement', 'GitPlumbers terms', 'service terms'],
    });
  }
}
