import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit {
  private readonly _seoService = inject(SeoService);

  ngOnInit(): void {
    this._seoService.updateMetadata({
      title: 'About GitPlumbers - Expert Network of Senior Developers',
      description:
        'Meet the expert network behind GitPlumbers. Senior developers specializing in enterprise code optimization, modernization, and AI-generated code cleanup.',
      keywords:
        'senior developers, technical experts, code optimization team, enterprise consultants',
      ogUrl: 'https://gitplumbers-35d92.firebaseapp.com/about',
    });
  }

  protected readonly teamMembers = [
    {
      name: 'Alex Rodriguez',
      title: 'Senior React Optimization Specialist',
      experience: '8+ years',
      expertise: ['React Performance', 'Enterprise Modernization', 'Code Optimization'],
      background: 'Former Senior Engineer at Facebook, led 150+ optimization projects',
      achievements: [
        'React Community Contributor 2023',
        'Top 1% Stack Overflow Contributor',
        'Speaker at React Conf 2023',
      ],
    },
    {
      name: 'Sarah Chen',
      title: 'Angular Architecture Expert',
      experience: '10+ years',
      expertise: ['Angular', 'TypeScript', 'Enterprise Architecture'],
      background: 'Ex-Google Angular team member, specialized in large-scale applications',
      achievements: [
        'Angular GDE (Google Developer Expert)',
        'Author of "Angular at Scale"',
        'ng-conf keynote speaker',
      ],
    },
    {
      name: 'Marcus Thompson',
      title: 'Full-Stack Performance Engineer',
      experience: '12+ years',
      expertise: ['Node.js', 'Python', 'System Architecture'],
      background: 'Former Netflix Principal Engineer, optimized streaming infrastructure',
      achievements: [
        'Node.js Foundation contributor',
        'Performance optimization patents',
        'Tech lead for 1B+ user systems',
      ],
    },
  ];

  protected readonly companyStats = [
    { number: '500+', label: 'Projects Completed' },
    { number: '89%', label: 'Client Satisfaction Rate' },
    { number: '67%', label: 'Average Performance Improvement' },
    { number: '24/7', label: 'Expert Support' },
  ];

  protected readonly values = [
    {
      title: 'Technical Excellence',
      description: 'We maintain the highest standards in code quality and architecture decisions.',
      icon: '🎯',
    },
    {
      title: 'Continuous Learning',
      description: 'Our team stays current with the latest technologies and best practices.',
      icon: '📚',
    },
    {
      title: 'Client Success',
      description: 'Your success is our success. We measure our impact by your results.',
      icon: '🚀',
    },
    {
      title: 'Transparency',
      description: 'Clear communication, detailed reporting, and honest recommendations.',
      icon: '💎',
    },
  ];
}
