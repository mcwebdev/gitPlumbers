import { onRequest } from 'firebase-functions/v2/https';
import * as jwt from 'jsonwebtoken';
import { defineSecret } from 'firebase-functions/params';

// GitHub App configuration - using Firebase Functions v2 secrets
const GITHUB_APP_ID = defineSecret('GITHUB_APP_ID');
const GITHUB_APP_PRIVATE_KEY = defineSecret('GITHUB_APP_PRIVATE_KEY');

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  html_url: string;
  private: boolean;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

interface GitHubInstallationToken {
  token: string;
  expires_at: string;
}

interface RepositorySummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  htmlUrl: string;
  isPrivate: boolean;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/**
 * Generate a JWT token for GitHub App authentication
 * @return {string} JWT token for GitHub App authentication
 */
function generateGitHubAppJWT(): string {
  const appId = GITHUB_APP_ID.value();
  let privateKey = GITHUB_APP_PRIVATE_KEY.value();

  console.log('🔍 DEBUG: Raw appId length:', appId?.length || 0);
  console.log('🔍 DEBUG: Raw privateKey length:', privateKey?.length || 0);
  console.log('🔍 DEBUG: Raw privateKey first 50 chars:', privateKey?.substring(0, 50) || 'undefined');
  console.log('🔍 DEBUG: Raw privateKey last 50 chars:', privateKey?.substring(Math.max(0, privateKey.length - 50)) || 'undefined');

  if (!appId || !privateKey) {
    throw new Error('GitHub App ID and Private Key must be configured');
  }

  // Ensure the private key is properly formatted
  privateKey = privateKey
    .replace(/\\n/g, '\n') // Replace escaped newlines
    .replace(/"/g, '') // Remove quotes if present
    .trim();

  console.log('🔍 DEBUG: After cleanup - privateKey length:', privateKey.length);
  console.log('🔍 DEBUG: After cleanup - contains BEGIN:', privateKey.includes('-----BEGIN'));
  console.log('🔍 DEBUG: After cleanup - contains END:', privateKey.includes('-----END'));
  console.log('🔍 DEBUG: After cleanup - first 100 chars:', privateKey.substring(0, 100));
  console.log('🔍 DEBUG: After cleanup - last 100 chars:', privateKey.substring(Math.max(0, privateKey.length - 100)));

  // Ensure it starts and ends with proper PEM headers
  if (!privateKey.includes('-----BEGIN')) {
    console.log('🔍 DEBUG: Adding PEM headers to raw key');
    privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
  }

  console.log('🔑 Using GitHub App ID:', appId);
  console.log('🔑 Private key format check:', privateKey.includes('-----BEGIN') ? 'PEM format detected' : 'Raw key detected');
  console.log('🔑 Final private key length:', privateKey.length);
  console.log('🔑 Final private key starts with:', privateKey.substring(0, 30));
  console.log('🔑 Final private key ends with:', privateKey.substring(Math.max(0, privateKey.length - 30)));

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
    console.error('💥 Private key validation failed - key might be invalid or corrupted');
    throw error;
  }
}

/**
 * Get an installation access token for a specific installation
 * @param {string} installationId - The GitHub App installation ID
 * @return {Promise<string>} Installation access token
 */
async function getInstallationToken(installationId: string): Promise<string> {
  try {
    const jwtToken = generateGitHubAppJWT();

    const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'gitPlumbers-App/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get installation token:', response.status, errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const tokenData: GitHubInstallationToken = await response.json();
    return tokenData.token;
  } catch (error) {
    console.error('💥 Error getting installation token:', error);
    throw new Error('Failed to authenticate with GitHub');
  }
}

/**
 * Fetch repositories for a GitHub App installation
 * @param {string} installationId - The GitHub App installation ID
 * @return {Promise<RepositorySummary[]>} Array of repository summaries
 */
async function fetchInstallationRepositories(installationId: string): Promise<RepositorySummary[]> {
  try {
    const accessToken = await getInstallationToken(installationId);

    const response = await fetch('https://api.github.com/installation/repositories', {
      method: 'GET',
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'gitPlumbers-App/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch repositories:', response.status, errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const repositories: GitHubRepository[] = data.repositories || [];

    // Transform GitHub API response to our format
    const repositorySummaries: RepositorySummary[] = repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      htmlUrl: repo.html_url,
      isPrivate: repo.private,
      permissions: repo.permissions || {
        admin: false,
        push: false,
        pull: true,
      },
    }));

    console.log(`✅ Fetched ${repositorySummaries.length} repositories for installation ${installationId}`);
    return repositorySummaries;
  } catch (error) {
    console.error('💥 Error fetching repositories:', error);
    throw error;
  }
}

export const getInstallationRepos = onRequest(
  {
    cors: true,
    secrets: [GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY],
  },
  async (req, res) => {
    console.log('🔥 getInstallationRepos v2 HTTP called!');
    console.log('📝 Method:', req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Extract installation ID from URL path: /getInstallationRepos/{installationId}
      const pathParts = req.path.split('/');
      const installationId = pathParts[pathParts.length - 1];
      console.log('🔍 getInstallationRepos: Full path:', req.path);
      console.log('🔍 getInstallationRepos: Path parts:', pathParts);
      console.log('🔍 getInstallationRepos: Installation ID:', installationId);

      if (!installationId) {
        console.log('❌ getInstallationRepos: No installation ID provided');
        res.status(400).json({ error: 'Installation ID is required' });
        return;
      }

      // Validate installation ID format (should be numeric)
      if (!/^\d+$/.test(installationId)) {
        console.log('❌ getInstallationRepos: Invalid installation ID format');
        res.status(400).json({ error: 'Invalid installation ID format' });
        return;
      }

      // Check if GitHub App is configured
      try {
        GITHUB_APP_ID.value();
        GITHUB_APP_PRIVATE_KEY.value();
      } catch (error) {
        console.error('❌ GitHub App not configured - missing environment variables');
        res.status(500).json({
          error: 'GitHub App not configured',
          details: 'Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY environment variables',
        });
        return;
      }

      // Fetch repositories from GitHub API
      const repositories = await fetchInstallationRepositories(installationId);

      console.log('✅ getInstallationRepos: Successfully fetched repositories:', repositories.length);

      res.status(200).json({
        repositories,
        installationId,
        count: repositories.length,
        message: 'Successfully fetched repositories from GitHub',
      });
    } catch (error) {
      console.error('💥 Error getting installation repos:', error);
      console.error('💥 Error details:', (error as Error).message);
      console.error('💥 Error stack:', (error as Error).stack);

      // Provide more specific error messages
      let errorMessage = 'Failed to get installation repositories';
      let statusCode = 500;

      if (error instanceof Error) {
        if (error.message.includes('GitHub API error: 404')) {
          errorMessage = 'Installation not found or access denied';
          statusCode = 404;
        } else if (error.message.includes('GitHub API error: 401')) {
          errorMessage = 'GitHub App authentication failed';
          statusCode = 401;
        } else if (error.message.includes('GitHub API error: 403')) {
          errorMessage = 'GitHub App access forbidden';
          statusCode = 403;
        } else if (error.message.includes('Failed to authenticate with GitHub')) {
          errorMessage = 'GitHub App authentication failed';
          statusCode = 401;
        }
      }

      res.status(statusCode).json({
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
