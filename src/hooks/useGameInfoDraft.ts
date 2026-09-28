import { useState } from 'react';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { canEditGameInfo } from '../state/gameReducer';
import { renameTeam } from '../state/rosterStorage';
import type { GameConfig, SavedTeam, TeamId } from '../state/types';

const TEAMS: TeamId[] = ['A', 'B'];
const normalize = (name: string) => name.trim().toLowerCase();

interface TeamDraft {
  name: string;
  color: string;
  /** A saved team picked from the list — its roster replaces this team's on Save. */
  picked: SavedTeam | null;
  /** "Add as a new team" was tapped: on Save the old stored team is kept, not renamed. */
  addedAsNew: boolean;
}

const fromConfig = (cfg: GameConfig) => ({
  field: cfg.fieldNumber,
  teams: {
    A: { ...cfg.teams.A, picked: null, addedAsNew: false },
    B: { ...cfg.teams.B, picked: null, addedAsNew: false },
  } as Record<TeamId, TeamDraft>,
});

/**
 * The one editable part of the game setup dialog: the field and each team's name and
 * colour. Everything is a draft until Save, and closing the dialog drops it — typing
 * straight into config would have the roster sync file a saved team for every
 * keystroke ("R", "Ra", "Rav"...).
 *
 * The name box is the setup screen's, and means the same three things there:
 * - **typing** renames the team. The saved team moves to the new name with it (see
 *   `renameTeam`), so fixing a typo doesn't leave the misspelling behind;
 * - **picking** a saved team loads it — name, colour and roster, the roster change
 *   going through the reducer so the players it replaces keep their names in the log;
 * - **"Add as a new team"** files the typed name as a team of its own on Save and
 *   leaves the old one stored as it was.
 * Deleting saved teams is left to the setup screen.
 */
export function useGameInfoDraft() {
  const cfg = useGame().config;
  const dispatch = useGameDispatch();
  const [draft, setDraft] = useState(() => fromConfig(cfg));

  const dirty =
    draft.field !== cfg.fieldNumber ||
    TEAMS.some((id) => {
      const d = draft.teams[id];
      return d.name !== cfg.teams[id].name || d.color !== cfg.teams[id].color || d.picked !== null;
    });
  const check = canEditGameInfo(draft.teams);

  const setTeam = (id: TeamId, patch: Partial<TeamDraft>) =>
    setDraft((d) => ({ ...d, teams: { ...d.teams, [id]: { ...d.teams[id], ...patch } } }));

  const save = () => {
    if (!dirty || !check.ok) return;
    const load: Partial<
      Record<TeamId, { players: SavedTeam['players']; lines: NonNullable<SavedTeam['lines']> }>
    > = {};
    for (const id of TEAMS) {
      const d = draft.teams[id];
      if (d.picked) load[id] = { players: d.picked.players, lines: d.picked.lines ?? [] };
      // A plain rename carries the stored team along. The roster sync in GameContext
      // then writes the game's current values under the new name. Not onto the other
      // team's name, though: swapping the two would chain the moves and the second
      // would carry the first team's entry away — the sync files both as they are.
      else if (
        !d.addedAsNew &&
        normalize(d.name) !== normalize(cfg.teams[id === 'A' ? 'B' : 'A'].name)
      )
        renameTeam(cfg.teams[id].name, d.name);
    }
    dispatch({
      type: 'EDIT_GAME_INFO',
      fieldNumber: draft.field,
      teams: {
        A: { name: draft.teams.A.name, color: draft.teams.A.color },
        B: { name: draft.teams.B.name, color: draft.teams.B.color },
      },
      load,
    });
    setDraft((d) => ({
      field: d.field,
      teams: {
        A: { ...d.teams.A, name: d.teams.A.name.trim(), picked: null, addedAsNew: false },
        B: { ...d.teams.B, name: d.teams.B.name.trim(), picked: null, addedAsNew: false },
      },
    }));
  };

  return { cfg, draft, setDraft, setTeam, dirty, check, save };
}

export type GameInfoDraft = ReturnType<typeof useGameInfoDraft>;
