import { Injectable, inject } from '@angular/core';
import { SeoService } from './seo.service';

export interface AiOptimizedContent {
  title: string;
  description: string;
  content: string;
  keywords: string[];
  semanticKeywords: string[];
  readabilityScore: number;
  aiCitationPotential: number;
}

export interface CompetitorAnalysis {
  domain: string;
  topContent: {
    url: string;
    title: string;
    traffic: number;
    contentType: 'blog' | 'guide' | 'case-study' | 'landing';
    topics: string[];
  }[];
  contentGaps: string[];
  keywordOpportunities: string[];
}

@Injectable({ providedIn: 'root' })
export class AiSeoService {
  private readonly _seoService = inject(SeoService);

  /**
   * Generate AI-optimized content metadata for better LLM visibility
   */
  generateAiOptimizedMetadata(content: string, targetKeywords: string[]): AiOptimizedContent {
    // This would integrate with AI tools like Claude/GPT for content optimization
    // For now, providing the structure and basic optimization rules

    const semanticKeywords = this.extractSemanticKeywords(content, targetKeywords);
    const readabilityScore = this.calculateReadabilityScore(content);
    const aiCitationPotential = this.assessAiCitationPotential(content);

    return {
      title: this.optimizeTitle(content, targetKeywords),
      description: this.generateDescription(content, targetKeywords),
      content: this.optimizeContent(content, targetKeywords, semanticKeywords),
      keywords: targetKeywords,
      semanticKeywords,
      readabilityScore,
      aiCitationPotential,
    };
  }

  /**
   * Optimize content for AI search engines and LLMs
   */
  private optimizeTitle(content: string, keywords: string[]): string {
    // AI-optimized title generation logic
    const primaryKeyword = keywords[0];
    const contentLength = content.length;

    // For technical content, include specific frameworks/technologies
    if (content.includes('React') || content.includes('Angular') || content.includes('Vue')) {
      const framework = content.match(/(React|Angular|Vue|Node\.js|Python)/gi)?.[0] || '';
      return `${primaryKeyword} in ${framework} | GitPlumbers Expert Guide`;
    }

    return `${primaryKeyword} | Expert Technical Insights | GitPlumbers`;
  }

  private generateDescription(content: string, keywords: string[]): string {
    // Extract first meaningful paragraph and optimize for AI
    const sentences = content.split('.').slice(0, 3);
    const description = sentences.join('. ') + '.';

    // Ensure primary keyword appears early
    const primaryKeyword = keywords[0];
    if (!description.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      return `${primaryKeyword}: ${description}`;
    }

    return description;
  }

  private optimizeContent(content: string, keywords: string[], semanticKeywords: string[]): string {
    // Content optimization for better AI understanding
    let optimizedContent = content;

    // Add semantic keywords naturally
    semanticKeywords.forEach((keyword) => {
      if (!optimizedContent.toLowerCase().includes(keyword.toLowerCase())) {
        // Find appropriate insertion points
        const paragraphs = optimizedContent.split('\n\n');
        if (paragraphs.length > 2) {
          paragraphs[1] += ` This approach to ${keyword} ensures better maintainability.`;
          optimizedContent = paragraphs.join('\n\n');
        }
      }
    });

    return optimizedContent;
  }

  private extractSemanticKeywords(content: string, targetKeywords: string[]): string[] {
    // Extract semantic keywords based on content analysis
    const semanticMap: Record<string, string[]> = {
      'code optimization': ['performance tuning', 'code quality', 'refactoring', 'technical debt'],
      'enterprise modernization': [
        'legacy migration',
        'system upgrade',
        'architecture improvement',
      ],
      React: ['component optimization', 'state management', 'performance patterns'],
      Angular: ['dependency injection', 'change detection', 'lazy loading'],
      Vue: ['composition api', 'reactivity system', 'component composition'],
      'Node.js': ['async patterns', 'microservices', 'API optimization'],
      Python: ['code structure', 'package management', 'performance optimization'],
    };

    const semanticKeywords: string[] = [];
    targetKeywords.forEach((keyword) => {
      const related = semanticMap[keyword.toLowerCase()];
      if (related) {
        semanticKeywords.push(...related);
      }
    });

    return [...new Set(semanticKeywords)];
  }

  private calculateReadabilityScore(content: string): number {
    // Simple readability calculation (Flesch Reading Ease approximation)
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const syllables = this.countSyllables(content);

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(text: string): number {
    // Simplified syllable counting
    return (
      text
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .replace(/[aeiouy]+/g, 'a')
        .replace(/a$/, '').length || 1
    );
  }

  private assessAiCitationPotential(content: string): number {
    let score = 0;

    // Factors that increase AI citation potential
    if (content.includes('according to') || content.includes('research shows')) score += 10;
    if (content.includes('case study') || content.includes('real-world example')) score += 15;
    if (content.includes('statistics') || content.includes('data shows')) score += 10;
    if (content.includes('best practices') || content.includes('proven approach')) score += 12;
    if (content.includes('step-by-step') || content.includes('how to')) score += 8;

    // Technical authority indicators
    if (content.includes('performance') && content.includes('optimization')) score += 15;
    if (content.includes('enterprise') && content.includes('scalability')) score += 12;
    if (content.includes('code review') || content.includes('technical debt')) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate structured data for better AI understanding
   */
  generateTechnicalArticleSchema(article: {
    title: string;
    description: string;
    author: string;
    publishedAt: Date;
    technologies: string[];
    difficulty: string;
  }): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'TechnicalArticle',
      headline: article.title,
      description: article.description,
      author: {
        '@type': 'Person',
        name: article.author,
        jobTitle: 'Senior Technical Consultant',
        worksFor: {
          '@type': 'Organization',
          name: 'GitPlumbers',
        },
      },
      publisher: {
        '@type': 'Organization',
        name: 'GitPlumbers',
        url: 'https://gitplumbers-35d92.firebaseapp.com',
      },
      datePublished: article.publishedAt.toISOString(),
      programmingLanguage: article.technologies,
      proficiencyLevel: article.difficulty,
      about: {
        '@type': 'Thing',
        name: 'Software Development',
        sameAs: 'https://en.wikipedia.org/wiki/Software_development',
      },
    };
  }

  /**
   * Analyze competitor content for AI optimization opportunities
   */
  async analyzeCompetitorContent(competitors: string[]): Promise<CompetitorAnalysis[]> {
    // This would integrate with tools like Ahrefs API or similar
    // For now, returning structure for implementation

    return competitors.map((domain) => ({
      domain,
      topContent: [],
      contentGaps: [
        'AI code optimization techniques',
        'Enterprise modernization case studies',
        'Framework-specific performance guides',
      ],
      keywordOpportunities: [
        'AI-generated code cleanup',
        'enterprise React optimization',
        'legacy Angular migration',
      ],
    }));
  }

  /**
   * Generate content briefs optimized for AI search
   */
  generateContentBrief(
    topic: string,
    targetKeywords: string[]
  ): {
    title: string;
    outline: string[];
    targetLength: number;
    keyQuestions: string[];
    competitorGaps: string[];
  } {
    const outlines: Record<string, string[]> = {
      'code optimization': [
        'Introduction to Code Optimization Challenges',
        'Common Performance Bottlenecks in Modern Applications',
        'Framework-Specific Optimization Techniques',
        'Measuring and Monitoring Code Performance',
        'Case Study: Real-World Optimization Results',
        'Best Practices and Implementation Guidelines',
        'Tools and Resources for Continuous Optimization',
      ],
      'enterprise modernization': [
        'Understanding Legacy System Challenges',
        'Planning Your Modernization Strategy',
        'Technology Stack Assessment and Selection',
        'Migration Patterns and Best Practices',
        'Risk Mitigation During Modernization',
        'Measuring Success: KPIs and Metrics',
        'Post-Modernization Optimization and Maintenance',
      ],
    };

    const keyQuestions: Record<string, string[]> = {
      'code optimization': [
        'What are the most common performance bottlenecks?',
        'How do you measure code optimization success?',
        'Which tools provide the best optimization insights?',
        'What are the ROI benefits of code optimization?',
      ],
      'enterprise modernization': [
        'How do you assess modernization readiness?',
        'What are the risks of legacy system migration?',
        'How long does enterprise modernization take?',
        'What technologies should we prioritize?',
      ],
    };

    const topicKey =
      Object.keys(outlines).find((key) => topic.toLowerCase().includes(key)) || 'code optimization';

    return {
      title: this.optimizeTitle(`Content about ${topic}`, targetKeywords),
      outline: outlines[topicKey] || outlines['code optimization'],
      targetLength: 2500, // Optimal for AI citation
      keyQuestions: keyQuestions[topicKey] || keyQuestions['code optimization'],
      competitorGaps: [
        'Lack of specific framework examples',
        'Missing real-world case studies',
        'No measurable results or ROI data',
      ],
    };
  }
}
