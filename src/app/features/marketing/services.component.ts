import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  ngOnInit(): void {
    this._seoService.updateMetadata({
      title: 'Code Optimization Services | React, Angular, Vue, Node.js Experts',
      description:
        'Comprehensive code optimization services for React, Angular, Vue, Node.js, and Python. Enterprise modernization, technical debt resolution, and performance optimization.',
      keywords:
        'code optimization services, React optimization, Angular performance, Vue.js consulting, Node.js scaling, Python modernization',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/services',
    });
  }

  protected readonly services = [
    {
      title: 'AI Code Optimization',
      description: 'Transform AI-generated codebases into production-ready applications',
      features: [
        'Performance optimization',
        'Security hardening',
        'Architecture refactoring',
        'Test implementation',
      ],
      frameworks: ['React', 'Angular', 'Vue', 'Node.js', 'Python'],
    },
    {
      title: 'Enterprise Modernization',
      description: 'Modernize legacy applications with latest frameworks and best practices',
      features: [
        'Legacy system migration',
        'Technology stack upgrades',
        'Scalability improvements',
        'Performance monitoring',
      ],
      frameworks: ['React', 'Angular', 'Vue', 'Node.js'],
    },
    {
      title: 'Technical Debt Resolution',
      description: 'Systematic approach to reducing technical debt and improving code quality',
      features: [
        'Code quality assessment',
        'Refactoring strategies',
        'Documentation improvement',
        'Team training',
      ],
      frameworks: ['JavaScript', 'TypeScript', 'React', 'Angular', 'Vue'],
    },
  ];

  protected readonly processSteps = [
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
      description: 'Complete documentation and team training to maintain improvements',
    },
  ];
}
