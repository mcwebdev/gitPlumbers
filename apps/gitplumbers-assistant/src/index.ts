import type { Probot, ProbotOctokit } from 'probot';
import type { WebhookEventMap } from '@octokit/webhooks-types';
import type { Response } from 'express';
import pino from 'pino';

import { commandSummary, parseGpCommand } from './commands.js';

type Octokit = InstanceType<typeof ProbotOctokit>;

type DispatchPayload = {
  issue: WebhookEventMap['issues']['issue'];
  command?: string;
  command_args?: string;
};

type RepoSummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  htmlUrl: string;
};

export default function app(app: Probot) {
  const log = pino({ level: process.env.LOG_LEVEL || 'info' }).child({ service: 'gitplumbers-app' });

  const router = app.route('/api/github');

  router.options('/installations/:installationId/repos', (_req, res) => {
    applyCors(res);
    res.status(204).send('');
  });

  router.get('/installations/:installationId/repos', async (req, res) => {
    applyCors(res);
    const installationId = Number.parseInt(req.params.installationId, 10);
    if (Number.isNaN(installationId)) {
      res.status(400).json({ error: 'Invalid installation id' });
      return;
    }

    try {
      const installationOctokit = await app.auth(installationId);
      const { data } = await installationOctokit.request('GET /installation/repositories', {
        per_page: 100,
      });

      const repositories: RepoSummary[] = (data.repositories ?? []).map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner?.login ?? '',
        htmlUrl: repo.html_url,
      }));

      res.json({ repositories });
    } catch (error) {
      const status = typeof (error as { status?: number })?.status === 'number' ? (error as { status: number }).status : 500;
      log.error({ err: error, installationId }, 'Failed to list repositories for installation');
      res.status(status === 404 ? 404 : 500).json({ error: 'Unable to load repositories for that installation.' });
    }
  });

  app.on(['issues.opened', 'issues.edited'], async (context) => {
    const issue = context.payload.issue;
    log.info({ issue: issue.number, action: context.payload.action }, 'Issue event received');
    await dispatchIntake(context.octokit, context.payload.repository.owner.login, context.payload.repository.name, {
      issue,
    });
  });

  app.on('issue_comment.created', async (context) => {
    const issue = context.payload.issue;
    const comment = context.payload.comment;
    const command = parseGpCommand(comment.body || '');

    if (!command) {
      return;
    }

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    log.info({ issue: issue.number, command: command.type }, 'Slash command received');

    const summary = commandSummary(command);
    await acknowledgeCommand(context.octokit, {
      owner,
      repo,
      issue_number: issue.number,
      body: buildAckBody(summary),
    });

    const commandArgs = 'area' in command && command.area ? command.area : undefined;
    await dispatchIntake(context.octokit, owner, repo, {
      issue,
      command: command.type,
      command_args: commandArgs,
    });

    if (command.type === 'fix') {
      await dispatchRepairScaffold(context.octokit, owner, repo, {
        issue,
        command: command.type,
        command_args: commandArgs,
      });
    }
  });

  app.on('pull_request', async (context) => {
    log.debug({ pr: context.payload.number, action: context.payload.action }, 'Pull request event received');
    // Extend: sync state to internal dashboard, enforce CODEOWNERS, etc.
  });

  app.on('check_suite.completed', async (context) => {
    log.debug({ conclusion: context.payload.check_suite.conclusion }, 'Check suite completed');
    // Extend: inspect for flakes and post comparisons back to the intake issue.
  });

  app.on('repository_dispatch', async (context) => {
    log.info({ event: context.payload.action }, 'Repository dispatch event received');
    // Extend: accept callbacks from Actions (e.g., dependency heatmap) and post summaries.
  });

  app.on('project_v2_item', async (context) => {
    log.debug({ action: context.payload.action }, 'Project V2 item change observed');
    // Extend: keep project boards in sync with intake status.
  });
}

type AckParams = {
  owner: string;
  repo: string;
  issue_number: number;
  body: string;
};

async function acknowledgeCommand(octokit: Octokit, params: AckParams) {
  await octokit.issues.createComment(params);
}

async function dispatchIntake(octokit: Octokit, owner: string, repo: string, payload: DispatchPayload) {
  await octokit.repos.createDispatchEvent({
    owner,
    repo,
    event_type: 'gp_intake',
    client_payload: payload,
  });
}

async function dispatchRepairScaffold(octokit: Octokit, owner: string, repo: string, payload: DispatchPayload) {
  await octokit.repos.createDispatchEvent({
    owner,
    repo,
    event_type: 'gp_scaffold_pr',
    client_payload: payload,
  });
}

function buildAckBody(summary: string) {
  const lines = [
    ':wrench: gitPlumbers Assistant',
    '',
    summary,
    '',
    '_Tracking via repository_dispatch: gp_intake._',
  ];
  return lines.join('\n');
}

function applyCors(res: Response) {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}
