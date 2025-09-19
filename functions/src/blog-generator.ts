import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import type { Firestore } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const BLOG_COLLECTION = 'blog_posts';

const BASELINE_POST_TITLES: ReadonlyArray<string> = [
  'Shipping React Refactors Without Slowing Product Velocity',
  'What We Look For During Technical Debt Audits',
  'Angular Modernization: From Zones to Signals in 30 Days',
  'Reducing Incident Volume With Observability Playbooks',
  'The Hidden Interest on Your Tech Debt: How to Calculate It (and Stop Paying)',
  'From Firefighting to Flow: A Practical Playbook for Operational Calm',
  'Shipping With Confidence: Release Practices That Don’t Break Fridays',
  'The Tech-Debt Triage Guide: What to Fix Now vs. Later',
  'Sustainable Velocity: Guardrails That Let Teams Move Fast Safely',
  'Legacy Systems, Modern Outcomes: A Stepwise Modernization Blueprint',
  'How to Make Incident Reviews Actually Reduce Incidents',
  'Refactors That Pay for Themselves: Finding ROI in the Codebase',
  'Stop the Bleed: Stabilization Sprints That Stick',
  'The Architecture Debt Snowball: Unwinding Years in Weeks',
  'Observability First: Dashboards That Change Behavior, Not Just Charts',
  'Developer Experience as a Reliability Strategy',
  'Risk-Scoped Roadmaps: De-Risk Quarter by Quarter',
  'The Minimal-Change Modernization Pattern',
  'Code Smells vs. Systemic Risk: Knowing the Difference',
  'Automated Regression Barriers: Your Safety Net for Bold Changes',
  'Release Health North Stars: What to Measure, What to Ignore',
  'Feature Flags Without Chaos: Governance for Controlled Rollouts',
  'When to Delete Code: The Courageous Clean-Up Manual',
  'The Cost of Vibe Coding: Real Metrics From Real Teams',
  'Scaling Without a Rewrite: Strangler-Fig Tactics That Work',
  'Dependency Heatmaps: See Risk Like a CTO',
  'Operational Runbooks That Don’t Rot',
  'SLIs, SLOs, and SLA Reality: Aligning Reliability With Business',
  'De-Clog Your CI/CD: Pipeline Latency and Flake Reduction',
  'Monolith, Modular, or Microservices: Choosing for Throughput',
  'How to Kill Flaky Tests for Good',
  'The 90-Day Stability Program for Product Teams',
  'Backlogs That Reduce Risk: Prioritization for Flow',
  'The Incident Zero Illusion: Aim for Fast Recovery Instead',
  'The Tech Debt Ledger: Make Invisible Work Visible',
  'Refactoring With Feature Parity: A Step-by-Step Approach',
  'Operational Calm for AI-Assisted Codebases',
  'Guardrails for AI-Generated PRs: Quality Without Slowing Down',
  'Modernization Without Downtime: Patterns for High-Uptime Teams',
  'What ‘Done’ Means in Modernization Projects',
  'The First 10 Days in a Messy Codebase',
  'From Tribal Knowledge to Shared Wisdom: Documentation That Lives',
  'The Postmortem You’ll Actually Read Next Quarter',
  'SLAs That Don’t Handcuff Innovation',
  'Tech Debt Budgeting: A CFO-Friendly Framework',
  'Flow Mapping: Unblocking Your Delivery Value Stream',
  'Service Ownership Without Overload',
  'Runtime Errors as Product Risk: Aligning Engineering and PM',
  'Refactor Readiness: Signals Your Codebase Is Safe to Change',
  'The Stability-First Roadmap for Startups',
  'Reducing MTTR With Better On-Call Ergonomics',
  'Modern Testing Pyramids for Fast-Moving Teams',
  'Platform Thinking for Small Teams: Just Enough Platform',
  'Risk-Driven Code Reviews: What to Look For, What to Skip',
  'The Business Case for Paying Down Tech Debt Now',
  'Release Checklists That Scale With Your Team',
  'How to Introduce Observability Without a Big Bang',
  'From Chaos PRs to Clean Merges: PR Hygiene That Works',
  'Architectures That Forgive: Designing for Failure',
  'Telemetry-Driven Refactors: Let Data Pick the Next Move',
  'Your AI-Built App Works… Until It Doesn’t: Stabilization Tactics',
  'Operational KPIs That Predict Incidents',
  'The Senior Engineer’s Guide to Unblocking Junior Velocity',
  'Stakeholder Trust in 30 Days: Communication That Calms',
  'De-Risking Migrations: Shadow Traffic and Progressive Cutovers',
  'The Maintenance Sprint: How to Keep the Lights Bright',
  'Security-First Delivery Without Slowing Down',
  'Accessibility Debt: Ship Faster by Fixing It Early',
  'When to Centralize vs. Federate Architecture Decisions',
  'Code Reviews at Scale: Patterns for High-Throughput Teams',
  'The Anatomy of a Great Runbook',
  'Incident Simulations: Fire Drills That Prevent Real Fires',
  'Modernizing Data Flows Without Breaking Analytics',
  'Choosing the Right Observability Stack for Your Stage',
  'How to Keep Uptime at 99.98% During Big Changes',
  'Refactor vs. Rewrite: A Decision Tree for Leaders',
  'Killing the ‘Works on My Machine’ Anti-Pattern',
  'Five Stabilization Wins You Can Ship This Week',
  'Making Dashboards Actionable: From Pretty to Practical',
  'API Evolution Without Customer Pain',
  'From Heroics to Habits: Institutionalizing Reliability',
  'How to Audit a Codebase in 48 Hours',
  'The “Thin Slice” Method for Safer Modernization',
  'Release Notes Your Customers Actually Trust',
  'Tech Debt and Team Morale: Fix One, Help the Other',
  'Roadmap Risk Reviews: Keep Surprises Out of Q4',
  'Operational Readiness for Product Launches',
  'Turn On-Call Into a Source of Insight, Not Burnout',
  'The First Principles of Clean, Scalable Apps',
  'Guardrailed Releases: Shipping Bold Changes Safely',
  'The Playbook for Parallelized Remediation Sprints',
  'Preventing Drift: Keeping Architecture Diagrams True',
  'Why Your Test Suite Is Slow—and How to Fix It',
  'Codifying Institutional Knowledge With ADRs',
  'The Metrics That Matter for Delivery Velocity',
  'CI/CD for Humans: Pipelines That Don’t Punish',
  'How to De-Risk Third-Party Dependencies',
  'Operational Calm for Peak Season Traffic',
  'The Executive’s Guide to Modernization Without Drama',
  'From Proof-of-Concept to Production: Hardening the Path',
  'Taming Complexity: Simplification as a Strategy',
  'Resilience by Design: Building Systems That Heal Themselves',
  'The gitPlumbers Method: Diagnose, Stabilize, Accelerate',
];

type CategorySlug = 'culture' | 'ai-delivery' | 'guides' | 'case-studies' | 'reliability-observability' | 'security-compliance' | 'release-engineering' | 'platform-productivity';

interface CategoryTheme {
  slug: CategorySlug;
  label: string;
  angles: string[];
  emphasis: string[];
}

interface GeneratedArticlePayload {
  title: string;
  deck: string;
  categorySlug: CategorySlug;
  summary: string;
  keywords: string[];
  keyTakeaways: string[];
  checklist: string[];
  body: string[];
  heroQuote?: string;
  faq?: Array<{ question: string; answer: string }>;
  readTimeMinutes: number;
}

export const CATEGORY_THEMES: CategoryTheme[] = [
  {
    slug: 'ai-delivery',
    label: 'AI in Production',
    angles: [
      'Design an evaluation harness that keeps generative features accountable before, during, and after release.',
      'Codify rollback and kill-switch guardrails for AI-assisted applications handling regulated data.',
      'Quantify the business impact of AI augmentations with instrumentation and controlled experiments.',
      'Stabilize prompt/feature drift with versioning, datasets, and automatic regression barriers.',
    ],
    emphasis: [
      'Stress instrumentation, observability, and safety guardrails across AI-enabled flows.',
      'Reference real-world failure modes (hallucination, drift, latency spikes) and how to mitigate them.',
    ],
  },
  {
    slug: 'culture',
    label: 'Culture & Process',
    angles: [
      'Create decision cadences that keep modernization aligned with product delivery.',
      'Coach engineering leadership on balancing roadmap work with remediation/guardrail investments.',
      'Build feedback loops that convert incident reviews into prioritized modernization backlogs.',
      'Establish “definition of ready/done” that encodes reliability and accessibility requirements.',
    ],
    emphasis: [
      'Highlight communication rituals, leadership behaviors, and measurable outcomes.',
      'Keep recommendations concrete and grounded in enterprise realities and constraints.',
    ],
  },
  {
    slug: 'guides',
    label: 'Technical Guide',
    angles: [
      'Harden a legacy service via progressive observability adoption and SLOs.',
      'Sequence a modernization using reversible thin slices with safety nets and shadow traffic.',
      'Deliver a hands-on checklist for migrating a critical workload with zero downtime.',
      'Reduce flaky tests and pipeline latency to unlock faster, safer releases.',
    ],
    emphasis: [
      'Provide step-by-step guidance with checkpoints, metrics, and tooling suggestions.',
      'Assume a senior engineer reader who wants pragmatic direction and proof points.',
    ],
  },
  {
    slug: 'case-studies',
    label: 'Case Study',
    angles: [
      'Outline an anonymized engagement where modernization unblocked a critical launch.',
      'Show how GitPlumbers stabilized an AI-assisted application under real customer load.',
      'Demonstrate ROI from pairing reliability guardrails with delivery coaching.',
      'Trace “before/after” metrics (MTTR, change failure rate, velocity) to business outcomes.',
    ],
    emphasis: [
      'Include industry context, constraints, and measurable outcomes or metrics.',
      'Frame the narrative around challenges, interventions, and specific results.',
    ],
  },
  {
    slug: 'reliability-observability',
    label: 'Reliability & Observability',
    angles: [
      'Define SLIs/SLOs that change on-call behavior and reduce incident volume.',
      'Implement runbooks and game days that actually shrink MTTR.',
      'Make dashboards actionable: fewer charts, clearer thresholds, faster decisions.',
      'Instrument release health to spot regressions before customers do.',
    ],
    emphasis: [
      'Focus on leading indicators that predict incidents, not vanity metrics.',
      'Show how to tie telemetry to triage and rollout automation.',
    ],
  },
  {
    slug: 'security-compliance',
    label: 'Security & Compliance',
    angles: [
      'Bake threat modeling into modernization sprints without slowing delivery.',
      'Codify least-privilege, secret rotation, and dependency risk controls as code.',
      'Operationalize WCAG 2.2 AA and ARIA support as non-negotiable acceptance criteria.',
    ],
    emphasis: [
      'Translate policies into guardrails, checks, and automated proofs.',
      'Balance regulated-data constraints with delivery speed.',
    ],
  },
  {
    slug: 'release-engineering',
    label: 'Release Engineering',
    angles: [
      'Stand up progressive delivery (feature flags, canaries, blue/green) with governance.',
      'Reduce CI flake and cut pipeline time to accelerate feedback loops.',
      'Design rollback strategies that make Friday deploys boring.',
    ],
    emphasis: [
      'Prioritize change failure rate, lead time, and recovery time as north-star metrics.',
      'Document repeatable checklists that scale with team size.',
    ],
  },
  {
    slug: 'platform-productivity',
    label: 'Platform & Developer Productivity',
    angles: [
      'Adopt “just-enough platform” patterns to unblock product teams without over-centralizing.',
      'Use ADRs and paved roads to prevent drift and support safe refactors.',
      'Measure developer friction and eliminate the top sources of wait/hand-off time.',
    ],
    emphasis: [
      'Favor simplification and paved-road defaults over bespoke tooling.',
      'Show cost/benefit trade-offs with concrete before/after examples.',
    ],
  },
];

// A crisp, opinionated system prompt aligned to your brand voice.
// Keeps outputs specific, scannable, and implementation-focused.

export const SYSTEM_PROMPT = [
  'You are the editorial AI for GitPlumbers, a consultancy that fixes AI-assisted and legacy software so teams can ship safely.',
  'Audience: pragmatic senior engineering leaders (VP Eng, Directors, Staff/Principal) who expect specifics, proof, and operational maturity.',
  'Tone: candid, data-backed, and implementation-focused. Avoid fluff and generic platitudes.',
  'Always: lead with the problem, state the stakes, then give step-by-step actions. Include realistic metrics (e.g., MTTR, lead time, change failure rate), decision checklists, and risk trade-offs.',
  'Back guidance with examples from real-world failure modes. Prefer guardrails, automation, and reversible patterns over heroics.',
  'Be framework-agnostic; emphasize reliability, observability, security, and accessibility as first-class delivery concerns.',
  'Write concisely with verb-first headings, bullets over paragraphs, and concrete numbers where possible.',
].join(' ');

export const generateBlogArticleHourly = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'Etc/UTC',
    region: 'us-central1',
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 540,
  },
  async () => {
    const firestore = admin.firestore();

    const recentContext = await fetchRecentContext(firestore);
    const theme = pickTheme();

    const prompt = buildPrompt(theme, recentContext);

    const client = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
    });

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'GitPlumbersBlogArticle',
          strict: true,
          schema: buildArticleSchema(theme.slug),
          description:
            'Structured blog article data for GitPlumbers including summary, body paragraphs, checklist, and FAQs.',
        },
      },
      temperature: 0.6,
      max_output_tokens: 1500,
    });

    const payload = extractPayload(response);

    validatePayload(payload, theme.slug);

    const slug = await ensureUniqueSlug(firestore, toSlug(payload.title));
    const publishedOn = new Date().toISOString().split('T')[0];
    const readTimeMinutes = Number.isFinite(payload.readTimeMinutes) ?
      Math.min(10, Math.max(5, Math.round(payload.readTimeMinutes))) :
      7;
    const readTime = `${readTimeMinutes} minute read`;

    const document = {
      ...payload,
      readTimeMinutes,
      slug,
      readTime,
      publishedOn,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'published',
      sourceModel: 'gpt-4.1-mini',
    };

    await firestore.collection(BLOG_COLLECTION).doc(slug).set(document);

    logger.info('Generated blog article draft', {
      slug,
      category: payload.categorySlug,
      readTime,
    });
  }
);

function buildPrompt(theme: CategoryTheme, recent: string[]): string {
  const sections: string[] = [];

  sections.push(
    `Write a ${theme.label} article for the GitPlumbers blog that would excite senior engineering leaders.`
  );
  sections.push(`Primary angle: ${pick(theme.angles)}`);
  sections.push(`Editorial priorities: ${theme.emphasis.join(' ')}`);
  sections.push(
    'Deliver concrete modernization tactics, instrumentation ideas, and measurable outcomes. Blend strategic framing with hands-on steps.'
  );
  sections.push(
    'Body paragraphs should read as narrative prose, not bullet lists. Avoid marketing language or vague claims.'
  );
  sections.push(
    'Each checklist item must be actionable and reference tooling, metrics, or operating cadence. Key takeaways should be crisp summary statements.'
  );

  const avoided = [...new Set([...BASELINE_POST_TITLES, ...recent])];
  if (avoided.length > 0) {
    sections.push(
      `Avoid overlapping topics or phrasing with these existing posts: ${avoided.join(' | ')}`
    );
  }

  sections.push(
    'Assume the reader is evaluating whether GitPlumbers can help them stabilize or accelerate delivery. Provide enough detail to earn trust.'
  );
  sections.push('Return only the JSON payload that matches the provided schema.');

  return sections.join('\n\n');
}

function pickTheme(): CategoryTheme {
  return pick(CATEGORY_THEMES);
}

function pick<T>(items: ReadonlyArray<T>): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

async function fetchRecentContext(firestore: Firestore): Promise<string[]> {
  try {
    const snapshot = await firestore
      .collection(BLOG_COLLECTION)
      .orderBy('publishedOn', 'desc')
      .limit(5)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Partial<GeneratedArticlePayload> & {
          title?: string;
          summary?: string;
          categorySlug?: string;
        };
        if (!data.title || !data.summary || !data.categorySlug) {
          return undefined;
        }
        return `${data.title} (${data.categorySlug}): ${data.summary}`;
      })
      .filter((value): value is string => Boolean(value));
  } catch (error) {
    logger.warn('Unable to fetch recent blog context, proceeding without it', { error });
    return [];
  }
}

function buildArticleSchema(categorySlug: CategorySlug) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'title',
      'deck',
      'categorySlug',
      'summary',
      'keywords',
      'keyTakeaways',
      'checklist',
      'body',
      'readTimeMinutes',
      'heroQuote',
      'faq',
    ],
    properties: {
      title: {
        type: 'string',
        minLength: 10,
        maxLength: 120,
      },
      deck: {
        type: 'string',
        minLength: 20,
        maxLength: 180,
      },
      categorySlug: {
        type: 'string',
        enum: [categorySlug],
      },
      summary: {
        type: 'string',
        minLength: 60,
        maxLength: 240,
      },
      keywords: {
        type: 'array',
        minItems: 4,
        maxItems: 6,
        items: {
          type: 'string',
          minLength: 3,
          maxLength: 60,
        },
      },
      keyTakeaways: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'string',
          minLength: 12,
          maxLength: 160,
        },
      },
      checklist: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: {
          type: 'string',
          minLength: 15,
          maxLength: 200,
        },
      },
      body: {
        type: 'array',
        minItems: 5,
        maxItems: 7,
        items: {
          type: 'string',
          minLength: 120,
          maxLength: 320,
        },
      },
      heroQuote: {
        type: ['string', 'null'],
        minLength: 25,
        maxLength: 160,
      },
      faq: {
        type: ['array', 'null'],
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          required: ['question', 'answer'],
          additionalProperties: false,
          properties: {
            question: { type: 'string', minLength: 12, maxLength: 120 },
            answer: { type: 'string', minLength: 60, maxLength: 260 },
          },
        },
      },
      readTimeMinutes: {
        type: 'integer',
        minimum: 5,
        maximum: 9,
      },
    },
  };
}

function extractPayload(response: OpenAI.Responses.Response): GeneratedArticlePayload {
  if (!response.output_text) {
    throw new Error('OpenAI response did not include any output text');
  }
  return JSON.parse(response.output_text) as GeneratedArticlePayload;
}

async function ensureUniqueSlug(firestore: Firestore, slug: string): Promise<string> {
  let candidate = slug;
  let attempts = 0;

  while (attempts < 5) {
    const snapshot = await firestore.collection(BLOG_COLLECTION).doc(candidate).get();
    if (!snapshot.exists) {
      return candidate;
    }
    candidate = `${slug}-${randomSuffix()}`;
    attempts += 1;
  }

  throw new Error('Unable to determine a unique slug for the generated article');
}

function toSlug(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return base.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function randomSuffix(): string {
  return randomBytes(2).toString('hex');
}

function validatePayload(payload: GeneratedArticlePayload, expectedCategory: CategorySlug): void {
  if (!Array.isArray(payload.body) || payload.body.length < 5) {
    throw new Error('Generated article body is too short');
  }
  if (!payload.title || !payload.deck || !payload.summary) {
    throw new Error('Generated article missing critical fields');
  }
  if (!Array.isArray(payload.keywords) || payload.keywords.length < 4) {
    throw new Error('Generated article missing keywords');
  }
  if (!Array.isArray(payload.keyTakeaways) || payload.keyTakeaways.length < 3) {
    throw new Error('Generated article missing key takeaways');
  }
  if (!Array.isArray(payload.checklist) || payload.checklist.length < 3) {
    throw new Error('Generated article missing checklist items');
  }
  if (payload.categorySlug !== expectedCategory) {
    throw new Error(`Unexpected category: ${payload.categorySlug}`);
  }
  if (!Number.isFinite(payload.readTimeMinutes)) {
    throw new Error('Missing read time estimate');
  }
}
