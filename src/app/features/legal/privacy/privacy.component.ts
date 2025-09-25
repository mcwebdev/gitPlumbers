import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../shared/services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {
  private readonly _seo = inject(SeoService);

  constructor() {
    this._seo.updateMetadata({
      title: 'Privacy Policy | GitPlumbers',
      description: 'Learn how GitPlumbers protects your privacy and handles your data. Our commitment to data security and user privacy.',
      keywords: ['privacy policy', 'data protection', 'user privacy', 'GitPlumbers privacy'],
    });
  }
}
