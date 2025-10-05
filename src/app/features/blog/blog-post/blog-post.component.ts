import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { marked } from 'marked';
import { toSignal } from '@angular/core/rxjs-interop';
import hljs from 'highlight.js';
import { BlogContentService } from '../blog-content.service';
import { BlogStore } from '../blog.store';
import { BlogPost, InternalLink, CTA } from '../blog-content';
import { SeoService } from '../../../shared/services/seo.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { BreadcrumbNavComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb-nav/breadcrumb-nav.component';
import { ReadingProgressComponent } from '../../../shared/components/reading-progress/reading-progress.component';
import { SocialShareComponent } from '../social-share/social-share.component';
import { BlogPostResolverResult } from './blog-post.resolver';
interface ShareMetadata {
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly tags: readonly string[];
}
@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe, LoadingSpinnerComponent, BreadcrumbNavComponent, ReadingProgressComponent, SocialShareComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPostComponent implements OnDestroy {
  private readonly _route = inject(ActivatedRoute);
  private readonly _content = inject(BlogContentService);
  private readonly _blogStore = inject(BlogStore);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(map((params) => params.get('slug') ?? 'react-refactors-without-regressions')),
    { initialValue: 'react-refactors-without-regressions' }
  );

  // Get resolver data
  private readonly _resolverData = toSignal(
    this._route.data.pipe(map((data) => data['blogPost'] as BlogPostResolverResult)),
    { initialValue: { slug: '', post: null, relatedPosts: [], foundExact: false } }
  );

  protected readonly slug = computed(() => this._slug());

  protected readonly post = computed(() => {
    const resolverData = this._resolverData();
    return resolverData.post;
  });

  protected readonly unknownPost = computed(() => !this.post());

  protected readonly relatedPosts = computed(() => {
    const resolverData = this._resolverData();
    return resolverData.relatedPosts;
  });

  protected readonly isLoading = computed(() => this._blogStore.loading());

  protected readonly breadcrumbItems = computed((): BreadcrumbItem[] => {
    const currentPost = this.post();
    if (!currentPost) return [];

    return [
      { label: 'Home', url: '/' },
      { label: 'Blog', url: '/blog' },
      {
        label: currentPost.categorySlug.replace('-', ' '),
        url: '/blog',
        queryParams: { category: currentPost.categorySlug },
      },
      { label: currentPost.title, isActive: true },
    ];
  });
  private readonly _blogBaseUrl = 'https://gitplumbers.com/blog';
  // SEO metadata is now applied in the resolver during route resolution (server-side)
  // This ensures metadata appears in the initial HTML response

  // SEO Helper Methods
  protected getArticleSchema(post: BlogPost): object {
    return this._content.generateArticleSchema(post);
  }

  protected getFAQSchema(post: BlogPost): object | null {
    return this._content.generateFAQSchema(post);
  }

  protected getInternalLinkUrl(link: InternalLink): string {
    const slug = this.slug();
    return this._content.renderInternalLink(link, slug);
  }

  protected getCTAUrl(cta: CTA): string {
    const slug = this.slug();
    return this._content.renderCTA(cta, slug);
  }

  protected readonly shareMetadata = computed<ShareMetadata | null>(() => {
    const currentPost = this.post();
    if (!currentPost) {
      return null;
    }

    const slug = this.slug();
    const canonical = `${this._blogBaseUrl}/${slug}`;
    const canonicalMatchesSlug =
      typeof canonical === 'string' &&
      canonical.startsWith(this._blogBaseUrl) &&
      canonical.endsWith(`/${slug}`);

    const shareUrl = canonicalMatchesSlug
      ? canonical
      : `${this._blogBaseUrl}/${slug}`;

    return {
      title: currentPost.title,
      summary: currentPost.summary || currentPost.deck,
      url: shareUrl,
      tags: currentPost.keywords ?? [],
    };
  });

  protected readonly renderedBody = computed<string>(() => {
    const currentPost = this.post();
    if (!currentPost || !currentPost.body.length) {
      return '';
    }

    // Configure marked with custom renderer for syntax highlighting
    const renderer = new marked.Renderer();
    
    renderer.code = ({ text, lang }: { text: string; lang?: string }): string => {
      // Try to highlight with specified language
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(text, { language: lang }).value;
          return `<pre data-code="${this.escapeHtml(text)}"><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        } catch (err) {
          console.warn('Highlight.js error:', err);
        }
      }
      
      // Auto-detect language if not specified or highlighting failed
      try {
        const result = hljs.highlightAuto(text);
        return `<pre data-code="${this.escapeHtml(text)}"><code class="hljs ${result.language ? `language-${result.language}` : ''}">${result.value}</code></pre>`;
      } catch (err) {
        console.warn('Highlight.js auto-detect error:', err);
      }
      
      // Fall back to plain code block
      return `<pre data-code="${this.escapeHtml(text)}"><code>${text}</code></pre>`;
    };

    marked.setOptions({
      breaks: true,
      gfm: true,
      renderer,
    });

    // Join all body paragraphs and render as markdown
    const markdownContent = currentPost.body.join('\n\n');
    const html = marked.parse(markdownContent) as string;
    
    // Add copy functionality after rendering
    setTimeout(() => this.addCopyFunctionality(), 0);
    
    return html;
  });

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private addCopyFunctionality(): void {
    const codeBlocks = document.querySelectorAll('.blog-post__body pre[data-code]');
    
    codeBlocks.forEach((block) => {
      const preElement = block as HTMLElement;
      
      // Remove existing click listeners to prevent duplicates
      preElement.removeEventListener('click', this.handleCopyClick);
      
      // Add click listener for copy functionality
      preElement.addEventListener('click', this.handleCopyClick.bind(this));
    });
  }

  private handleCopyClick(event: Event): void {
    const target = event.target as HTMLElement;
    const preElement = target.closest('pre[data-code]') as HTMLElement;
    
    if (!preElement) return;
    
    const codeText = preElement.getAttribute('data-code');
    if (!codeText) return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(codeText).then(() => {
      // Add copied class for visual feedback
      preElement.classList.add('copied');
      
      // Remove copied class after 2 seconds
      setTimeout(() => {
        preElement.classList.remove('copied');
      }, 2000);
    }).catch((err) => {
      console.error('Failed to copy code:', err);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(codeText, preElement);
    });
  }

  private fallbackCopyToClipboard(text: string, element: HTMLElement): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      element.classList.add('copied');
      setTimeout(() => {
        element.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  ngOnDestroy(): void {
    // Clean up structured data when component is destroyed
    this._seo.removeStructuredData('blog-article');
    this._seo.removeStructuredData('blog-faq');
  }
}

