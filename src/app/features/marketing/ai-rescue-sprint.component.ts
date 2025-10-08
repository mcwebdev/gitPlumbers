import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-rescue-sprint',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './ai-rescue-sprint.component.html',
  styleUrl: './ai-rescue-sprint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRescueSprintComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  ngOnInit(): void {
    this._seoService.updateMetadata({
      title: 'AI Code Rescue Sprint - Transform Your AI-Generated Codebase in 1 Week | $5K',
      description:
        'One-week intensive audit and optimization of your AI-generated codebase. Get a comprehensive code health report, critical fixes implemented, 90-day roadmap, and knowledge transfer session. Perfect for startups and teams dealing with AI-assisted code.',
      keywords: [
        'AI code rescue',
        'AI-generated code audit',
        'code cleanup service',
        'ChatGPT code optimization',
        'Cursor code review',
        'GitHub Copilot cleanup',
        'startup code audit',
        'code health report',
        '1 week code sprint',
      ],
      ogTitle: 'AI Code Rescue Sprint - Fix Your AI Code in 1 Week',
      ogDescription:
        'Transform your AI-generated codebase from fragile prototype to production-ready in just one week. $5,000 flat rate.',
      ogImage: '/promo2.png',
    });
  }

  protected readonly packagePrice = 5000;
  protected readonly timeline = '1 week';
  protected readonly upfrontPayment = 2500;

  protected readonly heroSection = {
    headline: 'AI Code Rescue Sprint',
    subheadline: 'Your AI-generated app works... kinda. Let\'s fix that.',
    description:
      'In just one week, we\'ll transform your AI-assisted codebase from fragile prototype into production-ready code.',
    ctaPrimary: { label: 'Book Your Sprint', href: '/contact' },
    ctaSecondary: { label: 'See Sample Report', href: '/blog/case-studies/sample-diagnostic-report' },
  };

  protected readonly deliverables = [
    {
      icon: '📊',
      title: 'Deep Codebase Audit',
      timeline: 'Day 1-2',
      description:
        'Complete analysis using automated tools and manual review to identify security issues, performance bottlenecks, and AI-generated antipatterns.',
      whatYouGet: [
        'Code Health Report (PDF, 10-15 pages)',
        'Executive summary',
        'Critical issues breakdown',
        'Tech debt hotspots',
        'Dependency risks analysis',
        'Before/after metrics',
      ],
    },
    {
      icon: '✅',
      title: 'Priority Fixes Implementation',
      timeline: 'Day 3-5',
      description:
        'We fix the top 5-8 critical issues identified in the audit, focusing on security, performance, and code structure.',
      whatYouGet: [
        'Working PR/branch with fixes',
        'Detailed changelog',
        '5-minute video walkthrough',
        'Up to 20 hours implementation',
      ],
    },
    {
      icon: '📋',
      title: '90-Day Improvement Roadmap',
      timeline: 'Day 6',
      description:
        'Prioritized list of remaining improvements categorized by impact and effort, with optional pricing for implementation.',
      whatYouGet: [
        'Prioritized roadmap document',
        'Quick wins (Weeks 1-4)',
        'Major refactors (Months 2-3)',
        'Architecture evolution plan',
        'Optional pricing for follow-on work',
      ],
    },
    {
      icon: '🎤',
      title: 'Knowledge Transfer Session',
      timeline: 'Day 7',
      description:
        '60-minute video call walking through the audit, fixes, and roadmap with your team.',
      whatYouGet: [
        'Live walkthrough with recording',
        'Developer guide (markdown)',
        '30 days email support',
        'Best practices documentation',
      ],
    },
  ];

  protected readonly idealFor = [
    {
      emoji: '🚀',
      title: 'Startup Founders',
      description: 'Built MVP with AI assistance and need professional stabilization',
    },
    {
      emoji: '💼',
      title: 'Small Tech Teams',
      description: '"Vibe coded" a product and now need cleanup before scaling',
    },
    {
      emoji: '🏢',
      title: 'Enterprise Teams',
      description: 'Testing AI tools internally, need professional code review',
    },
    {
      emoji: '🔧',
      title: 'Agencies',
      description: 'Inherited messy AI-generated code from clients',
    },
  ];

  protected readonly painPoints = [
    'It works but feels fragile',
    'We\'re scared to deploy',
    'Performance is terrible',
    'We don\'t know what\'s broken',
    'Tech debt is piling up',
    'Security vulnerabilities unknown',
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
      title: 'Implement the Roadmap',
      price: '$12K-20K',
      description: 'Complete Phase 1 & 2 implementation',
    },
    {
      title: 'Monthly Code Health Retainer',
      price: '$3K/month',
      description: 'Ongoing monitoring and optimization',
    },
    {
      title: 'Team Training Workshop',
      price: '$2K',
      description: 'Half-day training for your team',
    },
  ];

  protected readonly benefits = [
    {
      icon: '⚡',
      title: 'Fast Turnaround',
      description: 'Complete transformation in just 1 week',
    },
    {
      icon: '💰',
      title: 'Fixed Price',
      description: 'No hourly billing surprises - $5K flat',
    },
    {
      icon: '🎯',
      title: 'Actionable Results',
      description: 'Clear roadmap with priorities and estimates',
    },
    {
      icon: '🔒',
      title: 'Security First',
      description: 'Identify and fix critical vulnerabilities',
    },
    {
      icon: '📈',
      title: 'Performance Boost',
      description: 'Optimize slow code and bottlenecks',
    },
    {
      icon: '🤝',
      title: 'Knowledge Transfer',
      description: 'Your team learns best practices',
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
      title: 'Share Your Code',
      description: 'Grant us access to your repository or upload your codebase',
    },
    {
      step: '3',
      title: 'We Audit & Fix',
      description: 'Days 1-6: Deep analysis, critical fixes, and roadmap creation',
    },
    {
      step: '4',
      title: 'Knowledge Transfer',
      description: 'Day 7: Live walkthrough and handoff with 30 days support',
    },
  ];

  protected readonly faq = [
    {
      question: 'What if my codebase is really messy?',
      answer:
        'That\'s exactly who this is for! We specialize in cleaning up AI-generated code. The messier it is, the more value you\'ll get from the audit.',
    },
    {
      question: 'What technologies do you support?',
      answer:
        'We cover all major frameworks: React, Vue, Angular, Node.js, Python, and more. If you have a specific stack, contact us to confirm.',
    },
    {
      question: 'Can you implement all the fixes?',
      answer:
        'The sprint includes fixing the top 5-8 critical issues. Additional fixes can be scoped as follow-on work using the roadmap we create.',
    },
    {
      question: 'What if I just want the audit?',
      answer:
        'We can do audit-only for $3K. This gives you the full code health report without the fixes or roadmap.',
    },
    {
      question: 'How quickly can we start?',
      answer:
        'Usually within 1-2 weeks of booking. We\'ll schedule your sprint based on availability.',
    },
    {
      question: 'Do you sign NDAs?',
      answer:
        'Absolutely. We\'ll sign your NDA or we can provide our standard confidentiality agreement.',
    },
  ];

  protected readonly adImages = [
    '/ad3.png',
    '/ad4.png',
    '/ad5.png',
  ];
}
