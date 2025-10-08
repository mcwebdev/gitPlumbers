import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-seo-sprint',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './ai-seo-sprint.component.html',
  styleUrl: './ai-seo-sprint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSeoSprintComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  ngOnInit(): void {
    this._seoService.updateMetadata({
      title: 'AI SEO Content Sprint - Transform Your Content Strategy in 1 Week | $5K',
      description:
        'One-week AI-powered SEO content generation using your industry expertise. Get unlimited scalable content creation, rich metadata, social sharing optimization, and a frictionless content pipeline. Perfect for companies that need high-quality content at scale.',
      keywords: [
        'AI SEO content',
        'AI content generation',
        'SEO content service',
        'automated content creation',
        'AI SEO optimization',
        'content marketing AI',
        'scalable content production',
        'SEO metadata generation',
        '1 week content sprint',
      ],
      ogTitle: 'AI SEO Content Sprint - Scale Your Content in 1 Week',
      ogDescription:
        'Transform your content strategy from bottleneck to unlimited scale in just one week. AI-powered content using your expertise. $5,000 flat rate.',
      ogImage: '/promo2.png',
    });
  }

  protected readonly packagePrice = 5000;
  protected readonly timeline = '1 week';
  protected readonly upfrontPayment = 2500;

  protected readonly heroSection = {
    headline: 'AI SEO Content Sprint',
    subheadline: 'Stop writing. Start scaling.',
    description:
      'In just one week, we\'ll build you an AI-powered content engine that uses YOUR industry expertise to create unlimited SEO-optimized content.',
    ctaPrimary: { label: 'Book Your Sprint', href: '/contact' },
    ctaSecondary: { label: 'See Sample Content', href: '/blog' },
  };

  protected readonly deliverables = [
    {
      icon: '🧠',
      title: 'Knowledge Extraction Session',
      timeline: 'Day 1',
      description:
        'We interview your team to capture industry expertise, product knowledge, customer pain points, and unique positioning. This becomes the foundation of your AI content engine.',
      whatYouGet: [
        '2-hour knowledge capture session',
        'Industry expertise documentation',
        'Brand voice analysis',
        'Competitor content audit',
        'Target keyword research',
        'Content strategy framework',
      ],
    },
    {
      icon: '⚙️',
      title: 'AI Content Engine Setup',
      timeline: 'Day 2-3',
      description:
        'We build custom AI prompts, templates, and workflows trained on your expertise. The engine generates content that sounds like your team wrote it.',
      whatYouGet: [
        'Custom AI content pipeline',
        'Brand-specific prompt engineering',
        'SEO metadata templates',
        'Social sharing optimization',
        'Content quality controls',
        'Automated fact-checking workflow',
      ],
    },
    {
      icon: '📝',
      title: 'Initial Content Generation',
      timeline: 'Day 4-5',
      description:
        'We produce your first batch of AI-generated content: blog posts, landing pages, product descriptions, or whatever you need most.',
      whatYouGet: [
        'Scheuled content for 90 days',
        'Generate as much as you want',
        'Rich metadata for all content',
        'Social sharing cards (OG, Twitter)',
        'Schema.org structured data',
        'Internal linking strategy',
      ],
    },
    {
      icon: '🚀',
      title: 'Team Training & Handoff',
      timeline: 'Day 6-7',
      description:
        '90-minute training session showing your team how to use the content engine. Plus documentation and 30 days of support.',
      whatYouGet: [
        'Live training with recording',
        'Content generation playbook',
        'Quality control checklist',
        '30 days email support',
        'Prompt library & templates',
        'Scaling roadmap',
      ],
    },
  ];

  protected readonly idealFor = [
    {
      emoji: '🚀',
      title: 'Startups',
      description: 'Need content velocity but can\'t afford a full content team',
    },
    {
      emoji: '💼',
      title: 'SaaS Companies',
      description: 'Want to dominate SEO but writing is a bottleneck',
    },
    {
      emoji: '🛒',
      title: 'Ecommerce Brands',
      description: 'Need product descriptions, category pages, and blog content at scale',
    },
    {
      emoji: '🏢',
      title: 'B2B Companies',
      description: 'Have deep expertise but struggle to publish consistently',
    },
  ];

  protected readonly painPoints = [
    'Content creation is too slow',
    'Can\'t afford a full content team',
    'Generic content doesn\'t convert',
    'SEO work is expensive and inconsistent',
    'Team knows stuff but can\'t write it down',
    'Need 100 articles but only have budget for 10',
  ];

  protected readonly pricingDetails = {
    price: this.packagePrice,
    payment: {
      upfront: this.upfrontPayment,
      onDelivery: this.upfrontPayment,
    },
    timeline: this.timeline,
    effectiveRate: '$110-140/hr',
  };

  protected readonly addOns = [
    {
      title: 'Ongoing Content Production',
      price: '$2K/month',
      description: '20-30 articles/month with continuous optimization',
    },
    {
      title: 'Advanced SEO Setup',
      price: '$3K',
      description: 'Technical SEO audit, schema implementation, site optimization',
    },
    {
      title: 'Content Promotion Package',
      price: '$1.5K/month',
      description: 'Social distribution, email campaigns, backlink outreach',
    },
  ];

  protected readonly benefits = [
    {
      icon: '⚡',
      title: 'Unlimited Scale',
      description: 'Generate 10 or 1000 articles - the engine handles it',
    },
    {
      icon: '🎯',
      title: 'Your Expertise',
      description: 'Content based on YOUR knowledge, not generic AI slop',
    },
    {
      icon: '💰',
      title: 'Fixed Price',
      description: 'No per-article fees - $5K gets you the whole system',
    },
    {
      icon: '📈',
      title: 'SEO-First',
      description: 'Every piece includes metadata, structured data, optimization',
    },
    {
      icon: '🔒',
      title: 'Brand Consistent',
      description: 'Trained on your voice, products, and positioning',
    },
    {
      icon: '🤝',
      title: 'Team Owned',
      description: 'You get the prompts, templates, and knowledge to run it',
    },
  ];

  protected readonly processSteps = [
    {
      step: '1',
      title: 'Book Your Sprint',
      description: 'Contact us and pay 50% upfront to secure your sprint slot',
    },
    {
      step: '2',
      title: 'Knowledge Session',
      description: 'Day 1: We interview your team to extract expertise and strategy',
    },
    {
      step: '3',
      title: 'Build & Generate',
      description: 'Days 2-5: We build your AI engine and create initial content',
    },
    {
      step: '4',
      title: 'Training & Launch',
      description: 'Days 6-7: Your team learns to use the system with 30 days support',
    },
  ];

  protected readonly faq = [
    {
      question: 'Is this just generic AI content?',
      answer:
        'No. We extract YOUR industry expertise, product knowledge, and brand voice. The AI is trained specifically on your business. The output sounds like your team wrote it, not ChatGPT.',
    },
    {
      question: 'What types of content can it generate?',
      answer:
        'Blog posts, landing pages, product descriptions, category pages, FAQs, email campaigns, social posts - anything text-based. We customize the engine to your needs.',
    },
    {
      question: 'Will this hurt my SEO with duplicate content?',
      answer:
        'No. Every piece is unique and optimized. We include rich metadata, schema.org markup, and proper technical SEO. Google loves high-quality, relevant content - which is what this produces.',
    },
    {
      question: 'Do I need technical knowledge to use it?',
      answer:
        'No. We build the system and train your team. If you can use ChatGPT, you can use this. We provide templates, prompts, and a simple workflow.',
    },
    {
      question: 'How quickly can we start generating content?',
      answer:
        'Within 1 week. You\'ll have your first batch of content by Day 5, and full control of the system by Day 7. Then you can generate as much as you want.',
    },
    {
      question: 'What if the content needs editing?',
      answer:
        'We include quality controls and fact-checking workflows. Most content is 80-90% ready to publish. Your team can review and polish before publishing - still way faster than writing from scratch.',
    },
    {
      question: 'Can you just generate content for us ongoing?',
      answer:
        'Yes. After the sprint, we offer ongoing production at $2K/month for 20-30 articles. Or you can run it yourself. Your choice.',
    },
  ];

  protected readonly adImages = [
    '/ad3.png',
    '/ad4.png',
    '/ad5.png',
  ];
}
