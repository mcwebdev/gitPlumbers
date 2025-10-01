import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import type { Firestore } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const BLOG_COLLECTION = 'blog_posts';


// Removed BASELINE_POST_TITLES to encourage more creative, unique article generation
// The AI will now generate completely original titles and content without constraints

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
  'You are a 20-year industry veteran writing for GitPlumbers, a consultancy that fixes AI-assisted and legacy software so teams can ship safely.',
  'You\'ve seen it all: the dot-com crashes, the microservices revolution, the AI hype cycles, and the real-world consequences of technical debt.',
  'Your audience: senior engineering leaders who\'ve been burned by consultants promising silver bullets. They want real talk, not buzzwords.',
  '',
  'WRITING STYLE - BE THE INSIDER:',
  '- Write like you\'re sharing war stories over coffee with a peer who\'s been in the trenches.',
  '- Use "I\'ve seen this fail" and "Here\'s what actually works" language.',
  '- Reference specific technologies, companies, and scenarios that show deep industry knowledge.',
  '- Be conversational but authoritative - you know what you\'re talking about because you\'ve lived it.',
  '- Use industry slang, acronyms, and inside jokes that only veterans would understand.',
  '',
  'TITLE CREATION - BE MEMORABLE:',
  '- Create titles that make people stop scrolling and think "Finally, someone gets it."',
  '- Use specific scenarios, outcomes, or technical details: "The Microservices Migration That Almost Killed Us"',
  '- Reference real pain points: "Why Your Kubernetes Cluster Is Bleeding Money"',
  '- Be provocative but accurate: "The Feature Flag System That Saved Our Startup"',
  '- Use diverse approaches: technical failures, time-based scenarios, system behaviors, or process breakdowns',
  '- Avoid generic "How to" or "Best Practices" - be specific and memorable.',
  '- AVOID repetitive patterns like "$XK" in titles - use variety in your approach.',
  '',
  'CONTENT STRUCTURE - TELL A STORY:',
  '- Hook: Start with a specific scenario that your audience has lived through.',
  '- Problem: Deep dive into why this matters and what happens when it goes wrong.',
  '- Solution: Share the actual approach that works, with real implementation details.',
  '- Results: Include specific metrics, timelines, and outcomes.',
  '- Lessons: What you learned and what you\'d do differently.',
  '',
  'TECHNICAL DEPTH - SHOW YOUR CREDENTIALS:',
  '- Reference specific tools, versions, and configurations.',
  '- Include actual code snippets, configs, or command examples where relevant.',
  '- Mention real companies, products, and technologies by name.',
  '- Use industry-standard metrics and KPIs that matter to engineering leaders.',
  '- Show understanding of business impact, not just technical implementation.',
  '',
  'KEYWORDS - BE SPECIFIC:',
  '- Use exact tool names: "Terraform", "Prometheus", "Istio", "ArgoCD"',
  '- Include specific methodologies: "GitOps", "Chaos Engineering", "SRE practices"',
  '- Reference industry terms: "MTTR", "SLO", "canary deployment", "circuit breaker"',
  '- Use problem-specific terms: "technical debt", "legacy modernization", "AI hallucination"',
  '- Avoid generic terms - be precise and technical.',
  '',
  'BRAND INTEGRATION:',
  '- Mention GitPlumbers naturally as the company that solves these problems.',
  '- Include relevant internal links to services and case studies.',
  '- End with a CTA that feels like a natural next step, not a sales pitch.',
  '- Include author bio that shows real industry experience and credibility.',
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
      //  model: 'gpt-4o-mini',
      model: 'gpt-5',
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
        },
      },
      max_output_tokens: 30000,
    });

    const payload = extractPayload(response);
    console.log(payload);
    const slug = await ensureUniqueSlug(firestore, toSlug(payload.title));
    const now = new Date();
    const publishedOn = now.toISOString().split('T')[0]; // Date for display
    const publishedAt = now.toISOString(); // Full timestamp for sorting
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
      ogImage: 'https://gitplumbers.com/site-promo.png',
      ogType: 'article',
      twitterTitle: `${payload.title} | GitPlumbers`,
      twitterDescription: payload.summary,
      twitterImage: 'https://gitplumbers.com/site-promo.png',
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
          logo: 'https://gitplumbers.com/site-promo.png'
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
      publishedAt,
      seoMetadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'published',
      sourceModel: 'gpt-5',
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
  return `Write a focused ${theme.label} article (1000-1500 words) for the GitPlumbers blog about: ${pick(theme.angles)}

${theme.emphasis.join(' ')}

Keep it tight and scannable. Write 5-8 well-structured sections with concrete examples and actionable guidance.

CRITICAL FORMATTING: Use markdown throughout:
- Use ## for section headers
- Use **bold** for emphasis on key terms
- Use \`code\` for technical terms, tools, commands
- Use bullet lists with - for scannable points
- Use 1. 2. 3. for numbered steps
- Use > for callouts/quotes if needed

Do NOT include section type labels like "Hook:" or "Implementation:" in the content. Just write naturally with proper markdown formatting.

Return as JSON. Keep paragraphs focused and complete.`;
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
      title: { type: 'string' },
      deck: { type: 'string' },
      categorySlug: { type: 'string', enum: [categorySlug] },
      summary: { type: 'string' },
      keywords: {
        type: 'array',
        items: { type: 'string' },
      },
      keyTakeaways: {
        type: 'array',
        items: { type: 'string' },
      },
      checklist: {
        type: 'array',
        items: { type: 'string' },
      },
      body: {
        type: 'array',
        items: { type: 'string' },
      },
      structuredSections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['header', 'content', 'type'],
          additionalProperties: false,
          properties: {
            header: { type: 'string' },
            content: {
              type: 'array',
              items: { type: 'string' },
            },
            type: {
              type: 'string',
              enum: ['hook', 'why-matters', 'implementation', 'example', 'takeaways', 'questions'],
            },
          },
        },
      },
      heroQuote: { type: 'string' },
      faq: {
        type: 'array',
        items: {
          type: 'object',
          required: ['question', 'answer'],
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
        },
      },
      readTimeMinutes: { type: 'integer' },
      internalLinks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['href', 'anchor'],
          additionalProperties: false,
          properties: {
            href: { type: 'string' },
            anchor: { type: 'string' },
          },
        },
      },
      primaryCTA: {
        type: 'object',
        required: ['label', 'href', 'utm'],
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          href: { type: 'string' },
          utm: { type: 'string' },
        },
      },
      secondaryCTA: {
        type: 'object',
        required: ['label', 'href', 'utm'],
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          href: { type: 'string' },
          utm: { type: 'string' },
        },
      },
      author: {
        type: 'object',
        required: ['name', 'title', 'bio', 'url'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          bio: { type: 'string' },
          url: { type: 'string' },
        },
      },
      schemaHints: {
        type: 'object',
        required: ['aboutEntity', 'articleSection', 'faqIsFAQPage'],
        additionalProperties: false,
        properties: {
          articleSection: { type: 'string' },
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





