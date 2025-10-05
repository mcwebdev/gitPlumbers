import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './shared/components/site-header/site-header.component';
import { SiteFooterComponent } from './shared/components/site-footer/site-footer.component';
import { ScrollService } from './shared/services/scroll.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private scrollService = inject(ScrollService);
}
