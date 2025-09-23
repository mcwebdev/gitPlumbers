# gitPlumbers Assistant (Probot Starter)

This package bootstraps a Probot-powered listener for the gitPlumbers GitHub App. It handles Issues, Issue comments, pull requests, check suites, repository dispatches, and Project V2 item events.

## Prerequisites
- Node.js 18+
- The gitPlumbers Assistant GitHub App credentials (`APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`)
- (Optional) OAuth secrets for customer login flows (`GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`)

## Setup
```bash
cd apps/gitplumbers-assistant
npm install
cp .env.example .env # fill in values
npm run dev
```

The dev server uses Probot's local tunnel. When deploying, run `npm run build` and `npm start` with the environment variables set.

## Event flow highlights
- `/gp` commands are parsed in `src/commands.ts` and dispatched to handlers.
- Intake events trigger `dispatchIntake` which mirrors the repository_dispatch sent by the GitHub Action.
- PR scaffolding triggers a `repository_dispatch` event of type `gp_scaffold_pr`.

Extend the handlers to integrate with your core diagnostics pipeline, observability tooling, and customer notifications.
