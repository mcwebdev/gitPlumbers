import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';

// GitHub App credentials
const GITHUB_APP_ID = defineSecret('GITHUB_APP_ID');
const GITHUB_APP_PRIVATE_KEY = defineSecret('GITHUB_APP_PRIVATE_KEY');

interface CreateGitHubIssueRequest {
  title: string;
  body: string;
  repository: string; // Full repo name (owner/repo)
  installationId: string;
  userEmail: string;
  userName?: string;
  userId: string;
}

interface CreateGitHubIssueResponse {
  success: boolean;
  issue?: any;
  error?: string;
  githubIssueUrl?: string;
}


interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
}

/**
 * Generate JWT token for GitHub App authentication
 * @return {string} JWT token for GitHub App authentication
 */
function generateGitHubAppJWT(): string {
  const appId = GITHUB_APP_ID.value();
  let privateKey = GITHUB_APP_PRIVATE_KEY.value();

  console.log('🔍 DEBUG: Raw appId length:', appId?.length || 0);
  console.log('🔍 DEBUG: Raw privateKey length:', privateKey?.length || 0);

  if (!appId || !privateKey) {
    throw new Error('GitHub App ID and Private Key must be configured');
  }

  // Ensure the private key is properly formatted
  privateKey = privateKey
    .replace(/\\n/g, '\n') // Replace escaped newlines
    .replace(/"/g, '') // Remove quotes if present
    .trim();

  // Ensure it starts and ends with proper PEM headers
  if (!privateKey.includes('-----BEGIN')) {
    console.log('🔍 DEBUG: Adding PEM headers to raw key');
    privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
  }

  console.log('🔑 Using GitHub App ID:', appId);
  console.log('🔑 Private key format check:', privateKey.includes('-----BEGIN') ? 'PEM format detected' : 'Raw key detected');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued at time (1 minute ago to account for clock skew)
    exp: now + 600, // Expires in 10 minutes
    iss: appId, // Issuer (GitHub App ID)
  };

  console.log('🔑 JWT payload:', JSON.stringify(payload));

  try {
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    console.log('✅ JWT token generated successfully, length:', token.length);
    return token;
  } catch (error) {
    console.error('💥 JWT generation failed:', error);
    console.error('💥 Error details:', (error as Error).message);
    throw error;
  }
}

/**
 * Get installation access token
 * @param {string} installationId - The GitHub App installation ID
 * @return {Promise<string>} Installation access token
 */
async function getInstallationToken(installationId: string): Promise<string> {
  const jwt = generateGitHubAppJWT();

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'gitPlumbers-App',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to get installation token:', response.status, errorText);
    throw new Error(`Failed to get installation token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Installation token obtained');
  return data.token;
}

/**
 * Create GitHub issue via API
 * @param {string} accessToken - GitHub access token
 * @param {string} repository - Repository name in format owner/repo
 * @param {string} title - Issue title
 * @param {string} body - Issue body content
 * @return {Promise<GitHubIssue>} Created GitHub issue
 */
async function createGitHubIssueViaAPI(
  accessToken: string,
  repository: string,
  title: string,
  body: string
): Promise<GitHubIssue> {
  const [owner, repo] = repository.split('/');

  const issueBody = {
    title,
    body: `${body}\n\n---\n*Created via gitPlumbers dashboard*`,
    labels: ['gitplumbers', 'support-request'],
  };

  console.log('🚀 Creating GitHub issue:', { owner, repo, title });

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'gitPlumbers-App',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issueBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to create GitHub issue:', response.status, errorText);
    throw new Error(`Failed to create GitHub issue: ${response.status} ${errorText}`);
  }

  const issue = await response.json();
  console.log('✅ GitHub issue created:', issue.html_url);
  return issue;
}

/**
 * Store GitHub issue in Firestore
 * @param {GitHubIssue} githubIssue - The GitHub issue object
 * @param {CreateGitHubIssueRequest} request - Original request data
 * @return {Promise<string>} Document ID of stored issue
 */
async function storeGitHubIssueInDatabase(
  githubIssue: GitHubIssue,
  request: CreateGitHubIssueRequest
): Promise<string> {
  const db = getFirestore();

  const issueData = {
    githubIssueId: githubIssue.number,
    githubIssueUrl: githubIssue.html_url,
    title: githubIssue.title,
    body: githubIssue.body,
    status: 'open' as const,
    repository: request.repository,
    repositoryUrl: `https://github.com/${request.repository}`,
    userEmail: request.userEmail,
    userName: request.userName || null,
    userId: request.userId,
    installationId: request.installationId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    githubCreatedAt: githubIssue.created_at,
    githubUpdatedAt: githubIssue.updated_at,
    labels: githubIssue.labels.map((label) => label.name),
    assignees: githubIssue.assignees.map((assignee) => assignee.login),
    comments: [],
    notes: [],
  };

  const docRef = await db.collection('githubIssues').add(issueData);
  console.log('✅ GitHub issue stored in database:', docRef.id);
  return docRef.id;
}

/**
 * Fetch GitHub issues from a repository
 * @param {string} accessToken - GitHub access token
 * @param {string} repository - Repository name in format owner/repo
 * @return {Promise<GitHubIssue[]>} Array of GitHub issues
 */
async function fetchGitHubIssues(accessToken: string, repository: string): Promise<GitHubIssue[]> {
  const [owner, repo] = repository.split('/');

  console.log('🔍 Fetching open GitHub issues for:', { owner, repo });

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`, {
    method: 'GET',
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'gitPlumbers-App',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch GitHub issues:', response.status, errorText);
    throw new Error(`Failed to fetch GitHub issues: ${response.status} ${errorText}`);
  }

  const issues = await response.json();
  console.log('✅ Fetched', issues.length, 'open GitHub issues');
  return issues;
}

/**
 * Store external GitHub issue in Firestore (if not already exists)
 * @param {GitHubIssue} githubIssue - The GitHub issue object
 * @param {string} repository - Repository name
 * @param {string} installationId - Installation ID
 * @param {string} userId - User ID
 * @return {Promise<boolean>} True if issue was stored, false if already exists
 */
async function storeExternalGitHubIssue(
  githubIssue: GitHubIssue,
  repository: string,
  installationId: string,
  userId: string
): Promise<boolean> {
  const db = getFirestore();

  // Check if issue already exists
  const existingQuery = await db.collection('githubIssues')
    .where('githubIssueId', '==', githubIssue.number)
    .where('repository', '==', repository)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    console.log('⚠️ Issue already exists in database:', githubIssue.number);
    return false;
  }

  // Fetch user profile from Firestore to get email and displayName
  let userEmail = '';
  let userName = '';
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      userEmail = userData?.email || '';
      userName = userData?.displayName || '';
      console.log('✅ Retrieved user profile:', { userEmail, userName, userId });
    } else {
      console.log('⚠️ User document not found for userId:', userId);
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    // Continue with empty values rather than failing
  }

  const issueData = {
    githubIssueId: githubIssue.number,
    githubIssueUrl: githubIssue.html_url,
    title: githubIssue.title,
    body: githubIssue.body,
    status: githubIssue.state === 'open' ? 'open' as const : 'closed' as const,
    repository: repository,
    repositoryUrl: `https://github.com/${repository}`,
    userEmail: userEmail,
    userName: userName,
    userId: userId,
    installationId: installationId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    githubCreatedAt: githubIssue.created_at,
    githubUpdatedAt: githubIssue.updated_at,
    labels: githubIssue.labels.map((label) => label.name),
    assignees: githubIssue.assignees.map((assignee) => assignee.login),
    comments: [],
    notes: [],
  };

  await db.collection('githubIssues').add(issueData);
  console.log('✅ External GitHub issue stored in database with user info:', {
    issueNumber: githubIssue.number,
    userEmail,
    userName,
    userId,
  });
  return true;
}

/**
 * Cloud Function to create GitHub issues
 */
export const createGitHubIssue = onCall<CreateGitHubIssueRequest, Promise<CreateGitHubIssueResponse>>(
  {
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
    cors: true,
  },
  async (request) => {
    try {
      console.log('🚀 createGitHubIssue called with:', request.data);

      // Validate request data
      const { title, body, repository, installationId, userEmail, userId } = request.data;

      if (!title || !body || !repository || !installationId || !userEmail || !userId) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      // Verify user authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      if (request.auth.uid !== userId) {
        throw new HttpsError('permission-denied', 'User ID mismatch');
      }

      // Get installation access token
      const accessToken = await getInstallationToken(installationId);

      // Create GitHub issue
      const githubIssue = await createGitHubIssueViaAPI(accessToken, repository, title, body);

      // Store in database
      const issueId = await storeGitHubIssueInDatabase(githubIssue, request.data);

      console.log('✅ GitHub issue creation completed successfully');

      return {
        success: true,
        issue: {
          ...githubIssue,
          id: issueId,
        },
        githubIssueUrl: githubIssue.html_url,
      };
    } catch (error) {
      console.error('❌ Error creating GitHub issue:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to create GitHub issue: ${(error as Error).message}`);
    }
  }
);

/**
 * Delete GitHub issue from both GitHub and database
 * @param {string} accessToken - GitHub access token
 * @param {string} repository - Repository name in format owner/repo
 * @param {number} issueNumber - GitHub issue number
 * @return {Promise<void>}
 */
async function deleteGitHubIssueFromAPI(
  accessToken: string,
  repository: string,
  issueNumber: number
): Promise<void> {
  const [owner, repo] = repository.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

  console.log('🗑️ Deleting GitHub issue:', url);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'gitPlumbers-App',
    },
    body: JSON.stringify({
      state: 'closed',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to delete GitHub issue:', response.status, errorText);
    throw new Error(`GitHub API error: ${response.status} ${errorText}`);
  }

  console.log('✅ GitHub issue closed successfully');
}

/**
 * Delete GitHub issue from database
 * @param {string} issueId - Firestore document ID of the issue
 * @return {Promise<void>}
 */
async function deleteGitHubIssueFromDatabase(issueId: string): Promise<void> {
  const db = getFirestore();
  await db.collection('githubIssues').doc(issueId).delete();
  console.log('✅ GitHub issue deleted from database:', issueId);
}

/**
 * Cloud Function to delete GitHub issues
 */
export const deleteGitHubIssue = onCall<{
  issueId: string;
  installationId: string;
  repository: string;
  githubIssueId: number;
}, Promise<{ success: boolean; error?: string }>>(
  {
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
    cors: true,
  },
  async (request) => {
    try {
      console.log('🗑️ deleteGitHubIssue called with:', request.data);

      // Validate request data
      const { issueId, installationId, repository, githubIssueId } = request.data;

      if (!issueId || !installationId || !repository || !githubIssueId) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      // Verify user authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Get installation access token
      const accessToken = await getInstallationToken(installationId);

      // Delete from GitHub (close the issue)
      await deleteGitHubIssueFromAPI(accessToken, repository, githubIssueId);

      // Delete from database
      await deleteGitHubIssueFromDatabase(issueId);

      console.log('✅ GitHub issue deletion completed successfully');

      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error deleting GitHub issue:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      return {
        success: false,
        error: `Failed to delete GitHub issue: ${(error as Error).message}`,
      };
    }
  }
);

/**
 * Cloud Function to fetch available external GitHub issues for selection
 */
export const fetchAvailableExternalIssues = onCall<{ installationId: string; repository: string }, Promise<{ success: boolean; issues: any[]; error?: string }>>(
  {
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
    cors: true,
  },
  async (request) => {
    try {
      console.log('🔍 fetchAvailableExternalIssues called with:', request.data);

      // Validate request data
      const { installationId, repository } = request.data;

      if (!installationId || !repository) {
        throw new HttpsError('invalid-argument', 'Missing installationId or repository');
      }

      // Verify user authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Get installation access token
      const accessToken = await getInstallationToken(installationId);

      // Fetch GitHub issues
      const githubIssues = await fetchGitHubIssues(accessToken, repository);

      // Check which issues are already stored in database
      const db = getFirestore();
      const existingQuery = await db.collection('githubIssues')
        .where('repository', '==', repository)
        .get();

      const existingIssueIds = new Set(
        existingQuery.docs.map((doc) => doc.data().githubIssueId),
      );

      console.log('🔍 DEBUG: Existing issue IDs in database:', Array.from(existingIssueIds));
      console.log('🔍 DEBUG: GitHub issues found:', githubIssues.map((i) => ({ id: i.number, title: i.title, state: i.state })));

      // Filter out already stored issues and only include open issues
      const availableIssues = githubIssues
        .filter((issue) => {
          const isNotStored = !existingIssueIds.has(issue.number);
          const isOpen = issue.state === 'open';
          console.log(`🔍 DEBUG: Issue ${issue.number} - isNotStored: ${isNotStored}, isOpen: ${isOpen}`);
          return isNotStored && isOpen;
        })
        .map((issue) => ({
          id: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels.map((label: any) => label.name),
          assignees: issue.assignees.map((assignee: any) => assignee.login),
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          html_url: issue.html_url,
          user: (issue as any).user?.login || 'Unknown',
        }));

      console.log('✅ Found', availableIssues.length, 'available open issues out of', githubIssues.length, 'total open issues');

      return {
        success: true,
        issues: availableIssues,
      };
    } catch (error) {
      console.error('❌ Error fetching available external GitHub issues:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to fetch available external GitHub issues: ${(error as Error).message}`);
    }
  }
);

/**
 * Cloud Function to sync selected external GitHub issues
 */
export const syncSelectedExternalIssues = onCall<{ installationId: string; repository: string; selectedIssueIds: number[] }, Promise<{ success: boolean; count: number; error?: string }>>(
  {
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
    cors: true,
  },
  async (request) => {
    try {
      console.log('🔄 syncSelectedExternalIssues called with:', request.data);

      // Validate request data
      const { installationId, repository, selectedIssueIds } = request.data;

      if (!installationId || !repository || !selectedIssueIds || selectedIssueIds.length === 0) {
        throw new HttpsError('invalid-argument', 'Missing installationId, repository, or selectedIssueIds');
      }

      // Verify user authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const userId = request.auth.uid;

      // Get installation access token
      const accessToken = await getInstallationToken(installationId);

      // Fetch GitHub issues
      const githubIssues = await fetchGitHubIssues(accessToken, repository);

      // Filter to only selected issues
      const selectedIssues = githubIssues.filter((issue) =>
        selectedIssueIds.includes(issue.number),
      );

      // Store selected issues in database
      let storedCount = 0;
      for (const issue of selectedIssues) {
        const wasStored = await storeExternalGitHubIssue(issue, repository, installationId, userId);
        if (wasStored) {
          storedCount++;
        }
      }

      console.log('✅ Sync completed. Stored', storedCount, 'selected issues out of', selectedIssues.length, 'requested issues');

      return {
        success: true,
        count: storedCount,
      };
    } catch (error) {
      console.error('❌ Error syncing selected external GitHub issues:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to sync selected external GitHub issues: ${(error as Error).message}`);
    }
  }
);

/**
 * Cloud Function to sync external GitHub issues (legacy - syncs all)
 */
export const syncExternalGitHubIssues = onCall<{ installationId: string; repository: string }, Promise<{ success: boolean; count: number; error?: string }>>(
  {
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
    cors: true,
  },
  async (request) => {
    try {
      console.log('🔄 syncExternalGitHubIssues called with:', request.data);

      // Validate request data
      const { installationId, repository } = request.data;

      if (!installationId || !repository) {
        throw new HttpsError('invalid-argument', 'Missing installationId or repository');
      }

      // Verify user authentication
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const userId = request.auth.uid;

      // Get installation access token
      const accessToken = await getInstallationToken(installationId);

      // Fetch GitHub issues
      const githubIssues = await fetchGitHubIssues(accessToken, repository);

      // Store new issues in database
      let storedCount = 0;
      for (const issue of githubIssues) {
        const wasStored = await storeExternalGitHubIssue(issue, repository, installationId, userId);
        if (wasStored) {
          storedCount++;
        }
      }

      console.log('✅ Sync completed. Stored', storedCount, 'new issues out of', githubIssues.length, 'total issues');

      return {
        success: true,
        count: storedCount,
      };
    } catch (error) {
      console.error('❌ Error syncing external GitHub issues:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to sync external GitHub issues: ${(error as Error).message}`);
    }
  }
);
