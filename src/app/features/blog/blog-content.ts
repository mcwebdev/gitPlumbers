export interface BlogCategory {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly heroHeading: string;
  readonly seoDescription: string;
  readonly keywords: ReadonlyArray<string>;
}

export interface InternalLink {
  readonly href: string;
  readonly anchor: string;
}

export interface CTA {
  readonly label: string;
  readonly href: string;
  readonly utm: string;
}

export interface Author {
  readonly name: string;
  readonly title?: string;
  readonly bio?: string;
  readonly url?: string;
}

export interface SchemaHints {
  readonly articleSection?: string;
  readonly aboutEntity?: 'GitPlumbers';
  readonly faqIsFAQPage?: boolean;
}

export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly deck: string;
  readonly categorySlug: string;
  readonly publishedOn: string; // ISO date for easier formatting
  readonly readTime: string;
  readonly summary: string;
  readonly body: ReadonlyArray<string>;
  readonly keyTakeaways: ReadonlyArray<string>;
  readonly checklist: ReadonlyArray<string>;
  readonly keywords: ReadonlyArray<string>;
  readonly heroQuote?: string;
  readonly faq?: ReadonlyArray<{ question: string; answer: string }>;
  readonly internalLinks?: ReadonlyArray<InternalLink>;
  readonly primaryCTA?: CTA;
  readonly secondaryCTA?: CTA;
  readonly author?: Author;
  readonly schemaHints?: SchemaHints;
  readonly createdAt?: string | Date;
  readonly updatedAt?: string | Date;
  readonly publishedOnMs?: number;
  readonly createdAtMs?: number;
  readonly updatedAtMs?: number;
  readonly seoMetadata?: {
    readonly title: string;
    readonly description: string;
    readonly ogTitle: string;
    readonly ogDescription: string;
    readonly ogImage: string;
    readonly twitterTitle: string;
    readonly twitterDescription: string;
    readonly twitterImage: string;
    readonly articleSection: string;
    readonly structuredDataArticle: Record<string, unknown>;
    readonly structuredDataFAQ?: Record<string, unknown>;
  };
}

export interface CaseStudy {
  readonly slug: string;
  readonly title: string;
  readonly client: string;
  readonly industry: string;
  readonly stack: ReadonlyArray<string>;
  readonly challenge: string;
  readonly approach: ReadonlyArray<string>;
  readonly outcomes: ReadonlyArray<string>;
  readonly metrics: ReadonlyArray<{ metric: string; label: string }>;
  readonly keywords: ReadonlyArray<string>;
  readonly summary: string;
}

export interface GuideSummary {
  readonly slug: string;
  readonly title: string;
  readonly level: 'starter' | 'advanced';
  readonly summary: string;
  readonly stack: string;
  readonly keywords: ReadonlyArray<string>;
  readonly checkpoints: ReadonlyArray<string>;
  readonly takeaways: ReadonlyArray<string>;
}

export const BLOG_CATEGORIES: ReadonlyArray<BlogCategory> = [
  {
    slug: 'guides',
    title: 'Technical Guides',
    description: 'Step-by-step playbooks for untangling legacy code and shipping stable releases.',
    heroHeading: 'Technical Guides built from hands-on modernization projects.',
    seoDescription:
      'Modernization playbooks, refactor checklists, and implementation patterns for senior platform engineers.',
    keywords: [
      'software modernization guides',
      'refactor playbook',
      'enterprise engineering processes',
      'technical debt reduction',
    ],
  },
  {
    slug: 'case-studies',
    title: 'Case Studies',
    description: 'Detailed breakdowns of GitPlumbers engagements and measurable outcomes.',
    heroHeading: 'Real modernization programs, transparent metrics.',
    seoDescription:
      'Engineering case studies covering risk triage, remediation plans, and measurable modernization impact.',
    keywords: [
      'software modernization case study',
      'legacy system remediation',
      'AI code stabilization results',
      'enterprise engineering outcomes',
    ],
  },
  {
    slug: 'culture',
    title: 'Culture & Process',
    description: 'Operational habits, rituals, and leadership frameworks that keep teams shipping.',
    heroHeading: 'High-performing engineering cultures do not happen by accident.',
    seoDescription:
      'Leadership frameworks and engineering rituals that accelerate modernization initiatives without firefighting.',
    keywords: [
      'engineering culture',
      'technical leadership',
      'process improvement',
      'devops rituals',
    ],
  },
  {
    slug: 'ai-delivery',
    title: 'AI in Production',
    description: 'Ship AI-assisted code safely with observability, guardrails, and accountability.',
    heroHeading: 'Turn AI prototypes into stable revenue-generating software.',
    seoDescription:
      'Guidance for leading AI-assisted development programs while keeping quality, compliance, and delivery velocity in check.',
    keywords: [
      'AI code production readiness',
      'AI-assisted development process',
      'software quality guardrails',
      'AI engineering leadership',
    ],
  },
];

export const BLOG_POSTS: ReadonlyArray<BlogPost> = [
  {
    slug: 'react-refactors-without-regressions',
    title: 'Shipping React Refactors Without Slowing Product Velocity',
    deck: 'Guardrails, sequencing, and communication cadences that let product and platform work ship together.',
    categorySlug: 'culture',
    publishedOn: '2025-08-12',
    readTime: '6 minute read',
    summary:
      'How we structure modernization sprints so roadmap commitments continue landing while the React foundation hardens.',
    body: [
      'Most teams inherit AI-assisted React codebases that got them through demos and fundraising, but begin to buckle once real usage arrives. The instinct is to pause roadmap delivery and rebuild from scratch. That decision usually costs credibility with customers and executives.',
      'We treat modernization as a parallel stream that earns trust sprint by sprint. Step one is stabilizing the perimeter: automated smoke tests around the most critical journeys, baseline performance telemetry, and a shared incident rubric so the entire org knows what "critical" means.',
      'With safety rails in place we cut the refactor into reversible slices. Components that block velocity are rewritten behind feature flags. Client state management migrates to predictable stores. Each merge includes visual regression coverage so product stakeholders see progress without fearing regressions.',
      'Communication keeps everything coherent. Platform updates land in asynchronous status notes, not surprise stand-ups. Engineers share before/after metrics so executive sponsors see modernization work as measurable value, not “tech for tech’s sake.”',
    ],
    keyTakeaways: [
      'Map the revenue-critical journeys before touching implementation details.',
      'Automate regression detection with a blend of contract, visual, and end-to-end checks.',
      'Refactor through reversible slices behind feature flags instead of long-running branches.',
    ],
    checklist: [
      'Catalog brittle journeys and document the business impact of failure.',
      'Ship a stabilization smoke pack that runs on every pull request.',
      'Share modernization status updates asynchronously with metrics, not adjectives.',
    ],
    keywords: [
      'React refactor strategy',
      'technical debt roadmap',
      'feature flag modernization',
      'React regression prevention',
    ],
    heroQuote:
      'Modernization succeeds when product leaders can point to numbers proving velocity improved, not slowed down.',
    faq: [
      {
        question: 'How do we decide which React components to refactor first?',
        answer:
          'Rank components by how often they block teams or cause incidents. Start with flows that carry revenue or compliance risk, then work outward based on measurable pain.',
      },
      {
        question: 'What metrics prove the refactor is paying off?',
        answer:
          'Track deploy frequency, mean time to recovery, and incident volume tied to the affected surfaces. Pair those with customer-facing telemetry such as conversion or churn signals.',
      },
    ],
  },
  {
    slug: 'technical-debt-audit-checklist',
    title: 'What We Look For During Technical Debt Audits',
    deck: 'A rigorous assessment template leaders can apply before committing to large remediation programs.',
    categorySlug: 'ai-delivery',
    publishedOn: '2025-07-03',
    readTime: '7 minute read',
    summary:
      'Debt audits anchor modernization plans in business outcomes. Here is the checklist we use to size risk and convert findings into a prioritised roadmap.',
    body: [
      'Any recommendation to spend six or seven figures on modernization must be grounded in evidence. Our audit framework inspects code health, delivery operations, observability, and product risk. Each dimension returns a color-coded score with a short explanation that executives can repeat.',
      'We start with repository analytics: contribution hotspots, file churn, flaky tests, and deployment history. Those signals reveal unstable areas before a single engineer reviews the code.',
      'Next comes dependency and architecture mapping. AI-assisted projects often hide duplicated services or unbounded data access. We chart blast radius and create impact heatmaps that product and engineering can review together.',
      'Finally, we quantify risk with hard numbers—incident frequency, regulatory obligations, customer escalations—and pair each remediation idea with a measurable definition of done.',
    ],
    keyTakeaways: [
      'Anchor every modernization recommendation in metrics executives recognise.',
      'Document the blast radius of fragile dependencies to guide sequencing.',
      'Translate technical findings into roadmap-ready remediation items.',
    ],
    checklist: [
      'Collect repo analytics: churn, hotspots, flaky tests, deployment frequency.',
      'Map external dependencies and data contracts with owners and SLAs.',
      'Define success criteria and business impact for the top remediation items.',
    ],
    keywords: [
      'technical debt audit',
      'legacy modernization assessment',
      'engineering risk report',
      'AI codebase due diligence',
    ],
  },
  {
    slug: 'angular-modernization-zones-to-signals',
    title: 'Angular Modernization: From Zones to Signals in 30 Days',
    deck: 'A focused, time-boxed plan to retire legacy patterns and unlock performance budgets.',
    categorySlug: 'guides',
    publishedOn: '2025-06-14',
    readTime: '5 minute read',
    summary:
      'Teams running legacy Angular stacks can adopt Signals and SSR without freezing delivery. We show how to stage the transition over four sprints.',
    body: [
      'Legacy Angular applications that lean on zone.js and sprawling NgRx stores often resist incremental change. Instead of flipping a single giant switch we tackle the modernization in four themed sprints.',
      'Sprint 1 isolates critical flows and hardens test coverage. Component contracts become explicit, analytics events are audited, and hydration blockers are catalogued.',
      'Sprint 2 introduces Signals for localised state. We replace brittle selector pyramids with focused computed state and push side effects to services.',
      'Sprint 3 prepares the rendering pipeline for SSR and fine-grained change detection. We remove global pipes, audit dependency injection, and verify accessibility now that components rerender predictably.',
      'Sprint 4 is about observability and load testing. We set up lab and field performance budgets, run the app through Web Vitals, and capture a final baseline that leadership can broadcast company-wide.',
    ],
    keyTakeaways: [
      'Treat modernization as themed sprints with explicit exit criteria.',
      'Introduce Signals around the most volatile UI state first.',
      'Back every refactor with lab and field telemetry so improvements stay visible.',
    ],
    checklist: [
      'Document SSR and hydration blockers before touching templates.',
      'Refactor shared state to Signals backed by typed contracts.',
      'Establish Web Vitals and performance budgets ahead of the final cutover.',
    ],
    keywords: [
      'Angular Signals migration',
      'Angular SSR modernization',
      'legacy Angular refactor plan',
      'Angular performance checklist',
    ],
  },
  {
    slug: 'observability-playbooks',
    title: 'Reducing Incident Volume With Observability Playbooks',
    deck: 'How senior platform teams align on SLOs, runbooks, and ownership without heroics.',
    categorySlug: 'culture',
    publishedOn: '2025-05-22',
    readTime: '5 minute read',
    summary:
      'Incident trends rarely change until teams agree on shared SLOs and codified runbooks. We break down the coaching scripts we use to get there.',
    body: [
      'Hero-driven operations fall apart once an organization scales beyond a few squads. Consistency requires shared vocabularies and lightweight playbooks.',
      'Start with service-level objectives drafted alongside product owners. Numbers without shared context just frustrate teams.',
      'Codify incident response by writing runbooks that link to dashboards, logging, and rollback procedures. Make the playbook the shortest path to action.',
      'Finally, rehearse. Chaos drills, failover simulations, and tabletop exercises build muscle memory and expose weak signals before customers feel them.',
    ],
    keyTakeaways: [
      'SLOs only stick when product, platform, and support define them together.',
      'Runbooks should be the fastest way to find dashboards, logs, and owners.',
      'Practice failure regularly so humans trust the automation when an outage hits.',
    ],
    checklist: [
      'Draft SLOs and error budgets with product partners and publish them broadly.',
      'Link every alert to an owner, dashboard, and rollback process.',
      'Schedule quarterly chaos exercises with post-mortems focused on signals and tooling.',
    ],
    keywords: [
      'observability playbook',
      'incident response process',
      'SLO coaching',
      'chaos engineering drills',
    ],
  },
];

export const FEATURED_POST_SLUGS: ReadonlyArray<string> = [
  'react-refactors-without-regressions',
  'technical-debt-audit-checklist',
  'angular-modernization-zones-to-signals',
];

export const CASE_STUDIES: Record<string, CaseStudy> = {
  'healthcare-angular-modernization': {
    slug: 'healthcare-angular-modernization',
    title: 'Stabilising A Healthcare Angular Monolith',
    client: 'Meridian Health',
    industry: 'Healthcare Platform',
    stack: ['Angular', 'NgRx', '.NET', 'Azure'],
    challenge:
      'An AI-generated Angular application powered compliance workflows but shipped regressions with every release, forcing quarterly code freezes.',
    approach: [
      'Mapped the dependency graph and prioritised brittle modules blocking regulatory launches.',
      'Replaced zone-heavy state management with Signals and component stores to reduce change detection thrash.',
      'Built a CI/CD guardrail suite with smoke packs, contract tests, and accessibility snapshots.',
      'Implemented staged rollouts with feature flags tied to observability dashboards for instant rollback.',
    ],
    outcomes: [
      'Release cadence moved from quarterly to bi-weekly without incident spikes.',
      'P1 defect volume dropped by 72% across clinical intake workflows.',
      'Compliance backlog cleared four weeks ahead of the audit deadline.',
    ],
    metrics: [
      { metric: '72%', label: 'fewer production incidents after guardrails were deployed.' },
      { metric: '4x', label: 'increase in deploy frequency without expanding the team.' },
      { metric: '0', label: 'regulatory violations during the next audit cycle.' },
    ],
    keywords: [
      'healthcare Angular modernization',
      'clinical platform refactor',
      'Signals migration success',
      'regulated software reliability',
    ],
    summary:
      'Meridian Health partnered with GitPlumbers to stabilise a compliance-critical Angular platform. By addressing state management, testing, and rollout discipline in parallel, the team eliminated emergency freezes and hit every audit milestone.',
  },
  'react-platform-scaling': {
    slug: 'react-platform-scaling',
    title: 'Scaling A Multi-tenant React Platform',
    client: 'Northstar Systems',
    industry: 'SaaS Infrastructure',
    stack: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    challenge:
      'Enterprise tenants overloaded the AI scaffold that powered a React control plane, causing cold starts, memory leaks, and fractured delivery cadences.',
    approach: [
      'Instrumented tenant-specific performance telemetry and created persona heatmaps for load testing.',
      'Split the monolith into federated modules with a shared design system and versioned contracts.',
      'Introduced progressive delivery with automated rollbacks, synthetic checks, and guardrail alerts.',
    ],
    outcomes: [
      'Cut cold start latency by 68% and steadied p95 response times during peak usage.',
      'Enabled parallel squad delivery with isolated pipelines and contract testing.',
      'Enterprise NPS climbed 18 points within two release cycles.',
    ],
    metrics: [
      { metric: '68%', label: 'reduction in cold start latency for premium tenants.' },
      { metric: '18pt', label: 'increase in enterprise NPS after the rollout.' },
      { metric: '100%', label: 'of releases shipped with automated rollback coverage.' },
    ],
    keywords: [
      'React platform modernization',
      'module federation case study',
      'enterprise SaaS scaling',
      'progressive delivery React',
    ],
    summary:
      'Northstar Systems engaged GitPlumbers to stabilise a federated React platform. The team combined telemetry, module federation, and progressive delivery to unlock tenant growth without compromising reliability.',
  },
  'vue-laravel-modernization': {
    slug: 'vue-laravel-modernization',
    title: 'Modernising A Vue + Laravel Operations Suite',
    client: 'Copperline Logistics',
    industry: 'Logistics & Supply Chain',
    stack: ['Vue', 'Laravel', 'PostgreSQL', 'GCP'],
    challenge:
      'Operational tooling built with AI pair programming accumulated conflicting UX patterns and brittle workflows that slowed fulfilment.',
    approach: [
      'Audited UX debt, accessibility gaps, and duplicated APIs across the suite.',
      'Implemented a design system with story-driven development and snapshot coverage.',
      'Staged the migration of critical workflows to new services backed by progressive data migrations.',
    ],
    outcomes: [
      'Maintained 99.98% uptime during the entire migration programme.',
      'Support tickets tied to workflow confusion dropped by 61%.',
      'New engineers onboarded twice as fast thanks to consistent patterns.',
    ],
    metrics: [
      { metric: '99.98%', label: 'uptime maintained during phased releases.' },
      { metric: '61%', label: 'reduction in support requests tied to workflow errors.' },
      { metric: '2x', label: 'faster onboarding for new engineers into the platform.' },
    ],
    keywords: [
      'Vue modernization case study',
      'Laravel upgrade strategy',
      'design system implementation',
      'logistics software reliability',
    ],
    summary:
      'Copperline Logistics needed to modernise a mission-critical Vue and Laravel platform without disrupting daily fulfilment. GitPlumbers established cohesive UX patterns, automated regression barriers, and executed staged migrations that kept operations live.',
  },
};

export const GUIDES: Record<string, GuideSummary> = {
  'react-production-hardening-guide': {
    slug: 'react-production-hardening-guide',
    title: 'Production Hardening AI-Generated React Apps',
    level: 'starter',
    summary:
      'An actionable playbook covering audit checkpoints, remediation tactics, and communication plans for React teams inheriting AI-generated code.',
    stack: 'React, TypeScript, Vite, Playwright',
    keywords: [
      'React production readiness',
      'AI generated React cleanup',
      'React audit checklist',
      'frontend hardening playbook',
    ],
    takeaways: [
      'Baseline bundle, runtime, and UX regressions before touching refactors.',
      'Stabilise CI pipelines with smoke, contract, and visual coverage.',
      'Sequence component rewrites in customer-facing priority order.',
    ],
    checkpoints: [
      'Performance budgets defined with shared dashboards.',
      'Accessibility and visual regression checks automated in CI.',
      'Session replay and tracing connected to critical user flows.',
    ],
  },
  'angular-modernization-playbook': {
    slug: 'angular-modernization-playbook',
    title: 'Angular Modernization Playbook',
    level: 'advanced',
    summary:
      'Signals-first state management, zoneless rendering, and module boundaries that let Angular teams evolve without rewrites.',
    stack: 'Angular, Signals, Nx, Cypress',
    keywords: [
      'Angular signals playbook',
      'Angular modernization checklist',
      'enterprise Angular strategy',
      'Angular SSR migration',
    ],
    takeaways: [
      'Audit zones, change detection triggers, and monolithic modules before restructuring.',
      'Refactor to Signals alongside typed API contracts and performance instrumentation.',
      'Roll out SSR with confidence thanks to progressive hydration and guardrail tests.',
    ],
    checkpoints: [
      'SSR smoke tests covering critical journeys.',
      'Lazy loaded routes share typed contracts and analytics events.',
      'Performance budgets enforced via automated CI reports.',
    ],
  },
  'node-reliability-blueprint': {
    slug: 'node-reliability-blueprint',
    title: 'Node.js Reliability Blueprint',
    level: 'starter',
    summary:
      'Bring observability, SLOs, and chaos discipline to AI-assembled Node.js services.',
    stack: 'Node.js, OpenTelemetry, AWS Lambda, Datadog',
    keywords: [
      'Node.js reliability',
      'observability blueprint',
      'serverless hardening',
      'AI generated backend cleanup',
    ],
    takeaways: [
      'Introduce structured logging and tracing across services.',
      'Define error budgets and escalation runbooks with product leadership.',
      'Automate load, chaos, and failover drills to prove resilience.',
    ],
    checkpoints: [
      'Latency, saturation, and error SLOs tracked in shared dashboards.',
      'Zero-downtime deploys validated with synthetic traffic.',
      'Runbooks linked directly to alerts with clear ownership.',
    ],
  },
  'python-platform-upgrade': {
    slug: 'python-platform-upgrade',
    title: 'Python Platform Upgrade Companion',
    level: 'advanced',
    summary:
      'Navigate async refactors, dependency isolation, and data migrations without pausing delivery.',
    stack: 'Python, FastAPI, Postgres, Terraform',
    keywords: [
      'Python platform upgrade',
      'async migration plan',
      'Python modernization checklist',
      'data migration guardrails',
    ],
    takeaways: [
      'Isolate dependencies with layered containers and virtual environments.',
      'Grow type coverage and contract tests before introducing async refactors.',
      'Stage schema migrations with rehearsal environments and rollback options.',
    ],
    checkpoints: [
      'Async workloads reach parity benchmarks with legacy workers.',
      'Observability dashboards monitor CPU, memory, and I/O across environments.',
      'Cutover plans rehearsed with dry runs and clear rollback procedures.',
    ],
  },
};

export function getCategoryBySlug(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES.find((category) => category.slug === slug);
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getPostsByCategory(slug: string): ReadonlyArray<BlogPost> {
  return BLOG_POSTS.filter((post) => post.categorySlug === slug);
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES[slug];
}

export function getGuideBySlug(slug: string): GuideSummary | undefined {
  return GUIDES[slug];
}
