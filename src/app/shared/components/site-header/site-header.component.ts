import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthUserService } from '../../services/auth-user.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  private readonly authUser = inject(AuthUserService);

  protected readonly profile = this.authUser.profile;
  protected readonly isAuthLoading = this.authUser.isAuthLoading;
  protected readonly isLoggedIn = this.authUser.isLoggedIn;
  protected readonly dashboardUrl = computed(() => {
    const user = this.profile();
    return user?.role === 'admin' ? '/admin' : '/dashboard';
  });

  protected async logout(): Promise<void> {
    await this.authUser.logout();
  }
}
