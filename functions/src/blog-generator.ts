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

type CategorySlug = 'culture' | 'ai-delivery' | 'guides' | 'case-studies' | 'reliability-observability' | 'security-compliance' | 'release-engineering' | 'platform-productivity' | 'performance-optimization' | 'data-engineering';

interface CategoryTheme {
  slug: CategorySlug;
  label: string;
  angles: string[];
  emphasis: string[];
}

interface InternalLink {
  href: string;
  anchor: string;
}

interface CTA {
  label: string;
  href: string;
  utm: string;
}

interface Author {
  name: string;
  title: string;
  bio: string;
  url: string;
}

interface SchemaHints {
  articleSection: string;
  aboutEntity: 'GitPlumbers';
  faqIsFAQPage: boolean;
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
  structuredSections: StructuredSection[];
  heroQuote: string;
  faq: Array<{ question: string; answer: string }>;
  readTimeMinutes: number;
  internalLinks: InternalLink[];
  primaryCTA: CTA;
  secondaryCTA: CTA;
  author: Author;
  schemaHints: SchemaHints;
}

interface StructuredSection {
  header: string;
  content: string[];
  type: 'hook' | 'why-matters' | 'implementation' | 'example' | 'takeaways' | 'questions';
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
      'Build A/B testing frameworks for AI model performance in production environments.',
      'Implement circuit breakers and fallback mechanisms for AI service failures.',
      'Create monitoring dashboards that detect AI model degradation before user impact.',
      'Establish data lineage tracking for AI training and inference pipelines.',
      'Design cost optimization strategies for AI compute resources without sacrificing quality.',
      'Build automated bias detection and fairness monitoring for AI systems.',
      'Create disaster recovery plans specifically for AI-dependent applications.',
      'Implement feature store architectures for consistent AI model serving.',
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
      'Establish "definition of ready/done" that encodes reliability and accessibility requirements.',
      'Design blameless postmortem processes that actually prevent future incidents.',
      'Create engineering career progression frameworks that reward reliability work.',
      'Build cross-functional collaboration patterns for complex technical initiatives.',
      'Establish technical debt budgeting and ROI measurement practices.',
      'Create psychological safety frameworks for high-stakes technical decisions.',
      'Design remote-first engineering practices that maintain code quality.',
      'Build mentorship programs that transfer critical system knowledge.',
      'Create innovation time allocation strategies that balance exploration with delivery.',
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
      'Build comprehensive logging strategies that enable effective debugging.',
      'Create database migration strategies for zero-downtime schema changes.',
      'Design API versioning strategies that maintain backward compatibility.',
      'Implement distributed tracing across microservices architectures.',
      'Build chaos engineering practices for resilience testing.',
      'Create performance optimization playbooks for common bottlenecks.',
      'Design caching strategies that improve both performance and reliability.',
      'Build automated security scanning into CI/CD pipelines.',
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
      'Trace "before/after" metrics (MTTR, change failure rate, velocity) to business outcomes.',
      'Document a complex microservices migration that reduced operational overhead.',
      'Show how implementing SLOs transformed an engineering team\'s incident response.',
      'Demonstrate the business impact of reducing technical debt in a high-growth startup.',
      'Case study: How observability improvements prevented a major outage.',
      'Document a successful platform migration that improved developer productivity.',
      'Show how implementing progressive delivery reduced deployment risk.',
      'Case study: Transforming a legacy monolith into a maintainable architecture.',
      'Demonstrate how security-first development practices prevented costly breaches.',
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
      'Build alert fatigue reduction strategies through intelligent notification routing.',
      'Create incident response playbooks that scale across multiple teams.',
      'Design error budget allocation strategies for different service tiers.',
      'Implement distributed tracing to understand complex system interactions.',
      'Build capacity planning models that predict scaling needs accurately.',
      'Create synthetic monitoring that validates user experience continuously.',
      'Design correlation analysis tools that connect symptoms to root causes.',
      'Build automated incident detection that reduces mean time to detection.',
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
      'Build automated compliance checking into deployment pipelines.',
      'Create security incident response procedures that minimize business impact.',
      'Design zero-trust architectures for distributed systems.',
      'Implement data privacy controls that meet GDPR and CCPA requirements.',
      'Build vulnerability management workflows that prioritize by business risk.',
      'Create secure coding standards that integrate with developer workflows.',
      'Design identity and access management systems for complex organizations.',
      'Build security monitoring that detects threats in real-time.',
      'Create disaster recovery plans that include security breach scenarios.',
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
      'Build automated testing strategies that catch regressions early.',
      'Create deployment automation that handles complex multi-service releases.',
      'Design feature flag management systems that enable safe experimentation.',
      'Build release coordination tools for distributed engineering teams.',
      'Create automated rollback triggers based on real-time metrics.',
      'Design blue-green deployment strategies for zero-downtime releases.',
      'Build release validation pipelines that ensure quality gates.',
      'Create deployment monitoring that provides immediate feedback on releases.',
      'Design release communication systems that keep stakeholders informed.',
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
      'Adopt "just-enough platform" patterns to unblock product teams without over-centralizing.',
      'Use ADRs and paved roads to prevent drift and support safe refactors.',
      'Measure developer friction and eliminate the top sources of wait/hand-off time.',
      'Build internal developer portals that provide self-service capabilities.',
      'Create standardized development environments that reduce setup friction.',
      'Design code review automation that maintains quality without slowing delivery.',
      'Build internal tooling that abstracts away infrastructure complexity.',
      'Create developer onboarding programs that accelerate time to productivity.',
      'Design metrics dashboards that track developer experience and satisfaction.',
      'Build automated code quality gates that prevent technical debt accumulation.',
      'Create knowledge sharing systems that preserve institutional expertise.',
      'Design experimentation platforms that enable safe feature testing.',
    ],
    emphasis: [
      'Favor simplification and paved-road defaults over bespoke tooling.',
      'Show cost/benefit trade-offs with concrete before/after examples.',
    ],
  },
  {
    slug: 'performance-optimization',
    label: 'Performance & Scalability',
    angles: [
      'Build performance monitoring that identifies bottlenecks before they impact users.',
      'Create load testing strategies that validate system behavior under stress.',
      'Design caching architectures that improve both performance and cost efficiency.',
      'Implement database optimization techniques that scale with user growth.',
      'Build CDN strategies that reduce latency for global user bases.',
      'Create resource optimization frameworks that balance performance and cost.',
      'Design horizontal scaling strategies for stateless and stateful services.',
      'Build performance regression detection that prevents gradual degradation.',
      'Create capacity planning models that predict scaling needs accurately.',
      'Design performance budgets that maintain consistent user experience.',
      'Build automated performance testing that validates optimization efforts.',
      'Create performance optimization playbooks for common architectural patterns.',
    ],
    emphasis: [
      'Focus on user-facing metrics and business impact of performance improvements.',
      'Provide concrete optimization techniques with measurable outcomes.',
    ],
  },
  {
    slug: 'data-engineering',
    label: 'Data & Analytics',
    angles: [
      'Build real-time data pipelines that support business-critical decision making.',
      'Create data quality monitoring that prevents downstream analytics failures.',
      'Design data governance frameworks that ensure compliance and security.',
      'Implement data lake architectures that scale with growing data volumes.',
      'Build ETL optimization strategies that reduce processing time and costs.',
      'Create data lineage tracking that enables impact analysis and debugging.',
      'Design streaming data architectures that handle high-velocity data sources.',
      'Build data warehouse optimization techniques that improve query performance.',
      'Create data privacy controls that meet regulatory requirements.',
      'Design A/B testing data pipelines that provide reliable experiment results.',
      'Build machine learning data pipelines that support model training and serving.',
      'Create data visualization platforms that enable self-service analytics.',
    ],
    emphasis: [
      'Focus on data reliability, quality, and business value delivery.',
      'Provide practical data engineering solutions with measurable outcomes.',
    ],
  },
];

// A crisp, opinionated system prompt aligned to your brand voice.
// Keeps outputs specific, scannable, and implementation-focused.

export const SYSTEM_PROMPT = [
  'You are the editorial AI for GitPlumbers, a consultancy that fixes AI-assisted and legacy software so teams can ship safely.',
  'Audience: pragmatic senior engineering leaders (VP Eng, Directors, Staff/Principal) who expect specifics, proof, and operational maturity.',
  'Tone: candid, data-backed, and implementation-focused. Avoid fluff and generic platitudes.',
  '',
  'ENGAGEMENT & HOOK REQUIREMENTS:',
  '- Open with a bold, high-stakes claim or scenario (downtime, compliance risk, revenue loss) to hook the reader immediately.',
  '- Make the writing feel like an expert guiding the reader through a critical concept, not just summarizing facts.',
  '- Use concrete scenarios and real-world failure modes to create urgency and relevance.',
  '- Write with authority and confidence - you\'re the expert they need to listen to.',
  '',
  'STRUCTURE & FORMATTING:',
  '- Create structuredSections with clear markdown headers (##) for major sections.',
  '- MANDATORY sections: "hook" (high-stakes opening), "implementation" (how-to steps), "takeaways" (key insights).',
  '- Optional sections: "why-matters", "example", "questions".',
  '- Use bullet points and checklists wherever possible for skimmability.',
  '- Keep paragraphs under 4 lines for easy scanning.',
  '- Each structured section should have 2-4 content paragraphs that are concise and actionable.',
  '',
  'CONTENT GUIDELINES:',
  '- Always: lead with the problem, state the stakes, then give step-by-step actions.',
  '- Include realistic metrics (e.g., MTTR, lead time, change failure rate), decision checklists, and risk trade-offs.',
  '- Back guidance with examples from real-world failure modes.',
  '- Prefer guardrails, automation, and reversible patterns over heroics.',
  '- Be framework-agnostic; emphasize reliability, observability, security, and accessibility as first-class delivery concerns.',
  '- Write concisely with verb-first headings, bullets over paragraphs, and concrete numbers where possible.',
  '',
  'CTA & STICKINESS:',
  '- End with compelling calls to action that link to related resources or encourage deeper exploration.',
  '- Make CTAs feel like natural next steps, not sales pitches.',
  '- Example CTA style: "Want a full blueprint for implementing safe model deployment? Read: Designing an Evaluation Harness for Generative AI →"',
  '',
  'Brand & SEO requirements:',
  '- Naturally mention "GitPlumbers" once in the deck or conclusion, not repeatedly.',
  '- Provide 2–4 internalLinks to gitplumbers.com with descriptive anchors that match the article\'s tactics.',
  '- Output a primaryCTA with label + href + utm pointing to a relevant conversion page on gitplumbers.com.',
  '- Include author (credible senior engineer persona) with 1–2 sentence bio.',
  '- Set schemaHints.aboutEntity = "GitPlumbers" and faqIsFAQPage=true when FAQ is present.',
  '- Avoid repeating the brand name unnaturally in body paragraphs.',
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
    const theme = await pickTheme(firestore);

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
      max_output_tokens: 20000,
    });

    const payload = extractPayload(response);

    try {
      validatePayload(payload, theme.slug);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Article validation failed', {
        error: errorMessage,
        theme: theme.slug,
        payloadKeys: Object.keys(payload),
        structuredSectionsCount: payload.structuredSections?.length || 0,
        structuredSectionsTypes: payload.structuredSections?.map((s) => s.type) || [],
      });
      throw error;
    }

    const slug = await ensureUniqueSlug(firestore, toSlug(payload.title));
    const publishedOn = new Date().toISOString().split('T')[0];
    const readTimeMinutes = Number.isFinite(payload.readTimeMinutes) ?
      Math.min(10, Math.max(5, Math.round(payload.readTimeMinutes))) :
      7;
    const readTime = `${readTimeMinutes} minute read`;

    // Generate SEO metadata with structured data
    const seoMetadata = {
      title: `${payload.title} | GitPlumbers`,
      description: payload.summary,
      ogTitle: `${payload.title} | GitPlumbers`,
      ogDescription: payload.summary,
      ogImage: 'https://gitplumbers.com/logo.png',
      ogType: 'article',
      twitterTitle: `${payload.title} | GitPlumbers`,
      twitterDescription: payload.summary,
      twitterImage: 'https://gitplumbers.com/logo.png',
      articleSection: payload.schemaHints.articleSection,
      structuredDataArticle: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: payload.title,
        description: payload.summary,
        publisher: {
          '@type': 'Organization',
          name: 'GitPlumbers',
          url: 'https://gitplumbers.com/',
          logo: 'https://gitplumbers.com/logo.png'
        },
        mainEntityOfPage: `https://gitplumbers.com/blog/${slug}/`,
        datePublished: publishedOn,
        dateModified: publishedOn,
        author: {
          '@type': 'Person',
          name: payload.author.name,
          ...(payload.author.title && { jobTitle: payload.author.title }),
          ...(payload.author.url && { url: payload.author.url })
        },
        articleSection: payload.schemaHints.articleSection,
        keywords: payload.keywords.join(', '),
        wordCount: payload.body.join(' ').split(' ').length,
        timeRequired: `PT${readTimeMinutes}M`
      },
      ...(payload.faq && payload.faq.length > 0 && {
        structuredDataFAQ: {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: payload.faq.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer
            }
          }))
        }
      })
    };

    const document = {
      ...payload,
      readTimeMinutes,
      slug,
      readTime,
      publishedOn,
      seoMetadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'published',
      sourceModel: 'gpt-4.1-mini',
    };

    await firestore.collection(BLOG_COLLECTION).doc(slug).set(document);

    logger.info('Generated blog article', {
      slug,
      category: payload.categorySlug,
      readTime,
      status: document.status,
      publishedOn: document.publishedOn,
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

  // Enhanced engagement requirements
  sections.push(
    'UNIQUENESS REQUIREMENT: Create a completely unique title and angle that has never been written about before. ' +
    'Avoid generic phrases and common patterns. Think of specific, novel scenarios that engineering leaders face. ' +
    'Use unexpected angles, specific metrics, or unique problem statements that make this article stand out.'
  );

  sections.push(
    'HOOK REQUIREMENT: Start with a bold, high-stakes opening that immediately grabs attention. ' +
    'Use scenarios like: "Your AI model just hallucinated in production, costing $50K in customer refunds" ' +
    'or "A single line of legacy code brought down your entire payment system during Black Friday." ' +
    'Make the stakes clear and urgent from paragraph one.'
  );

  sections.push(
    'STRUCTURED SECTIONS: Create 4-6 structuredSections. You MUST include these core types: ' +
    '1) "hook" - The high-stakes opening scenario (REQUIRED), ' +
    '2) "implementation" - Step-by-step how-to guidance (REQUIRED), ' +
    '3) "takeaways" - Key insights and action items (REQUIRED). ' +
    'Additionally, choose 1-3 from: "why-matters" (why this problem is critical), ' +
    '"example" (real-world case study), "questions" (common questions teams ask). ' +
    'Each section must have a clear header and 2-4 content paragraphs.'
  );

  sections.push(
    'FORMATTING: Use clear markdown headers (##) for each section. Keep paragraphs under 4 lines. ' +
    'Use bullet points and numbered lists for skimmability. Make content scannable and actionable.'
  );

  sections.push(
    'EXAMPLE STRUCTURE: Your structuredSections should look like: ' +
    '[{"header": "The $50K Hallucination", "type": "hook", "content": ["Your AI model just..."]}, ' +
    '{"header": "Why This Matters", "type": "why-matters", "content": ["For engineering leaders..."]}, ' +
    '{"header": "How to Implement It", "type": "implementation", "content": ["Step 1: Set up evaluation..."]}, ' +
    '{"header": "Key Takeaways", "type": "takeaways", "content": ["Always validate AI outputs..."]}]'
  );

  sections.push(
    'CONTENT DIFFERENTIATION: Create content that offers a unique perspective or novel approach to the topic. ' +
    'Use specific examples, industry-specific scenarios, or unconventional problem-solving methods. ' +
    'Avoid generic advice that could apply to any engineering team - make it specific and actionable.'
  );

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
      `CRITICAL: Avoid overlapping topics, similar phrasing, or semantic similarity with these existing posts: ${avoided.join(' | ')}`
    );
    sections.push(
      'Create a title that is semantically different from all existing articles. Use different keywords, ' +
      'different problem framing, different solution approaches, or different industry contexts. ' +
      'The title should feel completely fresh and novel to readers familiar with our content.'
    );
  }

  sections.push(
    'Assume the reader is evaluating whether GitPlumbers can help them stabilize or accelerate delivery. Provide enough detail to earn trust.'
  );

  // Enhanced CTA requirements
  sections.push(
    'CTA REQUIREMENTS: Create compelling, natural-sounding CTAs that feel like logical next steps, not sales pitches. ' +
    'Examples: "Want a full blueprint for implementing safe model deployment? Read: Designing an Evaluation Harness for Generative AI →" ' +
    'or "Need help auditing your current observability setup? Download our Infrastructure Health Checklist →"'
  );

  // SEO and internal linking requirements
  sections.push(
    'Include 2–4 internalLinks with realistic anchors pointing to gitplumbers.com paths. ' +
    'Choose from: /services/modernization, /services/observability, /services/ai-delivery, ' +
    '/services/reliability, /services/platform, /guides, /case-studies, /contact, /about.'
  );
  sections.push(
    'Include both primaryCTA and secondaryCTA that would convert a senior engineering leader. ' +
    'Choose from: "Book a modernization assessment", "Explore our services", "See our results", "Schedule a consultation". ' +
    'Include utm parameters for tracking on both CTAs.'
  );
  sections.push(
    'Always include a heroQuote (25-160 characters) and FAQ section (2-3 questions). Set schemaHints.faqIsFAQPage=true.'
  );
  sections.push(
    'Create a credible author with name, title (e.g., "Senior Platform Engineer", "VP of Engineering"), ' +
    'bio (1-2 sentences demonstrating expertise), and url (LinkedIn or professional profile). All author fields are required.'
  );
  sections.push(
    'Set schemaHints.articleSection to the category name, aboutEntity to "GitPlumbers", ' +
    'and faqIsFAQPage to true if FAQ is present, false otherwise. All schemaHints fields are required.'
  );

  sections.push(
    'JSON FORMATTING: Return only valid JSON that matches the provided schema. ' +
    'CRITICAL: Escape all quotes in strings using \\" and avoid newlines in string values. ' +
    'Example: "content": ["This is a paragraph with \\"quotes\\" that are properly escaped."] ' +
    'Do not include any text before or after the JSON object.'
  );

  return sections.join('\n\n');
}

async function pickTheme(firestore: Firestore): Promise<CategoryTheme> {
  try {
    // Get recently used categories to avoid repetition
    const snapshot = await firestore
      .collection(BLOG_COLLECTION)
      .orderBy('publishedOn', 'desc')
      .limit(10)
      .get();

    const recentCategories = new Set(
      snapshot.docs
        .map((doc) => {
          const data = doc.data() as { categorySlug?: string };
          return data.categorySlug;
        })
        .filter((slug): slug is string => Boolean(slug))
    );

    // Filter out recently used categories
    const availableThemes = CATEGORY_THEMES.filter(
      (theme) => !recentCategories.has(theme.slug)
    );

    // If all categories have been used recently, use all themes
    const themesToChooseFrom = availableThemes.length > 0 ? availableThemes : CATEGORY_THEMES;
    
    return pick(themesToChooseFrom);
  } catch (error) {
    logger.warn('Unable to fetch recent categories, using random selection', { error });
    return pick(CATEGORY_THEMES);
  }
}

function pick<T>(items: ReadonlyArray<T>): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

async function fetchRecentContext(firestore: Firestore): Promise<string[]> {
  try {
    // Fetch more recent articles to better avoid duplicates
    const snapshot = await firestore
      .collection(BLOG_COLLECTION)
      .orderBy('publishedOn', 'desc')
      .limit(20)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Partial<GeneratedArticlePayload> & {
          title?: string;
          summary?: string;
          categorySlug?: string;
          keywords?: string[];
        };
        if (!data.title || !data.summary || !data.categorySlug) {
          return undefined;
        }
        const keywords = data.keywords ? ` [Keywords: ${data.keywords.join(', ')}]` : '';
        return `${data.title} (${data.categorySlug}): ${data.summary}${keywords}`;
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
      'structuredSections',
      'readTimeMinutes',
      'heroQuote',
      'faq',
      'internalLinks',
      'primaryCTA',
      'secondaryCTA',
      'author',
      'schemaHints',
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
      structuredSections: {
        type: 'array',
        minItems: 4,
        maxItems: 6,
        items: {
          type: 'object',
          required: ['header', 'content', 'type'],
          additionalProperties: false,
          properties: {
            header: { type: 'string', minLength: 10, maxLength: 80 },
            content: {
              type: 'array',
              minItems: 2,
              maxItems: 4,
              items: {
                type: 'string',
                minLength: 80,
                maxLength: 280,
              },
            },
            type: {
              type: 'string',
              enum: ['hook', 'why-matters', 'implementation', 'example', 'takeaways', 'questions'],
            },
          },
        },
      },
      heroQuote: {
        type: 'string',
        minLength: 25,
        maxLength: 160,
      },
      faq: {
        type: 'array',
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
      internalLinks: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['href', 'anchor'],
          additionalProperties: false,
          properties: {
            href: { type: 'string', minLength: 1, maxLength: 200 },
            anchor: { type: 'string', minLength: 5, maxLength: 100 },
          },
        },
      },
      primaryCTA: {
        type: 'object',
        required: ['label', 'href', 'utm'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 10, maxLength: 80 },
          href: { type: 'string', minLength: 1, maxLength: 200 },
          utm: { type: 'string', maxLength: 100 },
        },
      },
      secondaryCTA: {
        type: 'object',
        required: ['label', 'href', 'utm'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 10, maxLength: 80 },
          href: { type: 'string', minLength: 1, maxLength: 200 },
          utm: { type: 'string', maxLength: 100 },
        },
      },
      author: {
        type: 'object',
        required: ['name', 'title', 'bio', 'url'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 5, maxLength: 60 },
          title: { type: 'string', maxLength: 80 },
          bio: { type: 'string', maxLength: 200 },
          url: { type: 'string', maxLength: 200 },
        },
      },
      schemaHints: {
        type: 'object',
        required: ['aboutEntity', 'articleSection', 'faqIsFAQPage'],
        additionalProperties: false,
        properties: {
          articleSection: { type: 'string', maxLength: 100 },
          aboutEntity: { type: 'string', enum: ['GitPlumbers'] },
          faqIsFAQPage: { type: 'boolean' },
        },
      },
    },
  };
}

function extractPayload(response: OpenAI.Responses.Response): GeneratedArticlePayload {
  if (!response.output_text) {
    throw new Error('OpenAI response did not include any output text');
  }

  let cleanedJson = response.output_text.trim();

  // Remove any text before the first { or after the last }
  const firstBrace = cleanedJson.indexOf('{');
  const lastBrace = cleanedJson.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanedJson) as GeneratedArticlePayload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to parse OpenAI response as JSON', {
      error: errorMessage,
      originalLength: response.output_text.length,
      cleanedLength: cleanedJson.length,
      originalPreview: response.output_text.substring(0, 500),
      cleanedPreview: cleanedJson.substring(0, 500),
      originalEnd: response.output_text.substring(Math.max(0, response.output_text.length - 500)),
      cleanedEnd: cleanedJson.substring(Math.max(0, cleanedJson.length - 500)),
    });
    throw new Error(`Invalid JSON response from OpenAI: ${errorMessage}`);
  }
}

async function ensureUniqueSlug(firestore: Firestore, slug: string): Promise<string> {
  let candidate = slug;
  let attempts = 0;

  while (attempts < 10) {
    const snapshot = await firestore.collection(BLOG_COLLECTION).doc(candidate).get();
    if (!snapshot.exists) {
      return candidate;
    }
    
    // Try different suffix strategies to ensure uniqueness
    if (attempts < 3) {
      candidate = `${slug}-${randomSuffix()}`;
    } else if (attempts < 6) {
      candidate = `${slug}-${Date.now().toString(36)}`;
    } else {
      candidate = `${slug}-${randomSuffix()}-${Date.now().toString(36)}`;
    }
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
  if (!Array.isArray(payload.structuredSections) || payload.structuredSections.length < 4) {
    throw new Error('Generated article missing structured sections');
  }
  // Validate structured sections have at least the core required types
  const coreRequiredTypes = ['hook', 'implementation', 'takeaways'];
  const sectionTypes = payload.structuredSections.map((s) => s.type);
  const missingCoreTypes = coreRequiredTypes.filter((type) => !sectionTypes.includes(type as any));
  if (missingCoreTypes.length > 0) {
    throw new Error(`Generated article missing core required section types: ${missingCoreTypes.join(', ')}`);
  }

  // Validate that we have a good variety of section types
  const uniqueTypes = [...new Set(sectionTypes)];
  if (uniqueTypes.length < 4) {
    throw new Error(`Generated article has insufficient section variety. Found: ${uniqueTypes.join(', ')}`);
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
  if (!Array.isArray(payload.internalLinks) || payload.internalLinks.length < 2) {
    throw new Error('Generated article missing internal links');
  }
  if (!payload.heroQuote || payload.heroQuote.length < 25) {
    throw new Error('Generated article missing hero quote');
  }
  if (!Array.isArray(payload.faq) || payload.faq.length < 2) {
    throw new Error('Generated article missing FAQ section');
  }
  if (!payload.primaryCTA || !payload.primaryCTA.label || !payload.primaryCTA.href || !payload.primaryCTA.utm) {
    throw new Error('Generated article missing primary CTA or UTM parameter');
  }
  if (!payload.secondaryCTA || !payload.secondaryCTA.label || !payload.secondaryCTA.href || !payload.secondaryCTA.utm) {
    throw new Error('Generated article missing secondary CTA or UTM parameter');
  }
  if (!payload.author || !payload.author.name || !payload.author.title || !payload.author.bio || !payload.author.url) {
    throw new Error('Generated article missing complete author information');
  }
  if (!payload.schemaHints || payload.schemaHints.aboutEntity !== 'GitPlumbers' || !payload.schemaHints.articleSection || typeof payload.schemaHints.faqIsFAQPage !== 'boolean') {
    throw new Error('Generated article missing complete schema hints');
  }

  // Additional uniqueness validation
  if (payload.title.length < 20) {
    throw new Error('Generated article title is too short - needs to be more specific and unique');
  }
  
  // Check for generic phrases that indicate low uniqueness
  const genericPhrases = [
    'how to', 'best practices', 'guide to', 'introduction to', 'overview of',
    'getting started', 'fundamentals', 'basics of', 'understanding'
  ];
  const titleLower = payload.title.toLowerCase();
  const hasGenericPhrase = genericPhrases.some(phrase => titleLower.includes(phrase));
  if (hasGenericPhrase) {
    throw new Error('Generated article title contains generic phrases - needs to be more specific and unique');
  }

  // Validate that keywords are diverse and not too generic
  const genericKeywords = ['development', 'software', 'engineering', 'technology', 'best practices'];
  const hasGenericKeywords = payload.keywords.some(keyword => 
    genericKeywords.some(generic => keyword.toLowerCase().includes(generic))
  );
  if (hasGenericKeywords && payload.keywords.length < 6) {
    throw new Error('Generated article keywords are too generic - needs more specific technical terms');
  }
}

