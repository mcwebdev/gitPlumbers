export type GpCommand =
  | { type: 'triage' }
  | { type: 'fix'; area?: string }
  | { type: 'logs' }
  | { type: 'status' }
  | { type: 'rerun' }
  | { type: 'unknown'; raw: string };

export function parseGpCommand(body: string): GpCommand | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith('/gp')) return null;
  const [, ...rest] = trimmed.split(/\s+/);
  const keyword = (rest.shift() || '').toLowerCase();

  switch (keyword) {
    case 'triage':
      return { type: 'triage' };
    case 'fix':
      return { type: 'fix', area: rest.join(' ') || undefined };
    case 'logs':
      return { type: 'logs' };
    case 'status':
      return { type: 'status' };
    case 'rerun':
      return { type: 'rerun' };
    default:
      return { type: 'unknown', raw: trimmed };
  }
}

export function commandSummary(command: GpCommand): string {
  switch (command.type) {
    case 'triage':
      return 'Re-running intake workflow and diagnostics.';
    case 'fix':
      return `Preparing repair scaffolding${command.area ? ` for ${command.area}` : ''}.`;
    case 'logs':
      return 'Collecting the latest workflow logs.';
    case 'status':
      return 'Posting the current stabilization status.';
    case 'rerun':
      return 'Re-running the most recent failed workflow.';
    case 'unknown':
      return `Command not recognized: ${command.raw}`;
  }
}
