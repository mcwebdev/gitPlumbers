import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';

type ServiceSlug =
  | 'modernization'
  | 'observability'
  | 'ai-delivery'
  | 'reliability'
  | 'platform';

interface ServiceSummary {
  title: string;
  slug: ServiceSlug;
  description: string;
  features: string[];
  frameworks: string[];
  linkLabel: string;
}

interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  protected readonly services: ReadonlyArray<ServiceSummary> = [
    {
      slug: 'modernization',
      title: 'Modernization Assessments',
      description: 'Modernize legacy applications without slowing roadmap delivery.',
      features: [
        'Codebase assessments grounded in production telemetry',
        'Modernization roadmaps that respect product commitments',
        'Architecture coaching for safe framework upgrades',
        'Knowledge transfer plans that stick',
      ],
      frameworks: ['Angular', 'React', 'Vue', 'Node.js', 'Python'],
      linkLabel: 'Explore modernization services',
    },
    {
      slug: 'observability',
      title: 'Observability and Release Health',
      description: 'Keep every release accountable with SLIs, dashboards, and guardrails.',
      features: [
        'Golden signals mapped to customer journeys',
        'Automated release health dashboards and alerting',
        'SLO design with error budget policy coaching',
        'Rollback and kill-switch runbooks',
      ],
      frameworks: ['OpenTelemetry', 'Grafana', 'Prometheus', 'Datadog', 'New Relic'],
      linkLabel: 'Explore observability services',
    },
    {
      slug: 'ai-delivery',
      title: 'AI Delivery Guardrails',
      description: 'Ship AI-assisted code with policy-aware pipelines and runtime checks.',
      features: [
        'Policy-aware CI/CD workflows for AI-generated code',
        'Shadow deploys and staged rollouts with health gates',
        'Automated regression, drift, and compliance checks',
        'Kill-switch and rollback tooling wired to telemetry',
      ],
      frameworks: ['GitHub Actions', 'Azure DevOps', 'LaunchDarkly', 'Cloudflare', 'Kubernetes'],
      linkLabel: 'Explore AI delivery services',
    },
    {
      slug: 'reliability',
      title: 'Reliability Engineering',
      description: 'Evolve incident response, error budgets, and on-call health.',
      features: [
        'Reliability assessments across architecture and operations',
        'Error budget policy definition and rollout',
        'Incident response coaching with runbook upgrades',
        'Capacity, chaos, and performance testing',
      ],
      frameworks: ['PagerDuty', 'Grafana', 'Honeycomb', 'SLO tooling', 'Kubernetes'],
      linkLabel: 'Explore reliability services',
    },
    {
      slug: 'platform',
      title: 'Platform Engineering',
      description: 'Build paved roads that unblock every product team.',
      features: [
        'Developer platform assessments and friction audits',
        'Golden path design for deployments and observability',
        'Self-service environment automation',
        'Adoption metrics and enablement programs',
      ],
      frameworks: ['Backstage', 'Terraform', 'Helm', 'Pulumi', 'AWS | GCP | Azure'],
      linkLabel: 'Explore platform services',
    },
  ];

  protected readonly processSteps: ReadonlyArray<ProcessStep> = [
    {
      step: '01',
      title: 'Code Assessment',
      description: 'Comprehensive analysis of your codebase to identify optimization opportunities',
    },
    {
      step: '02',
      title: 'Strategy Development',
      description: 'Custom optimization strategy tailored to your specific needs and constraints',
    },
    {
      step: '03',
      title: 'Implementation',
      description: 'Expert execution of optimization plan with continuous progress updates',
    },
    {
      step: '04',
      title: 'Knowledge Transfer',
      description: 'Complete documentation.',
    },
  ];

  ngOnInit(): void {
    this._seoService.updateMetadata({
      title: 'Code Optimization Services | React, Angular, Vue, Node.js Experts',
      description:
        'Comprehensive code optimization services for React, Angular, Vue, Node.js, and Python. Enterprise modernization, technical debt resolution, and performance optimization.',
      keywords:
        'code optimization services, React optimization, Angular performance, Vue.js consulting, Node.js scaling, Python modernization',
      ogUrl: 'https://gitplumbers.com/services/',
    });
  }
}

