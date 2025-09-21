import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

type ServiceSlug =
  | 'modernization'
  | 'observability'
  | 'ai-delivery'
  | 'reliability'
  | 'platform';

interface ServiceDetailContent {
  title: string;
  subtitle: string;
  summary: string;
  focusAreas: string[];
  outcomes: string[];
  playbook: string[];
  ctas: Array<{ label: string; routerLink: string; ariaLabel: string }>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

const SERVICE_DETAILS: Record<ServiceSlug, ServiceDetailContent> = {
  modernization: {
    title: 'Modernization Assessments',
    subtitle: 'Refactor legacy code without halting feature delivery.',
    summary:
      'We help engineering leaders modernize critical systems in safe, iterative phases backed by hard data on risk, cost, and stakeholder priorities.',
    focusAreas: [
      'High-signal codebase assessments rooted in runtime and repo analytics',
      'Roadmaps that sequence modernization against product commitments',
      'Architecture coaching to phase monolith extraction or framework upgrades',
    ],
    outcomes: [
      'Confident investment case for modernizing core applications',
      'Execution playbooks that keep customer-facing delivery on track',
      'Healthy developer experience with clear guardrails for new work',
    ],
    playbook: [
      'Week 1: Deep-dive into architecture hotspots, delivery metrics, and staffing constraints.',
      'Week 2: Pilot refactors that prove out performance and reliability gains.',
      'Week 3: Partner with your teams to operationalize standards, CI changes, and knowledge transfer.',
    ],
    ctas: [
      {
        label: 'Book a modernization assessment',
        routerLink: '/contact',
        ariaLabel: 'Book a modernization assessment with GitPlumbers',
      },
      {
        label: 'See our modernization results',
        routerLink: '/case-studies',
        ariaLabel: 'Review GitPlumbers modernization case studies',
      },
    ],
    seo: {
      title: 'Software Modernization Services | GitPlumbers',
      description:
        'Modernize legacy codebases with incremental roadmaps, architecture coaching, and measurable performance improvements.',
      keywords: [
        'software modernization',
        'legacy system refactor',
        'angular upgrade',
        'react modernization',
        'enterprise architecture transformation',
      ],
    },
  },
  observability: {
    title: 'Observability and Release Health',
    subtitle: 'Ship AI-assisted code safely with production evidence.',
    summary:
      'We instrument the signals that keep leadership confident: golden metrics, customer journeys, and guardrails to halt bad releases before customers notice.',
    focusAreas: [
      'Instrumentation plans that balance cost with actionable telemetry',
      'SLIs and SLOs that align engineering dashboards with business outcomes',
      'Playbooks for incident response, rollback, and recovery drills',
    ],
    outcomes: [
      'Faster incident detection with unified dashboards for engineering and product',
      'Release readiness gates that stop regressions before full rollout',
      'Teams that treat observability as development, not on-call cleanup',
    ],
    playbook: [
      'Sprint 1: Map critical paths, define SLIs, and deploy tracing plus runtime analytics.',
      'Sprint 2: Automate release health reporting with golden dashboards and alert policies.',
      'Sprint 3: Run game-day scenarios to validate rollback, kill-switches, and runbooks.',
    ],
    ctas: [
      {
        label: 'Explore our observability services',
        routerLink: '/contact',
        ariaLabel: 'Talk to GitPlumbers about observability services',
      },
      {
        label: 'See our success stories',
        routerLink: '/case-studies',
        ariaLabel: 'Review GitPlumbers case studies',
      },
    ],
    seo: {
      title: 'Observability Services for Modern Engineering Teams | GitPlumbers',
      description:
        'Instrument release health, establish actionable SLIs, and keep AI delivery accountable with GitPlumbers observability engagements.',
      keywords: [
        'observability consulting',
        'release health dashboards',
        'slo implementation',
        'ai delivery guardrails',
        'incident response playbooks',
      ],
    },
  },
  'ai-delivery': {
    title: 'AI Delivery Guardrails',
    subtitle: 'Launch AI-assisted features with safety rails and accountability.',
    summary:
      'We harden AI delivery pipelines with gated environments, policy enforcement, and runtime checks that keep product velocity high without compromising trust.',
    focusAreas: [
      'Policy-aware CI/CD pipelines that validate AI-generated code',
      'Shadow deployments and staged rollouts tied to real-time telemetry',
      'Kill-switch and rollback patterns that protect customer experience',
    ],
    outcomes: [
      'Predictable AI feature launches with measurable risk reduction',
      'Shared visibility into AI contributions across product, legal, and engineering teams',
      'Sustainable delivery workflows that blend automation with human review',
    ],
    playbook: [
      'Phase 1: Assess AI-assisted workflows, compliance requirements, and existing guardrails.',
      'Phase 2: Deploy gated pipelines with policy enforcement, drift detection, and audit trails.',
      'Phase 3: Coach teams on operating runbooks, kill-switch tooling, and metrics reviews.',
    ],
    ctas: [
      {
        label: 'Schedule an AI delivery review',
        routerLink: '/contact',
        ariaLabel: 'Schedule an AI delivery consultation with GitPlumbers',
      },
      {
        label: 'Explore AI delivery resources',
        routerLink: '/guides',
        ariaLabel: 'Explore GitPlumbers AI delivery guides',
      },
    ],
    seo: {
      title: 'AI Delivery Guardrails & Governance | GitPlumbers',
      description:
        'Codify rollback plans, kill-switches, and compliance guardrails for AI-assisted software delivery.',
      keywords: [
        'ai delivery governance',
        'ai guardrails',
        'rollback automation',
        'kill switch design',
        'compliance for ai products',
      ],
    },
  },
  reliability: {
    title: 'Reliability Engineering',
    subtitle: 'Keep availability high without burning out your teams.',
    summary:
      'From incident retrospectives to capacity planning, we build reliability programs that pair automation with accountable ownership.',
    focusAreas: [
      'Reliability audits that surface systemic risks in architecture and operations',
      'Error budget policies that protect innovation while honoring SLAs',
      'Service ownership models with pragmatic on-call rotations and playbooks',
    ],
    outcomes: [
      'Confidence in uptime commitments backed by real performance data',
      'Teams that know exactly when to ship, slow down, or roll back',
      'Happier on-call engineers with clear runbooks and escalation paths',
    ],
    playbook: [
      'Stage 1: Baseline service health, incident volume, and on-call experience.',
      'Stage 2: Establish error budgets, reliability roadmaps, and automated safeguards.',
      'Stage 3: Coach engineering leaders on sustaining healthy reliability culture.',
    ],
    ctas: [
      {
        label: 'Discover reliability solutions',
        routerLink: '/contact',
        ariaLabel: 'Contact GitPlumbers for reliability solutions',
      },
      {
        label: 'Read our reliability case studies',
        routerLink: '/case-studies',
        ariaLabel: 'Read GitPlumbers reliability case studies',
      },
    ],
    seo: {
      title: 'Site Reliability Engineering Services | GitPlumbers',
      description:
        'Operationalize SRE practices, error budgets, and incident response runbooks with GitPlumbers reliability programs.',
      keywords: [
        'site reliability engineering',
        'sre consulting',
        'error budget policy',
        'incident response playbook',
        'reliability assessment',
      ],
    },
  },
  platform: {
    title: 'Platform Engineering',
    subtitle: 'Build paved roads that speed up every product team.',
    summary:
      'We partner with platform leads to create reusable infrastructure, golden paths, and internal platforms that accelerate delivery across the company.',
    focusAreas: [
      'Developer platform audits that identify friction across environments and tooling',
      'Golden path design for deploying services, observability, and compliance controls',
      'Internal platform roadmaps with adoption metrics and stakeholder alignment',
    ],
    outcomes: [
      'Streamlined developer onboarding with fast, self-service environments',
      'Standardized delivery pipelines that keep security and compliance satisfied',
      'Meaningful platform adoption measured in cycle time and deployment frequency',
    ],
    playbook: [
      'Discovery: Interview teams, map workflows, and catalog platform capabilities.',
      'Design: Prototype golden paths, shared services, and support models.',
      'Ship: Roll out tooling with enablement, migration guides, and success metrics.',
    ],
    ctas: [
      {
        label: 'Talk with our platform leads',
        routerLink: '/contact',
        ariaLabel: 'Contact GitPlumbers platform engineering team',
      },
      {
        label: 'Explore platform guides',
        routerLink: '/guides',
        ariaLabel: 'Explore GitPlumbers platform engineering guides',
      },
    ],
    seo: {
      title: 'Platform Engineering Services | GitPlumbers',
      description:
        'Design internal platforms, golden paths, and developer efficiency programs with GitPlumbers platform engineering experts.',
      keywords: [
        'platform engineering',
        'developer experience',
        'internal developer platform',
        'golden path design',
        'devops transformation',
      ],
    },
  },
};

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceDetailComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _seo = inject(SeoService);

  private readonly _slug = toSignal(
    this._route.paramMap.pipe(
      map((params) => params.get('slug') as ServiceSlug | null)
    ),
    { initialValue: null }
  );

  protected readonly detail = computed(() => {
    const slug = this._slug();
    if (!slug) return null;
    return SERVICE_DETAILS[slug] ?? null;
  });

  protected readonly slug = computed(() => this._slug());

  constructor() {
    effect(() => {
      const slug = this._slug();
      if (!slug) {
        return;
      }

      const detail = SERVICE_DETAILS[slug];
      if (!detail) {
        this._router.navigate(['/services']);
        return;
      }

      this._seo.updateMetadata({
        title: detail.seo.title,
        description: detail.seo.description,
        keywords: detail.seo.keywords,
        ogUrl: `https://gitplumbers.com/services/${slug}`,
      });
    });
  }
}