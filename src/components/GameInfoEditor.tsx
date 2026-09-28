import { useState } from 'react';
import type { GameInfoDraft } from '../hooks/useGameInfoDraft';
import { useT } from '../i18n/useT';
import { loadSavedTeams } from '../state/rosterStorage';
import type { SavedTeam, TeamId } from '../state/types';
import { TeamColorPicker } from './TeamColorPicker';
import { TeamNameCombobox } from './TeamNameCombobox';
import { fieldLabel, inputClass, primaryButton, sectionTitle } from './ui';

const TEAMS: TeamId[] = ['A', 'B'];
const normalize = (name: string) => name.trim().toLowerCase();

/** The field and both teams, editable — the draft and what Save does are in useGameInfoDraft. */
export function GameInfoFields({ draft: game }: { draft: GameInfoDraft }) {
  const { t } = useT();
  const { cfg, draft, setDraft, setTeam } = game;
  // Read from the store whenever a name box is used rather than once on open: the
  // roster sync writes a Save's result after this dialog has rendered it.
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => loadSavedTeams());

  return (
    <section className="space-y-3" onFocusCapture={() => setSavedTeams(loadSavedTeams())}>
      <h3 className={sectionTitle}>{t('setupFieldTeams')}</h3>
      <div>
        <label className={fieldLabel} htmlFor="game-info-field">
          {t('fieldNumber')}
        </label>
        <input
          id="game-info-field"
          className={inputClass}
          maxLength={20}
          value={draft.field}
          onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
        />
      </div>
      {TEAMS.map((id) => {
        const d = draft.teams[id];
        const label = id === 'A' ? t('teamA') : t('teamB');
        return (
          <div key={id} className="space-y-1">
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className={fieldLabel}>{label}</label>
                <TeamNameCombobox
                  label={label}
                  value={d.name}
                  savedTeams={savedTeams}
                  otherTeamName={draft.teams[id === 'A' ? 'B' : 'A'].name}
                  onChangeText={(name) => setTeam(id, { name, picked: null, addedAsNew: false })}
                  onSelectTeam={(team) =>
                    setTeam(id, {
                      name: team.name,
                      color: team.color,
                      // Picking the team already playing is not a roster swap: it would
                      // hand every current player to removedPlayers for their own copies.
                      picked: normalize(team.name) === normalize(cfg.teams[id].name) ? null : team,
                      addedAsNew: false,
                    })
                  }
                  onAddAsNewTeam={(name) => setTeam(id, { name, picked: null, addedAsNew: true })}
                  addedAsNew={d.addedAsNew}
                  maxLength={40}
                />
              </div>
              <div>
                <label className={fieldLabel}>{t('teamColor')}</label>
                <TeamColorPicker
                  label={`${t('teamColor')} ${d.name}`}
                  color={d.color}
                  onChange={(color) => setTeam(id, { color })}
                />
              </div>
            </div>
            {d.picked && (
              <p className="text-xs text-chalk/50 leading-snug" data-team-load={id}>
                {t('setupTeamLoadNote', { team: d.picked.name })}
              </p>
            )}
            {d.addedAsNew && (
              <p className="text-xs text-chalk/50 leading-snug">
                {t('setupTeamNewNote', { team: d.name.trim() })}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

/**
 * Pinned to the foot of the dialog while there is something to save, so it can be
 * reached without scrolling back up past the rules — and absent otherwise, which is
 * what keeps the rest of the dialog reading as the plain record it is.
 */
export function GameInfoSaveBar({ draft: game }: { draft: GameInfoDraft }) {
  const { t } = useT();
  if (!game.dirty) return null;
  return (
    // `!` because the panel's space-y resets every child's bottom margin, and without the
    // negative one the bar lifts off the dialog's foot once scrolled to the end.
    <div className="sticky -bottom-5 -mx-5 !-mb-5 px-5 py-3 bg-panel border-t border-line space-y-2">
      {game.check.reason && (
        <p className="text-sm text-chalk/60 text-center">{t(game.check.reason)}</p>
      )}
      <button
        type="button"
        className={`w-full ${primaryButton}`}
        disabled={!game.check.ok}
        onClick={game.save}
      >
        {t('btnSaveChanges')}
      </button>
    </div>
  );
}
