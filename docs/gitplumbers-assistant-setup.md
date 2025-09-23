# gitPlumbers Assistant GitHub App

This guide captures the minimum viable workflow for onboarding a customer onto the gitPlumbers support pipeline and wiring the repository automations that ship with this repo.

## 1. Provision the GitHub App
1. In the gitPlumbers GitHub organization, open **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Use the following configuration:
   - **GitHub App name:** `gitPlumbers Assistant`
   - **Homepage URL:** https://gitplumbers.example (update when the production console is live)
   - **Webhook URL:** `https://console.gitplumbers.example/webhooks/github`
   - **Webhook secret:** 32+ character random string stored in your secrets manager (mirror in the backend `GITHUB_APP_WEBHOOK_SECRET`).
   - **Callback URL:** optional unless you plan to offer OAuth login.
   - **Permissions (Repository):**
     | Area | Access |
     | --- | --- |
     | Contents | Read |
     | Issues | Read & write |
     | Pull requests | Read & write |
     | Checks | Read & write |
     | Commit statuses | Read |
     | Actions | Read (optional, required for surfacing workflow metadata) |
   - **Permissions (Organization):** none required for single-repo installs.
   - **Subscribe to events:** `issues`, `issue_comment`, `pull_request`, `check_suite`, `repository_dispatch`, `project_v2_item`.
   - **Where can this GitHub App be installed?** Any account.
3. Generate the private key (`.pem`) and store it in your secrets manager. The backend needs the App ID, Installation ID, and private key to authenticate as the App.

## 2. Wire the backend listener
1. Use the existing webhook surface in `functions/` (or your preferred service) to handle POSTs from GitHub.
2. Validate the webhook signature with the shared secret from step 1.
3. Route incoming payloads:
   - `issues` & `issue_comment`: hydrate internal ticket, trigger diagnostics, and acknowledge with a comment.
   - `repository_dispatch` (`gp_intake`): emitted by `.github/workflows/gitplumbers-intake.yml` when the issue form or `/gp triage` command fires.
   - `pull_request`: sync state into your console, ensure reviewers/labels match the CODEOWNERS guidance.
   - `check_suite`: surface failed checks, run the flake catcher, and attach useful context via issue comments.

## 3. Slash command contract
Slash commands run through issue comments and are parsed in the workflow + backend.

| Command | Behavior |
| --- | --- |
| `/gp triage` | Re-runs the intake workflow, re-applies labels, and dispatches diagnostics. |
| `/gp fix <area>` | Backend creates `gp/fix/<issue-number>-<slug>` branch, optional failing test, kickstarts repair PR, and posts back with links. |
| `/gp logs` | Backend posts the latest job URLs, log bundles, or retrieved S3 artifact link. |
| `/gp status` | Backend posts current owner, ETA, last check timestamps, and outstanding tasks. |
| `/gp rerun` | Optional: trigger rerun of the most recent failed workflow (requires Actions read scope). |

The Action captures the command (`steps.parse.outputs.command`) and passes it to your backend through `repository_dispatch`. Extend the handler to differentiate behaviors and to post acknowledgements in GitHub via the Issues API.

## 4. Intake workflow glue
- The issue form lives at `.github/ISSUE_TEMPLATE/audit.yml` and forces structured data before your team touches a ticket.
- The workflow `.github/workflows/gitplumbers-intake.yml` auto-labels, assigns the gitPlumbers team, and forwards events to the backend dispatcher.
- Add the team `gitplumbers` and reviewer alias `gitplumbers-team` to the destination org so assignment works out of the box.

## 5. Security and auditing
- Encourage customers to install the App on a dedicated `gitplumbers-*` repo or on the affected service only.
- Default to read-only code access unless `/gp fix` automation is requested.
- Require signed commits and status checks on the repos where the App operates.
- Store all App credentials in your primary secrets manager; never bake PATs into workflows.
- Log every webhook and API interaction with correlation IDs so you can trace an incident end-to-end.

## 6. Customer onboarding checklist
1. Share the prefilled issue link: `https://github.com/<org>/<repo>/issues/new?template=audit.yml&title=%5BgitPlumbers%5D+<summary>`.
2. Confirm the repo has the intake workflow on `main`.
3. Ensure CODEOWNERS covers the surfaces you might touch; otherwise the App should create/update one in the repair PR.
4. Run `/gp triage` to smoke test the wiring once the App is installed.
5. Document expectations for response times, available commands, and escalation paths in the repo `README` or `docs/ops/handbook.md`.

## 7. Next build steps
- Implement Probot or Flask backend starter listening for webhook events and driving the slash command logic.
- Add the PR template (risk/rollback/testing) and any follow-up actions (backport bot, dependency heatmap, secrets guard) referenced in the broader design doc.
- Integrate observability links (SLO dashboards, log search) in the `/gp status` payload.
## 8. Starter assets in this repo
- `docs/gitplumbers-app-manifest.json`: import-ready manifest covering permissions & events.
- `.github/pull_request_template.md`: risk/rollback/test template applied to repair PRs.
- `.github/workflows/gp-pr-scaffold.yml`: repository_dispatch workflow that builds the repair-plan pull request skeleton.
- `apps/gitplumbers-assistant/`: Probot starter (TypeScript) that consumes the App webhooks and forwards `/gp` commands into your backend.
