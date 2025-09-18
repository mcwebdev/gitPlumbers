import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
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
      title: 'Enterprise Application Development',
      description: 'Scale-critical systems refactored and modernized to move at startup speed.',
    },
    {
      title: 'Advanced Data Visualization',
      description: 'Translate tangled data into boardroom-ready narratives and dashboards.',
    },
    {
      title: 'AI Interfaces',
      description:
        'Facial recognition, Body Pix AI, and voice flows for human-centered experiences.',
    },
    {
      title: 'Web3 & Blockchain',
      description: 'Ship smart contracts and decentralized tools with auditable reliability.',
    },
  ];

  protected readonly valuePillars = [
    {
      title: 'Tech debt triage',
      copy: 'We stabilize fragile pipelines fast, with zero-downtime refactors and chaos-free deployments.',
    },
    {
      title: 'Bug resolution at scale',
      copy: 'War rooms on autopilot. We automate observability and shrink MTTR with proven playbooks.',
    },
    {
      title: 'Pull Request Code Reviews',
      copy: 'We review your pull requests and provide feedback to help you ship faster and with less bugs.',
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


