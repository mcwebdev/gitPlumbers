export interface GitHubIssue {
  id: string;
  githubIssueId: number; // GitHub's issue number
  githubIssueUrl: string; // Full GitHub URL
  title: string;
  body: string;
  status: GitHubIssueStatus;
  repository: string; // Full repo name (owner/repo)
  repositoryUrl: string; // GitHub repo URL
  userEmail: string; // User who created the issue
  userName?: string;
  userId: string; // Firebase user ID
  installationId: string; // GitHub App installation ID
  createdAt: Date;
  updatedAt: Date;
  githubCreatedAt: string; // GitHub's creation timestamp
  githubUpdatedAt: string; // GitHub's last update timestamp
  labels: string[]; // GitHub labels
  assignees: string[]; // GitHub assignees
  comments: GitHubIssueComment[];
  notes: GitHubIssueNote[]; // Internal notes from gitPlumbers team
}

export interface GitHubIssueComment {
  id: string;
  author: string;
  authorType: 'user' | 'bot' | 'admin';
  body: string;
  createdAt: Date;
  githubCommentId?: number;
}

export interface GitHubIssueNote {
  id: string;
  authorName: string;
  authorEmail: string;
  role: 'admin' | 'customer';
  message: string;
  createdAt: Date;
  isInternal: boolean; // Internal notes not visible to customer
}

export type GitHubIssueStatus = 
  | 'open' 
  | 'in_progress' 
  | 'waiting_on_user' 
  | 'resolved' 
  | 'closed';

export interface CreateGitHubIssueRequest {
  title: string;
  body: string;
  repository: string; // Full repo name (owner/repo)
  installationId: string;
  userEmail: string;
  userName?: string;
  userId: string;
}

export interface CreateGitHubIssueResponse {
  success: boolean;
  issue?: GitHubIssue;
  error?: string;
  githubIssueUrl?: string;
}
