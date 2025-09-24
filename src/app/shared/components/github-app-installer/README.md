# GitHub App Installer Component

A reusable Angular component for GitHub App installation and repository selection with user profile persistence.

## Features

- GitHub App installation flow
- Installation ID management with localStorage and user profile persistence
- Automatic population from user profile when available
- Repository loading and selection
- Customizable title, description, and footer text
- Event emissions for parent component integration
- Responsive design 
- Seamless integration with user authentication system

## Usage

### Basic Usage

```html
<app-github-app-installer></app-github-app-installer>
```

### With Custom Configuration

```html
<app-github-app-installer
  [title]="'Custom Title'"
  [description]="'Custom description text'"
  [showFooter]="false"
  (installationComplete)="onInstallationComplete($event)"
  (repositorySelected)="onRepositorySelected($event)"
></app-github-app-installer>
```

### In Component TypeScript

```typescript
import { Component } from '@angular/core';

type GitHubAppInstallationData = {
  installationId: string;
  repoFullName: string;
  repositories: RepositorySummary[];
};

@Component({
  selector: 'app-example',
  template: `
    <app-github-app-installer
      (installationComplete)="onInstallationComplete($event)"
      (repositorySelected)="onRepositorySelected($event)"
    ></app-github-app-installer>
  `
})
export class ExampleComponent {
  onInstallationComplete(data: GitHubAppInstallationData): void {
    console.log('Installation completed:', data);
    // Handle installation completion
  }

  onRepositorySelected(repoFullName: string): void {
    console.log('Repository selected:', repoFullName);
    // Handle repository selection
  }
}
```

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | `'Start with the gitPlumbers App'` | Main title text |
| `description` | `string` | `'Install the GitHub App...'` | Description text |
| `showFooter` | `boolean` | `true` | Whether to show footer text |
| `footerText` | `string` | `'Need an NDA...'` | Footer text content |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `installationComplete` | `GitHubAppInstallationData` | Emitted when installation is completed |
| `repositorySelected` | `string` | Emitted when a repository is selected |

## Styling

The component includes comprehensive SCSS styling with:
- Responsive design for mobile and desktop
- Dark mode support
- Customizable color scheme
- Accessible form controls
- Loading states and error handling

## User Profile Integration

The component automatically integrates with the user authentication system:

### Automatic Population
- When a user is logged in, the component automatically checks their profile for a saved GitHub installation ID
- If found, the installation ID field is pre-populated and repositories are automatically loaded
- This provides a seamless experience for returning users

### Profile Persistence
- When a user successfully installs the GitHub App, the installation ID is automatically saved to their user profile
- The installation ID persists across devices and browser sessions
- Users can clear their installation data, which removes it from both localStorage and their profile

### Fallback Strategy
The component uses a multi-tier approach for installation ID retrieval:
1. **URL Parameters**: Installation ID from GitHub App redirect
2. **localStorage**: Browser-specific storage for immediate access
3. **User Profile**: Persistent storage tied to the user account
4. **Manual Entry**: User can manually enter an installation ID

## Dependencies

- Angular Reactive Forms
- PrimeNG Button component
- Angular HttpClient
- Angular Signals (for modern Angular patterns)
- AuthUserService (for user profile integration)

## Environment Configuration

The component requires the following environment variables:

```typescript
export const environment = {
  github: {
    appInstallUrl: 'https://github.com/apps/your-app/installations/new',
    appListingUrl: 'https://github.com/apps/your-app',
    apiBaseUrl: 'https://your-api-domain.com/api'
  }
};
```
