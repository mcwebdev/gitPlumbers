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
];

type CategorySlug = 'culture' | 'ai-delivery' | 'guides' | 'case-studies';

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

const CATEGORY_THEMES: CategoryTheme[] = [
  {
    slug: 'ai-delivery',
    label: 'AI in Production',
    angles: [
      'Design an evaluation harness that keeps generative features accountable before, during, and after release.',
      'Codify rollback guardrails for AI-assisted applications handling regulated data.',
      'Quantify the business impact of AI augmentations with instrumentation and experimentation.',
    ],
    emphasis: [
      'Stress instrumentation, observability, and safety guardrails for AI-enabled flows.',
      'Reference real-world failure modes and how to mitigate them.',
    ],
  },
  {
    slug: 'culture',
    label: 'Culture & Process',
    angles: [
      'Create decision-making cadences that keep modernization aligned with product delivery.',
      'Coach engineering leadership teams on balancing roadmap and remediation work.',
      'Build feedback loops that convert incident reviews into modernization backlogs.',
    ],
    emphasis: [
      'Highlight communication rituals, leadership behaviors, and measurable outcomes.',
      'Keep recommendations concrete and grounded in enterprise realities.',
    ],
  },
  {
    slug: 'guides',
    label: 'Technical Guide',
    angles: [
      'Walk through hardening a legacy service with progressive observability adoption.',
      'Sequence a modernization project using reversible slices and safety nets.',
      'Deliver a hands-on checklist for migrating a critical workload without downtime.',
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
      'Outline an anonymised engagement where modernization unblocked a critical launch.',
      'Show how GitPlumbers stabilized an AI-assisted application under real load.',
      'Demonstrate the ROI of pairing modernization guardrails with delivery coaching.',
    ],
    emphasis: [
      'Include industry context, constraints, and measurable outcomes or metrics.',
      'Frame the narrative around challenges, interventions, and specific results.',
    ],
  },
];

const SYSTEM_PROMPT = [
  'You are the editorial AI for GitPlumbers, a consultancy that fixes AI-assisted software so teams can ship safely.',
  'Write for pragmatic senior engineering leaders who expect specifics, proof, and operational maturity.',
  'Tone: candid, data-backed, and implementation-focused. Avoid fluff or generic platitudes.',
].join(' ');

export const generateBlogArticleHourly = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'Etc/UTC',
    region: 'us-central1',
    secrets: [OPENAI_API_KEY],
    retryConfig: {
      retryCount: 2,
      minBackoffSeconds: 120,
      maxBackoffSeconds: 600,
    },
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
      model: 'gpt-4.1-mini',
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
      response_format: {
        type: 'json_schema',
        strict: true,
        name: 'GitPlumbersBlogArticle',
        schema: buildArticleSchema(theme.slug),
        description:
          'Structured blog article data for GitPlumbers including summary, body paragraphs, checklist, and FAQs.',
      },
      temperature: 0.6,
      max_output_tokens: 1500,
    });

    const payload = extractPayload(response);

    validatePayload(payload, theme.slug);

    const slug = await ensureUniqueSlug(firestore, toSlug(payload.title));
    const publishedOn = new Date().toISOString().split('T')[0];
    const readTimeMinutes = Number.isFinite(payload.readTimeMinutes)
      ? Math.min(10, Math.max(5, Math.round(payload.readTimeMinutes)))
      : 7;
    const readTime = `${readTimeMinutes} minute read`;

    const document = {
      ...payload,
      readTimeMinutes,
      slug,
      readTime,
      publishedOn,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'draft',
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
    sections.push(`Avoid overlapping topics or phrasing with these existing posts: ${avoided.join(' | ')}`);
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
            question: {
              type: 'string',
              minLength: 12,
              maxLength: 120,
            },
            answer: {
              type: 'string',
              minLength: 60,
              maxLength: 260,
            },
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
  const output = response.output_text ?? collectJsonString(response);
  if (!output) {
    throw new Error('OpenAI response did not include any output text');
  }
  return JSON.parse(output) as GeneratedArticlePayload;
}

function collectJsonString(response: OpenAI.Responses.Response): string | undefined {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) {
        return content.text;
      }
      // @ts-expect-error - json_schema content is not yet in the published types.
      if (content.type === 'json_schema' && content.json_schema?.output) {
        // @ts-expect-error - json_schema.output is included at runtime.
        return content.json_schema.output as string;
      }
    }
  }
  return undefined;
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
