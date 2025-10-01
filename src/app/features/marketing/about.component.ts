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
      ogUrl: 'https://gitplumbers.com/about/',
    });
  }

  protected readonly teamMembers = [
    {
      name: 'Matthew Charlton',
      title: 'Senior Frontend Developer & Cloud Solutions Architect',
      experience: '10+ years',
      expertise: ['Angular', 'Cloud-Native Full Stack', 'CI/CD Automation'],
      background:
        'Accomplished frontend developer delivering enterprise Angular applications with cloud-backed full-stack solutions that cut deployment time and cost by up to 50%.',
      achievements: [
        'DeepSpeed AI senior engineer driving AI-driven features and real-time integrations',
        'Portfolio: angularux.com with a dozen AI demos',
        'GitHub: github.com/mcwebdev and YouTube: youtube.com/watch?v=l6pMNg6vllk',
      ],
      linkedin: 'https://linkedin.com/in/mattcharlton',
    },
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
    {
      name: 'Priya Patel',
      title: 'Cloud-Native Transformation Lead',
      experience: '11+ years',
      expertise: ['AWS Migration', 'Microservices', 'DevOps Automation'],
      background:
        'Guided Fortune 500 enterprises through large-scale cloud modernization programs while leading cross-functional delivery teams at Accenture.',
      achievements: [
        'AWS Certified Solutions Architect Professional',
        'Migrated 200+ workloads with zero unplanned downtime',
        'Designed reusable DevOps accelerator adopted by 14 enterprise teams',
      ],
    },
    {
      name: 'Diego Ramirez',
      title: 'Principal DevOps Strategist',
      experience: '13+ years',
      expertise: ['Kubernetes', 'Observability', 'Security Automation'],
      background:
        'Former Spotify SRE who built multi-region delivery pipelines and compliance automation for highly regulated media workloads.',
      achievements: [
        'Speaker at KubeCon Europe 2024 on resilient GitOps',
        'Created open-source Helm toolkit used by 3k+ teams',
        'Implemented SOC2-ready delivery process in 90 days',
      ],
    },
    {
      name: 'Elena Petrova',
      title: 'Lead Data Platform Engineer',
      experience: '12+ years',
      expertise: ['Python', 'ML Ops', 'Data Pipelines'],
      background:
        'Architected petabyte-scale analytics platforms at Yandex and led ML observability rollouts across distributed teams.',
      achievements: [
        'Author of ML pipeline governance guidelines adopted company-wide',
        'Improved model deployment throughput by 65%',
        'IEEE Software contributor on ML observability practices',
      ],
    },
    {
      name: 'Noah Williams',
      title: 'Staff Mobile Architect',
      experience: '9+ years',
      expertise: ['React Native', 'Flutter', 'Offline-first Architecture'],
      background:
        'Scaled fintech mobile applications serving 30M+ users with secure offline-first experiences and modular design systems.',
      achievements: [
        'Led mobile rewrite that cut crash rate by 72%',
        'Published OSS offline syncing library adopted by 40+ startups',
        'Coached teams on WCAG compliance for mobile experiences',
      ],
    },
    {
      name: 'Aisha Khan',
      title: 'Head of Accessibility Engineering',
      experience: '14+ years',
      expertise: ['WCAG', 'Design Systems', 'Inclusive UX Audits'],
      background:
        'Drives accessibility-first product development for global media brands, ensuring inclusive experiences from design to delivery.',
      achievements: [
        'Certified Professional in Accessibility Core Competencies',
        'Built accessibility training program adopted by 8 product orgs',
        'Reduced audit remediation time by 55% through automated checks',
      ],
    },
    {
      name: 'Tomoko Sato',
      title: 'Principal Design Systems Engineer',
      experience: '10+ years',
      expertise: ['Design Tokens', 'Component Libraries', 'Cross-platform UX'],
      background:
        'Led cross-platform design system initiatives at Sony, aligning product, design, and engineering for rapid multi-brand launches.',
      achievements: [
        'Scaled design system supporting 25 product surfaces',
        'Cut UI defect rate by 40% via automated visual regression',
        'Design Matters Tokyo speaker on token-driven workflows',
      ],
    },
    {
      name: 'Liam O\'Connor',
      title: 'Senior Security Engineer',
      experience: '15+ years',
      expertise: ['Application Security', 'Threat Modeling', 'Zero Trust'],
      background:
        'Former Atlassian security lead specializing in secure-by-design frameworks and continuous threat modeling for SaaS platforms.',
      achievements: [
        'Implemented zero trust rollout for 60k users',
        'OWASP community contributor and workshop host',
        'Reduced critical vulnerabilities by 78% year over year',
      ],
    },
    {
      name: 'Gabriela Souza',
      title: 'Lead QA Automation Architect',
      experience: '12+ years',
      expertise: ['End-to-End Testing', 'CI/CD Quality Gates', 'Test Data Strategy'],
      background:
        'Developed enterprise-wide automation frameworks for fintech and healthcare organizations across LATAM and North America.',
      achievements: [
        'Reduced regression cycle time from 5 days to 6 hours',
        'Built synthetic data service adopted by 18 squads',
        'Speaker at TestCon 2023 on resilient CI quality gates',
      ],
    },
    {
      name: 'Ethan Walker',
      title: 'Backend Scalability Specialist',
      experience: '11+ years',
      expertise: ['Event-Driven Architecture', 'Go', 'Distributed Caching'],
      background:
        'Scaled real-time logistics platforms processing 5M+ events per minute while leading performance tiger teams.',
      achievements: [
        'Cut p99 latency by 63% through targeted caching strategy',
        'Published open-source tracing middleware for Go services',
        'Mentored teams on chaos engineering and resilience',
      ],
    },
    {
      name: 'Nadia Hassan',
      title: 'AI Transformation Consultant',
      experience: '9+ years',
      expertise: ['Generative AI', 'Product Discovery', 'Change Management'],
      background:
        'Helps enterprise product teams adopt responsible AI workflows, from ideation through human-in-the-loop deployment.',
      achievements: [
        'Launched AI feature incubator accelerating roadmap validation by 4x',
        'Certified Prosci change practitioner',
        'Advised C-suite on AI governance across 3 regulated industries',
      ],
    },
    {
      name: 'Victor Nguyen',
      title: 'Site Reliability Leader',
      experience: '13+ years',
      expertise: ['Incident Response', 'Observability', 'Capacity Planning'],
      background:
        'Guided global SRE teams at Shopify focusing on proactive capacity models and measurable reliability programs.',
      achievements: [
        'Reduced MTTR by 48% with automated playbooks',
        'Introduced error budget policy adopted by 40+ services',
        'Speaker at SREcon Americas 2023',
      ],
    },
    {
      name: 'Isabella Rossi',
      title: 'Frontend Performance Architect',
      experience: '10+ years',
      expertise: ['Web Vitals', 'Edge Rendering', 'Design Systems'],
      background:
        'Optimized high-traffic ecommerce storefronts across Europe delivering consistent sub-second experiences.',
      achievements: [
        'Achieved 95+ Core Web Vitals scores across 18 brands',
        'Created performance budget tooling integrated with CI',
        'Chrome Dev Summit presenter on edge rendering patterns',
      ],
    },
    {
      name: 'Carlos Mendes',
      title: 'Data-Driven Product Engineer',
      experience: '8+ years',
      expertise: ['Experimentation Platforms', 'TypeScript', 'Analytics Engineering'],
      background:
        'Built experimentation frameworks enabling rapid A/B testing for subscription media products.',
      achievements: [
        'Tripled test velocity via self-serve experimentation tools',
        'Developed analytics starter kit adopted by 25 squads',
        'Guest lecturer on data-informed product decisions',
      ],
    },
    {
      name: 'Mei Lin',
      title: 'Full-Stack Modernization Architect',
      experience: '12+ years',
      expertise: ['Java', 'Spring Boot', 'Angular'],
      background:
        'Leads legacy modernization projects transforming monolithic Java stacks into modular, cloud-ready platforms.',
      achievements: [
        'Migrated 4 core banking suites without service interruption',
        'Created modernization playbook reused across 6 business units',
        'Certified Scrum Professional with focus on technical coaching',
      ],
    },
    {
      name: 'David Brooks',
      title: 'Principal Data Reliability Engineer',
      experience: '15+ years',
      expertise: ['Data Governance', 'Streaming Systems', 'Scala'],
      background:
        'Former LinkedIn architect ensuring trustworthy analytics and governance across high-volume streaming platforms.',
      achievements: [
        'Reduced data incident rate by 70% with automated lineage',
        'Co-authored internal DataOps maturity model',
        'Regular speaker at Data Council events',
      ],
    },
    {
      name: 'Sofia Ivanova',
      title: 'Head of Product Delivery',
      experience: '11+ years',
      expertise: ['Agile Coaching', 'Portfolio Management', 'Product Operations'],
      background:
        'Scaled product delivery offices for global SaaS scaleups, aligning strategy, execution, and customer outcomes.',
      achievements: [
        'Launched product ops guild improving release predictability by 35%',
        'Implemented OKR program adopted across 9 departments',
        'Certified Scrum@Scale practitioner and trainer',
      ],
    },
    {
      name: 'Jamal Carter',
      title: 'Principal Platform Engineer',
      experience: '13+ years',
      expertise: ['Platform Engineering', 'InnerSource', 'Developer Experience'],
      background:
        'Built self-service platforms and paved golden paths that reduced onboarding friction for 300+ engineers.',
      achievements: [
        'Cut service provisioning time from weeks to minutes',
        'Published InnerSource playbook for enterprise reuse',
        'Host of DevEx North America community meetups',
      ],
    },
    {
      name: 'Hannah Schultz',
      title: 'Senior Analytics Translator',
      experience: '8+ years',
      expertise: ['Data Storytelling', 'Product Analytics', 'Stakeholder Alignment'],
      background:
        'Connects data teams and executives to ensure analytics investment drives measurable customer and revenue outcomes.',
      achievements: [
        'Built executive analytics dashboards adopted by 12 business units',
        'Certified Looker developer and Snowflake data analyst',
        'Keynote speaker on decision intelligence at MeasureCamp Berlin',
      ],
    },
    {
      name: 'Lucas Martins',
      title: 'Edge Infrastructure Architect',
      experience: '12+ years',
      expertise: ['CDN Strategy', 'Serverless', 'Global Networking'],
      background:
        'Designed low-latency edge platforms powering international gaming and streaming experiences.',
      achievements: [
        'Reduced global response times by 45% via edge routing',
        'Implemented cost-aware serverless strategy saving $2M annually',
        'Regular author on pragmatic edge patterns',
      ],
    },
    {
      name: 'Chloe Bennett',
      title: 'Senior Technical Program Manager',
      experience: '10+ years',
      expertise: ['Cross-functional Delivery', 'Risk Management', 'Stakeholder Reporting'],
      background:
        'Orchestrated multi-track modernization initiatives blending engineering, design, and compliance requirements.',
      achievements: [
        'Drove portfolio delivering 18 concurrent programs on schedule',
        'Introduced risk heatmap process adopted by enterprise PMO',
        'PMP and SAFe SPC certified coach',
      ],
    },
    {
      name: 'Arun Krishnan',
      title: 'Data Security & Privacy Architect',
      experience: '14+ years',
      expertise: ['Privacy Engineering', 'Data Encryption', 'Regulatory Compliance'],
      background:
        'Helps organizations design privacy-by-default architectures that meet GDPR, HIPAA, and emerging AI regulations.',
      achievements: [
        'Implemented privacy impact framework used across 40 products',
        'Certified Information Privacy Technologist (IAPP)',
        'Led remediation that passed 3 consecutive external audits',
      ],
    },
  ];

  protected readonly companyStats = [
    { number: '500+', label: 'Projects Completed' },
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
      icon: '🤝',
    },
    {
      title: 'Transparency',
      description: 'Clear communication, detailed reporting, and honest recommendations.',
      icon: '🔍',
    },
  ];
}

