import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  ngOnInit(): void {
    this._seoService.updateMetadata(this._seoService.getHomePageMetadata());
  }
  protected readonly currentYear = new Date().getFullYear();

  protected readonly heroCtas: ReadonlyArray<{
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
  }> = [{ label: 'Share Your Code and Book an audit', href: '/contact', variant: 'primary' }];
  protected readonly heroAnchors = [
    { label: 'Services', href: '#services' },
    { label: 'Proof', href: '#proof' },
    { label: 'Approach', href: '#process' },
  ];

  protected readonly differentiators = [
    {
      title: 'Full-Stack Team Assembly',
      description:
        'We curate the perfect team of specialists for your specific technology stack and challenges.',
    },
    {
      title: 'Enterprise Application Modernization',
      description:
        'Scale-critical systems refactored and modernized by our network of senior experts.',
    },
    {
      title: 'Cross-Framework Expertise',
      description:
        'React, Vue, Angular, Node.js, Python - we bring the right expert for each technology.',
    },
    {
      title: 'End-to-End Project Delivery',
      description:
        'From architecture planning to deployment, our specialist teams handle complete transformations.',
    },
  ];

  protected readonly valuePillars = [
    {
      title: 'Curated Expert Network',
      copy: 'Access senior-level specialists across all major frameworks without the overhead of full-time hiring.',
    },
    {
      title: 'Scalable Team Assembly',
      copy: 'From solo code reviews to full transformation teams - we scale our expertise to match your needs.',
    },
    {
      title: 'Quality-First Delivery',
      copy: 'Every specialist in our network is vetted for technical excellence and client communication skills.',
    },
  ];

  protected readonly proofPoints = [
    { metric: '70%', subcopy: 'delivery velocity increase after de-risking legacy services.' },
    {
      metric: '12x',
      subcopy: 'faster incident resolution with proactive observability dashboards.',
    },
    { metric: '99.98%', subcopy: 'uptime maintained during complex modernization programs.' },
  ];

  protected readonly calloutCard = {
    hook: 'Your AI-built app works… kinda, but under the hood it’s a time bomb.',
    benefit: 'From Vibe Code Chaos to Clean, Scalable Apps.',
    subheading: 'Untangle, optimize, and stabilize AI-assisted codebases so you can:',
    points: [
      'Ship faster without constant bugs',
      'Keep costs down by cutting bloat',
      'Scale confidently without burning everything down later',
    ],
  };

  protected readonly process = [
    {
      title: 'Diagnose',
      body: 'Deep codebase review, dependency heatmaps, and risk scoring to surface what is clogging flow.',
    },
    {
      title: 'Stabilize',
      body: 'Parallelized remediation sprints, automated regression barriers, and guardrailed releases.',
    },
    {
      title: 'Accelerate',
      body: 'Co-create modern architectures, developer workflows, and knowledge-sharing systems that enable durable, high-velocity innovation.',
    },
  ];

  protected readonly testimonials = [
    {
      quote:
        'They walked into a six-year-old AngularJS monolith and shipped a clean, zoneless, SSR-ready platform in eight weeks.',
      author: 'Avery Chen',
      title: 'VP of Engineering, Northstar Systems',
    },
    {
      quote:
        'Our compliance launches were on fire. gitPlumbers rebuilt the CI/CD flow and caught regressions before they hit prod.',
      author: 'Lionel Briggs',
      title: 'CTO, Meridian Health',
    },
  ];
}
