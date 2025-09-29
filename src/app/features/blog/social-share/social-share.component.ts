import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

interface ShareButton {
  readonly key: 'linkedin' | 'x' | 'facebook' | 'copy';
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly styleClass: string;
}

@Component({
  selector: 'app-social-share',
  standalone: true,
  imports: [CommonModule, NgClass, NgIf, ButtonModule, TooltipModule],
  templateUrl: './social-share.component.html',
  styleUrl: './social-share.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialShareComponent implements OnDestroy {
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _isBrowser = isPlatformBrowser(this._platformId);

  @Input({ required: true }) title!: string;
  @Input() summary = '';
  @Input() shareUrl?: string;
  @Input() tags: readonly string[] = [];

  protected readonly copyStatus = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly shareError = signal<string | null>(null);

  private _copyTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly shareButtons: ShareButton[] = [
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: 'pi pi-linkedin',
      description: 'Share on LinkedIn',
      styleClass: 'share-button--linkedin',
    },
    {
      key: 'x',
      label: 'X',
      icon: 'pi pi-twitter',
      description: 'Share on X',
      styleClass: 'share-button--x',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'pi pi-facebook',
      description: 'Share on Facebook',
      styleClass: 'share-button--facebook',
    },
    {
      key: 'copy',
      label: 'Copy link',
      icon: 'pi pi-link',
      description: 'Copy link to article',
      styleClass: 'share-button--copy',
    },
  ];

  protected readonly hasWebShare = computed(() => {
    if (!this._isBrowser) {
      return false;
    }
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  });

  ngOnDestroy(): void {
    if (this._copyTimeout) {
      clearTimeout(this._copyTimeout);
      this._copyTimeout = null;
    }
  }

  protected async handleShare(button: ShareButton): Promise<void> {
    this.shareError.set(null);

    if (button.key === 'copy') {
      await this.copyLink();
      return;
    }

    const url = this.buildShareUrl(button.key);
    if (!url) {
      this.shareError.set('Unable to build share link.');
      return;
    }

    if (!this._isBrowser) {
      this.shareError.set('Sharing is only available in the browser.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  }

  protected async shareWithSystem(): Promise<void> {
    if (!this._isBrowser || typeof navigator === 'undefined' || !navigator.share) {
      this.shareError.set('System sharing is not available.');
      return;
    }

    try {
      await navigator.share({
        title: this.title,
        text: this.summary,
        url: this.resolvedShareUrl,
      });
    } catch (error: unknown) {
      if ((error as DOMException)?.name === 'AbortError') {
        return;
      }
      this.shareError.set('We could not share the article.');
    }
  }

  private async copyLink(): Promise<void> {
    if (!this._isBrowser || typeof navigator === 'undefined') {
      this.copyStatus.set('error');
      return;
    }

    const url = this.resolvedShareUrl;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        this.copyUsingFallback(url);
      }
      this.replaceCopyStatus('success');
    } catch {
      try {
        this.copyUsingFallback(url);
        this.replaceCopyStatus('success');
      } catch {
        this.replaceCopyStatus('error');
      }
    }
  }

  private copyUsingFallback(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!successful) {
      throw new Error('Copy command failed');
    }
  }

  private replaceCopyStatus(status: 'success' | 'error'): void {
    this.copyStatus.set(status);
    if (this._copyTimeout) {
      clearTimeout(this._copyTimeout);
    }
    this._copyTimeout = setTimeout(() => this.copyStatus.set('idle'), 2500);
  }

  private buildShareUrl(key: ShareButton['key']): string | null {
    const url = encodeURIComponent(this.resolvedShareUrl);
    const title = encodeURIComponent(this.title);
    const summary = encodeURIComponent(this.summary ?? '');

    switch (key) {
      case 'linkedin':
        return `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${summary}&source=IntegrityLens`;
      case 'x': {
        const sanitizedTags = (this.tags ?? [])
          .slice(0, 3)
          .map((tag) => tag.replace(/[^a-z0-9]/gi, ''))
          .filter((tag) => tag.length > 0);
        const hashtagParam = sanitizedTags.length
          ? `&hashtags=${encodeURIComponent(sanitizedTags.join(','))}`
          : '';
        return `https://twitter.com/intent/tweet?url=${url}&text=${title}${hashtagParam}`;
      }
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case 'copy':
        return this.resolvedShareUrl;
      default:
        return null;
    }
  }

  private get resolvedShareUrl(): string {
    if (this.shareUrl) {
      return this.shareUrl;
    }

    if (this._isBrowser && typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }

    return 'https://getintegritylens.com/blog';
  }
}

