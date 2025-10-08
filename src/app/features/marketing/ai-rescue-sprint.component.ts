import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';
import { CommonModule } from '@angular/common';

interface SprintOption {
  weeks: number;
  name: string;
  price: number;
  timeline: string;
  description: string;
  highlights: string[];
  deliverables: any[];
}

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

  protected selectedSprint = signal<number>(1);

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

  protected readonly sprintOptions: SprintOption[] = [
    {
      weeks: 1,
      name: 'Emergency Rescue',
      price: 5000,
      timeline: '1 week',
      description: 'Critical code issues blocking your launch or causing production fires. We triage and stabilize immediately.',
      highlights: [
        '🚨 Break-fix focused',
        '⚡ Rapid deployment unblocking',
        '🔥 Production fire fighting',
        '🎯 Top 5-8 critical fixes'
      ],
      deliverables: [
        {
          icon: '🚨',
          title: 'Emergency Triage & Assessment',
          timeline: 'Day 1',
          description: 'Rapid analysis to identify blocking issues, security vulnerabilities, and production-critical problems.',
          whatYouGet: [
            'Emergency Assessment Report',
            'Critical issues breakdown',
            'Immediate risk analysis',
            'Triage priority matrix',
          ],
        },
        {
          icon: '🔧',
          title: 'Break-Fix Implementation',
          timeline: 'Day 2-5',
          description: 'Aggressive focus on unblocking your team and fixing critical bugs that prevent deployment or cause outages.',
          whatYouGet: [
            'Working PR/branch with critical fixes',
            'Up to 20 hours implementation',
            'Emergency hotfix deployment guide',
            'Quick smoke test suite',
          ],
        },
        {
          icon: '📋',
          title: 'Stabilization Roadmap',
          timeline: 'Day 6',
          description: 'Quick-hit list of remaining issues and next steps for continued stability.',
          whatYouGet: [
            'Post-triage roadmap',
            'Remaining critical issues',
            'Quick wins for next 2 weeks',
          ],
        },
        {
          icon: '🎤',
          title: 'Emergency Handoff',
          timeline: 'Day 7',
          description: '30-minute rapid walkthrough of fixes and immediate next steps.',
          whatYouGet: [
            'Quick walkthrough with recording',
            '14 days emergency support',
          ],
        },
      ],
    },
    {
      weeks: 2,
      name: 'Standard Rescue',
      price: 8500,
      timeline: '2 weeks',
      description: 'Comprehensive code health assessment with deeper fixes and more thorough documentation.',
      highlights: [
        '📊 Full codebase analysis',
        '✅ Top 10-15 critical fixes',
        '📈 Performance optimization',
        '🛡️ Security hardening'
      ],
      deliverables: [
        {
          icon: '📊',
          title: 'Comprehensive Code Audit',
          timeline: 'Days 1-3',
          description: 'In-depth analysis covering security, performance, architecture, and technical debt.',
          whatYouGet: [
            'Detailed Code Health Report (15-20 pages)',
            'Executive summary',
            'Critical issues breakdown',
            'Performance analysis',
            'Security audit',
            'Architecture review',
          ],
        },
        {
          icon: '✅',
          title: 'Extended Fixes Implementation',
          timeline: 'Days 4-9',
          description: 'Fix top 10-15 critical issues with focus on stability, security, and performance.',
          whatYouGet: [
            'Working PR/branch with fixes',
            'Comprehensive changelog',
            '10-minute video walkthrough',
            'Up to 35 hours implementation',
            'Unit test coverage improvements',
          ],
        },
        {
          icon: '📋',
          title: 'Detailed 90-Day Roadmap',
          timeline: 'Days 10-11',
          description: 'Comprehensive improvement plan with effort estimates and impact analysis.',
          whatYouGet: [
            'Prioritized roadmap document',
            'Quick wins (Weeks 1-4)',
            'Major refactors (Months 2-3)',
            'Architecture evolution plan',
            'Cost estimates for follow-on work',
          ],
        },
        {
          icon: '🎤',
          title: 'Full Knowledge Transfer',
          timeline: 'Days 12-14',
          description: '90-minute session with your team covering all findings, fixes, and recommendations.',
          whatYouGet: [
            'Live walkthrough with recording',
            'Developer guide (markdown)',
            '60 days email support',
            'Best practices documentation',
            'Code review checklist',
          ],
        },
      ],
    },
    {
      weeks: 3,
      name: 'Premium Rescue',
      price: 12000,
      timeline: '3 weeks',
      description: 'Complete transformation with extensive fixes, refactoring, testing, and team training.',
      highlights: [
        '🏗️ Architecture refactoring',
        '✨ Top 20+ fixes implemented',
        '🧪 Testing infrastructure',
        '👥 Team training included'
      ],
      deliverables: [
        {
          icon: '📊',
          title: 'Deep Architectural Audit',
          timeline: 'Week 1',
          description: 'Comprehensive analysis including architecture patterns, scalability, and long-term maintainability.',
          whatYouGet: [
            'Executive Code Health Report (25-30 pages)',
            'Full system architecture review',
            'Scalability analysis',
            'Tech stack assessment',
            'CI/CD pipeline review',
            'Performance profiling',
          ],
        },
        {
          icon: '✅',
          title: 'Extensive Implementation',
          timeline: 'Week 2-3 (Days 8-16)',
          description: 'Fix top 20+ issues plus architectural improvements, testing infrastructure, and documentation.',
          whatYouGet: [
            'Multiple PRs with categorized fixes',
            'Comprehensive changelog',
            '15-minute video walkthrough',
            'Up to 60 hours implementation',
            'Test coverage expansion',
            'CI/CD improvements',
          ],
        },
        {
          icon: '📋',
          title: 'Strategic 6-Month Roadmap',
          timeline: 'Days 17-18',
          description: 'Long-term strategic plan with phased approach and resource requirements.',
          whatYouGet: [
            'Strategic roadmap document',
            '6-month phased plan',
            'Team scaling recommendations',
            'Technology migration paths',
            'Full cost analysis',
          ],
        },
        {
          icon: '🎤',
          title: 'Team Training & Handoff',
          timeline: 'Days 19-21',
          description: 'Half-day training workshop plus comprehensive knowledge transfer.',
          whatYouGet: [
            '4-hour team training workshop',
            'Live walkthrough with recording',
            'Developer playbook',
            '90 days priority email support',
            'Code review guidelines',
            'Onboarding documentation',
          ],
        },
      ],
    },
  ];

  // Computed properties based on selected sprint
  protected get packagePrice(): number {
    const selected = this.sprintOptions.find(o => o.weeks === this.selectedSprint());
    return selected?.price || 5000;
  }

  protected get timeline(): string {
    const selected = this.sprintOptions.find(o => o.weeks === this.selectedSprint());
    return selected?.timeline || '1 week';
  }

  protected get upfrontPayment(): number {
    return this.packagePrice / 2;
  }

  protected get deliverables(): any[] {
    const selected = this.sprintOptions.find(o => o.weeks === this.selectedSprint());
    return selected?.deliverables || [];
  }

  protected readonly heroSection = {
    headline: 'AI Code Rescue Sprint',
    subheadline: 'Your AI-generated app works... kinda. Let\'s fix that.',
    description:
      'Transform your AI-assisted codebase from fragile prototype into production-ready code. Choose your urgency level.',
    ctaPrimary: { label: 'Book Your Sprint', href: '/contact' },
    ctaSecondary: { label: 'See Sample Report', href: '/blog/case-studies/sample-diagnostic-report' },
  };

  selectSprint(weeks: number): void {
    this.selectedSprint.set(weeks);
  }

  protected readonly idealFor = [
    {
      emoji: '🚀',
      title: 'Startup Founders',
      description: 'Built MVP with AI assistance and need professional stabilization before launch',
    },
    {
      emoji: '💼',
      title: 'Small Tech Teams',
      description: '"Vibe coded" a product and now need cleanup before scaling',
    },
    {
      emoji: '🏢',
      title: 'Enterprise Teams',
      description: 'Testing AI tools internally, need professional code review and security audit',
    },
    {
      emoji: '🔧',
      title: 'Agencies',
      description: 'Inherited messy AI-generated code from clients that needs immediate attention',
    },
  ];

  protected readonly painPoints = [
    '🚨 Production is down or unstable',
    '⚠️ Critical bugs blocking launch',
    '🔥 Code is on fire and team is stuck',
    '🐌 Performance is terrible',
    '🔒 Security vulnerabilities unknown',
    '😰 We\'re scared to deploy',
  ];

  protected get pricingDetails() {
    return {
      price: this.packagePrice,
      payment: {
        upfront: this.upfrontPayment,
        onDelivery: this.upfrontPayment,
      },
      timeline: this.timeline,
      effectiveRate: this.selectedSprint() === 1 ? '$125-150/hr' : this.selectedSprint() === 2 ? '$110-130/hr' : '$95-115/hr',
    };
  }

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
      description: 'Emergency response available - get unblocked in days, not weeks',
    },
    {
      icon: '💰',
      title: 'Fixed Price',
      description: 'No hourly billing surprises - transparent flat-rate pricing',
    },
    {
      icon: '🎯',
      title: 'Actionable Results',
      description: 'Clear roadmap with priorities and estimates for next steps',
    },
    {
      icon: '🔒',
      title: 'Security First',
      description: 'Identify and fix critical vulnerabilities before they become breaches',
    },
    {
      icon: '📈',
      title: 'Performance Boost',
      description: 'Optimize slow code and eliminate bottlenecks',
    },
    {
      icon: '🤝',
      title: 'Knowledge Transfer',
      description: 'Your team learns best practices and gains confidence',
    },
  ];

  protected readonly processSteps = [
    {
      step: '1',
      title: 'Book Your Sprint',
      description: 'Choose your urgency level and pay 50% upfront to secure your sprint slot',
    },
    {
      step: '2',
      title: 'Share Your Code',
      description: 'Grant us access to your repository - we sign NDAs and treat your code confidentially',
    },
    {
      step: '3',
      title: 'We Audit & Fix',
      description: 'Deep analysis, critical fixes, and roadmap creation based on your selected sprint tier',
    },
    {
      step: '4',
      title: 'Knowledge Transfer',
      description: 'Live walkthrough and handoff with ongoing support based on your sprint level',
    },
  ];

  protected readonly faq = [
    {
      question: 'How quickly can you start if we have an emergency?',
      answer:
        'For Emergency Rescue (1-week) sprints, we can often start within 24-48 hours. Standard and Premium sprints typically start within 1-2 weeks.',
    },
    {
      question: 'What if my codebase is really messy or broken?',
      answer:
        'That\'s exactly who this is for! We specialize in emergency code rescue and cleaning up AI-generated code. The messier it is, the more value you\'ll get. If you\'re facing production issues, choose the Emergency Rescue option.',
    },
    {
      question: 'What technologies do you support?',
      answer:
        'We cover all major frameworks: React, Vue, Angular, Node.js, Python, and more. If you have a specific stack, contact us to confirm.',
    },
    {
      question: 'What\'s the difference between the sprint levels?',
      answer:
        'Emergency (1 week) focuses on rapid triage and break-fix to unblock your team. Standard (2 weeks) provides comprehensive analysis and more fixes. Premium (3 weeks) includes architecture refactoring, testing infrastructure, and team training.',
    },
    {
      question: 'Can you implement all the fixes?',
      answer:
        'Each sprint tier includes different implementation hours: Emergency (20h), Standard (35h), Premium (60h). Additional fixes can be scoped as follow-on work using the roadmap we create.',
    },
    {
      question: 'What if I just want the audit?',
      answer:
        'We can do audit-only for $3K. This gives you the full code health report without the fixes or roadmap.',
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
