import {
  Component,
  inject,
  input,
  output,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';

import { AuthUserService } from '../../services/auth-user.service';
import { GitHubIssuesService } from '../../services/github-issues.service';
import { CreateGitHubIssueRequest } from '../../models/github-issue.model';

export interface GitHubIssueFormData {
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature' | 'support' | 'question' | 'other';
  repository: string;
  installationId: string;
}

@Component({
  selector: 'app-github-issue-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './github-issue-form.component.html',
  styleUrls: ['./github-issue-form.component.scss'],
})
export class GitHubIssueFormComponent implements OnInit {
  // Inputs
  readonly repository = input.required<string>();
  readonly installationId = input.required<string>();
  readonly showForm = input<boolean>(false);

  // Outputs
  readonly issueCreated = output<GitHubIssueFormData>();
  readonly formCancelled = output<void>();

  private readonly _messageService = inject(MessageService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _fb = inject(FormBuilder);
  private readonly _authUserService = inject(AuthUserService);
  private readonly _githubIssuesService = inject(GitHubIssuesService);

  issueForm: FormGroup;
  isSubmitting = false;

  readonly priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  readonly categoryOptions = [
    { label: 'Bug Report', value: 'bug' },
    { label: 'Feature Request', value: 'feature' },
    { label: 'Support Request', value: 'support' },
    { label: 'Question', value: 'question' },
    { label: 'Other', value: 'other' },
  ];

  constructor() {
    this.issueForm = this._fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      body: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(4000)]],
      priority: ['medium', [Validators.required]],
      category: ['support', [Validators.required]],
    });

    // Watch for form changes to provide real-time validation feedback
    this.issueForm.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        // Clear any previous validation messages
        this.clearValidationMessages();
      });
  }

  ngOnInit(): void {
    // Set default title based on category
    this.issueForm.controls['category'].valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((category) => {
        const titleControl = this.issueForm.controls['title'];
        if (!titleControl.value || titleControl.value.startsWith('[')) {
          const defaultTitle = this.getDefaultTitleForCategory(category);
          titleControl.setValue(defaultTitle);
        }
      });
  }

  async onSubmit(): Promise<void> {
    if (this.issueForm.invalid) {
      this.markFormGroupTouched();
      this.showValidationErrors();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.issueForm.value;
    const profile = this._authUserService.profile();

    if (!profile) {
      this._messageService.add({
        severity: 'error',
        summary: 'Authentication Required',
        detail: 'Please log in to create a GitHub issue.',
      });
      this.isSubmitting = false;
      return;
    }

    const request: CreateGitHubIssueRequest = {
      title: this.formatTitle(formValue.title, formValue.category, formValue.priority),
      body: this.formatBody(formValue.body, formValue.category, formValue.priority),
      repository: this.repository(),
      installationId: this.installationId(),
      userEmail: profile.email,
      userName: profile.displayName,
      userId: profile.uid,
    };

    try {
      const result = await this._githubIssuesService.createIssue(request).toPromise();
      
      if (result?.success) {
        this._messageService.add({
          severity: 'success',
          summary: 'GitHub Issue Created',
          detail: 'Your GitHub issue has been created successfully and will appear in your dashboard.',
        });

        // Emit the form data for parent component
        this.issueCreated.emit({
          title: formValue.title,
          body: formValue.body,
          priority: formValue.priority,
          category: formValue.category,
          repository: this.repository(),
          installationId: this.installationId(),
        });

        // Reset form
        this.resetForm();
      } else {
        this._messageService.add({
          severity: 'error',
          summary: 'Failed to Create Issue',
          detail: result?.error || 'Unable to create GitHub issue. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create GitHub issue. Please try again.',
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.resetForm();
    this.formCancelled.emit();
  }

  private formatTitle(title: string, category: string, priority: string): string {
    const categoryPrefix = this.getCategoryPrefix(category);
    const priorityPrefix = this.getPriorityPrefix(priority);
    return `[gitPlumbers] ${categoryPrefix}${priorityPrefix}${title}`;
  }

  private formatBody(body: string, category: string, priority: string): string {
    const categoryInfo = this.getCategoryInfo(category);
    const priorityInfo = this.getPriorityInfo(priority);
    
    return `## Issue Details

**Category:** ${categoryInfo}
**Priority:** ${priorityInfo}
**Created via:** gitPlumbers dashboard

---

## Description

${body}`;
  }

  private getDefaultTitleForCategory(category: string): string {
    switch (category) {
      case 'bug':
        return 'Bug Report';
      case 'feature':
        return 'Feature Request';
      case 'support':
        return 'Support Request';
      case 'question':
        return 'Question';
      case 'other':
        return 'General Inquiry';
      default:
        return 'Support Request';
    }
  }

  private getCategoryPrefix(category: string): string {
    switch (category) {
      case 'bug':
        return '🐛 ';
      case 'feature':
        return '✨ ';
      case 'support':
        return '🆘 ';
      case 'question':
        return '❓ ';
      case 'other':
        return '📝 ';
      default:
        return '🆘 ';
    }
  }

  private getPriorityPrefix(priority: string): string {
    switch (priority) {
      case 'urgent':
        return '🚨 ';
      case 'high':
        return '⚠️ ';
      case 'medium':
        return '';
      case 'low':
        return '📋 ';
      default:
        return '';
    }
  }

  private getCategoryInfo(category: string): string {
    switch (category) {
      case 'bug':
        return 'Bug Report';
      case 'feature':
        return 'Feature Request';
      case 'support':
        return 'Support Request';
      case 'question':
        return 'Question';
      case 'other':
        return 'General Inquiry';
      default:
        return 'Support Request';
    }
  }

  private getPriorityInfo(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Urgent - Requires immediate attention';
      case 'high':
        return 'High - Important issue';
      case 'medium':
        return 'Medium - Standard priority';
      case 'low':
        return 'Low - Can be addressed when convenient';
      default:
        return 'Medium - Standard priority';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.issueForm.controls).forEach(key => {
      const control = this.issueForm.get(key);
      control?.markAsTouched();
    });
  }

  private showValidationErrors(): void {
    const errors: string[] = [];

    if (this.issueForm.controls['title'].errors) {
      if (this.issueForm.controls['title'].errors['required']) {
        errors.push('Title is required');
      } else if (this.issueForm.controls['title'].errors['minlength']) {
        errors.push('Title must be at least 5 characters long');
      } else if (this.issueForm.controls['title'].errors['maxlength']) {
        errors.push('Title must be less than 200 characters');
      }
    }

    if (this.issueForm.controls['body'].errors) {
      if (this.issueForm.controls['body'].errors['required']) {
        errors.push('Description is required');
      } else if (this.issueForm.controls['body'].errors['minlength']) {
        errors.push('Description must be at least 20 characters long');
      } else if (this.issueForm.controls['body'].errors['maxlength']) {
        errors.push('Description must be less than 4000 characters');
      }
    }

    if (errors.length > 0) {
      this._messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: errors.join(', '),
      });
    }
  }

  private clearValidationMessages(): void {
    // This could be enhanced to clear specific validation messages
    // For now, we rely on the form's built-in validation
  }

  private resetForm(): void {
    this.issueForm.reset({
      title: '',
      body: '',
      priority: 'medium',
      category: 'support',
    });
    this.isSubmitting = false;
  }

  // Getters for template access
  get titleControl() {
    return this.issueForm.controls['title'];
  }

  get bodyControl() {
    return this.issueForm.controls['body'];
  }

  get priorityControl() {
    return this.issueForm.controls['priority'];
  }

  get categoryControl() {
    return this.issueForm.controls['category'];
  }

  getCategoryDescription(category: string): string {
    switch (category) {
      case 'bug':
        return 'Report a bug or unexpected behavior';
      case 'feature':
        return 'Request a new feature or enhancement';
      case 'support':
        return 'Get help with using the service';
      case 'question':
        return 'Ask a question about the service';
      case 'other':
        return 'General inquiry or other request';
      default:
        return '';
    }
  }

  getPriorityDescription(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Critical issue requiring immediate attention';
      case 'high':
        return 'Important issue that should be addressed soon';
      case 'medium':
        return 'Standard priority issue';
      case 'low':
        return 'Low priority, can be addressed when convenient';
      default:
        return '';
    }
  }
}
