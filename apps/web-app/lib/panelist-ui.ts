import { PANELIST_ALCHEMIST_CODENAME } from '@alchemist/shared-engine';
import type { AICandidate, Panelist } from '@alchemist/shared-types';

export function formatPanelistDisplayName(panelist: Panelist): string {
  return PANELIST_ALCHEMIST_CODENAME[panelist] ?? panelist;
}

export function formatPanelistSoundTagline(panelist: Panelist): string {
  const name = formatPanelistDisplayName(panelist);
  return `${name} · triad output`;
}

export function isServerDemoCandidate(_c: AICandidate): boolean {
  return false;
}
