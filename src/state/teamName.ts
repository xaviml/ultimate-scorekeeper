import type { TeamId } from './types';

/**
 * Team names are shown in capitals everywhere — the scoreboard, the call-outs, the
 * log, the report, the shared image, the copied text — however they were typed.
 * Rather than every one of those surfaces remembering to shout, the name is stored
 * that way: it is cased on the way into a game (`createInitialState`,
 * `EDIT_GAME_INFO`), into the saved-teams store, and on the way back out of
 * storage for anything written before this rule existed. The name box itself
 * keeps the volunteer's own keystrokes and only *shows* them in capitals (see
 * `TeamNameCombobox`), because rewriting a controlled input's value under the
 * caret moves it, and fights a phone keyboard's composition.
 */
export function teamNameCase(name: string): string {
  return name.toUpperCase();
}

export function withTeamNameCase<T extends { teams: Record<TeamId, { name: string }> }>(
  config: T,
): T {
  // Unchanged config comes back as the same object: the setup screen recognises a
  // fresh app by `state.config === defaultConfig`, and a copy would read as a
  // config someone had already edited.
  if (
    config.teams.A.name === teamNameCase(config.teams.A.name) &&
    config.teams.B.name === teamNameCase(config.teams.B.name)
  ) {
    return config;
  }
  return {
    ...config,
    teams: {
      A: { ...config.teams.A, name: teamNameCase(config.teams.A.name) },
      B: { ...config.teams.B, name: teamNameCase(config.teams.B.name) },
    },
  };
}
