import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { defaultConfig } from '../state/gameReducer';
import { copyText } from '../state/clipboard';
import { loadTeamsYaml, teamsYamlLoaded } from '../state/loadTeamsYaml';
import { loadSavedTeams, normalizeTeamName, replaceSavedTeams } from '../state/rosterStorage';
import {
  draftFromParsed,
  draftFromStore,
  draftRenames,
  draftToSaved,
  heldTeamsDraft,
  holdTeamsDraft,
  removedTeams,
  teamsSignature,
  type DraftTeam,
  type TeamsDraft,
  type TeamsView,
} from '../state/teamsDraft';
import { teamNameCase } from '../state/teamName';
import type { SavedTeam } from '../state/types';
import { uid } from '../state/uid';
import { usePreservedScroll } from '../hooks/usePreservedScroll';
import { ChevronRightIcon, CopyIcon, CrossIcon, PlusIcon, ShirtIcon } from './icons';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { SectionCard } from './SectionCard';
import { Segmented } from './Segmented';
import { TeamEditDialog } from './TeamEditDialog';
import {
  dangerButton,
  fieldLabel,
  hintText,
  inputClass,
  primaryButton,
  secondaryButton,
  secondaryButtonOnPitch,
  teamOutline,
} from './ui';

const errorText = 'text-xs leading-snug text-signal';

/** The colours a new team starts with, alternating so two new teams are told apart. */
const NEW_TEAM_COLORS = [defaultConfig.teams.A.color, defaultConfig.teams.B.color];

/**
 * The teams saved on this phone, and their rosters and predefined lines (#/teams).
 *
 * Two views of one unsaved draft (see state/teamsDraft.ts): a **visual** list, where a
 * team opens in a sheet, and a **YAML** editor holding every team as text — which is
 * also how teams travel between phones, copied out of one and pasted into another.
 * Nothing reaches storage until Save, and Save replaces the whole store. Switching
 * views carries the draft across; YAML that cannot be read keeps you in the YAML view
 * (Discard is the other way out), since the list can only show what the text says.
 *
 * Leaving with unsaved work asks first, by every way out: the back arrow here, and
 * the back gesture, which App puts back and hands over (`requestTeamsLeave`).
 */
export default function TeamsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const [stored, setStored] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [draft, setDraft] = useState<TeamsDraft>(() => initialDraft(stored));
  const [yamlMod, setYamlMod] = useState(() => teamsYamlLoaded());
  const [loadFailed, setLoadFailed] = useState(false);
  const [switchRefused, setSwitchRefused] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState<string[] | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(() => heldTeamsDraft()?.askLeave === true);
  const [saveFailed, setSaveFailed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const textarea = useRef<HTMLTextAreaElement>(null);

  // A draft left in the YAML view (a guide opened from the menu, then back) needs the
  // library to read it again.
  useEffect(() => {
    if (draft.view !== 'yaml' || yamlMod) return;
    loadTeamsYaml().then(setYamlMod, () => setLoadFailed(true));
  }, [draft.view, yamlMod]);

  const parse = useMemo(
    () => (draft.view === 'yaml' && yamlMod ? yamlMod.parseTeamsYaml(draft.text) : null),
    [draft.view, draft.text, yamlMod],
  );
  const storedSignature = useMemo(() => teamsSignature(stored), [stored]);
  const dirty =
    draft.view === 'visual'
      ? teamsSignature(draft.teams) !== storedSignature
      : parse
        ? !parse.ok || teamsSignature(parse.teams) !== storedSignature
        : draft.dirty;
  const yamlInvalid = parse !== null && !parse.ok;

  useEffect(() => {
    holdTeamsDraft({ ...draft, dirty, askLeave: false });
  }, [draft, dirty]);

  // A reload drops the draft with the page; say so, as the setup screen does for its form.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!yamlInvalid) setSwitchRefused(false);
  }, [yamlInvalid]);

  usePreservedScroll(editingKey !== null);

  const editing = draft.teams.find((d) => d.key === editingKey) ?? null;

  const setTeams = (update: (teams: DraftTeam[]) => DraftTeam[]) =>
    setDraft((d) => ({ ...d, teams: update(d.teams) }));

  const switchView = async (view: TeamsView) => {
    if (view === draft.view) return;
    if (view === 'visual') {
      if (!parse) return;
      if (!parse.ok) {
        setSwitchRefused(true);
        return;
      }
      setDraft((d) => ({
        ...d,
        view,
        teams: draftFromParsed(parse.teams, d.teams, stored),
      }));
      return;
    }
    let mod = yamlMod;
    if (!mod) {
      try {
        mod = await loadTeamsYaml();
        setYamlMod(mod);
        setLoadFailed(false);
      } catch {
        setLoadFailed(true);
        return;
      }
    }
    const text = mod.teamsToYaml(draftToSaved(draft.teams));
    setDraft((d) => ({ ...d, view, text }));
  };

  /** Back to what is stored, in whichever view is showing. */
  const reset = (teams: SavedTeam[]) => {
    setStored(teams);
    setDraft((d) => ({
      ...d,
      teams: draftFromStore(teams),
      text: d.view === 'yaml' && yamlMod ? yamlMod.teamsToYaml(teams) : '',
    }));
    setSwitchRefused(false);
  };

  const teamsToSave = (): DraftTeam[] | null => {
    if (draft.view === 'visual') return draft.teams;
    if (!parse?.ok) return null;
    return draftFromParsed(parse.teams, draft.teams, stored);
  };

  const commit = (teams: DraftTeam[]) => {
    setConfirmRemoval(null);
    if (!replaceSavedTeams(draftToSaved(teams), draftRenames(teams))) {
      setSaveFailed(true);
      return;
    }
    setSaveFailed(false);
    reset(loadSavedTeams());
  };

  const save = () => {
    const teams = teamsToSave();
    if (!teams) return;
    const removed = removedTeams(stored, teams);
    if (removed.length > 0) setConfirmRemoval(removed);
    else commit(teams);
  };

  const leave = () => {
    holdTeamsDraft(null);
    onBack();
  };

  const copy = async () => {
    const ok = await copyText(draft.text);
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const clear = () => {
    setDraft((d) => ({ ...d, text: '' }));
    textarea.current?.focus();
  };

  const addTeam = (name: string) => {
    const team: DraftTeam = {
      key: uid(),
      origin: null,
      name: teamNameCase(name.trim()),
      color: NEW_TEAM_COLORS[draft.teams.length % NEW_TEAM_COLORS.length],
      players: [],
      lines: [],
    };
    setTeams((teams) => [...teams, team].sort((a, b) => a.name.localeCompare(b.name)));
    setCreating(false);
    setEditingKey(team.key);
  };

  const nameTaken = (name: string, except: string | null) =>
    draft.teams.some(
      (d) => d.key !== except && normalizeTeamName(d.name) === normalizeTeamName(name),
    );

  const error = parse && !parse.ok ? parse.error : null;

  return (
    <div className="min-h-dvh bg-pitch text-chalk px-4 pt-4 max-w-2xl mx-auto space-y-4">
      <PageHeader
        title={t('teamsTitle')}
        backLabel={t('btnBack')}
        onBack={() => (dirty ? setConfirmLeave(true) : leave())}
      />

      <Segmented
        label={t('teamsViewLabel')}
        labelHidden
        value={draft.view}
        options={[
          { value: 'visual', label: t('teamsViewVisual') },
          { value: 'yaml', label: t('teamsViewYaml') },
        ]}
        onChange={(v) => void switchView(v)}
      />
      {loadFailed && <p className={errorText}>{t('teamsYamlLoadFailed')}</p>}

      {draft.view === 'visual' ? (
        <SectionCard
          title={t('teamsSavedTitle')}
          icon={<ShirtIcon size="w-4 h-4" />}
          className="!space-y-0"
          action={
            <button
              type="button"
              className="flex items-center gap-1 h-8 rounded-md px-2.5 text-xs border border-line bg-pitch text-accent font-board font-semibold active:scale-[0.99]"
              onClick={() => setCreating(true)}
            >
              <PlusIcon size="w-3.5 h-3.5" />
              {t('teamsNewTeam')}
            </button>
          }
        >
          {draft.teams.length === 0 ? (
            <p className="mt-2 text-sm text-chalk/60">{t('teamsEmpty')}</p>
          ) : (
            <ul className="mt-1">
              {draft.teams.map((team) => {
                const lines = team.lines?.length ?? 0;
                return (
                  <li key={team.key} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      data-team-row={team.name}
                      className="w-full flex items-center gap-3 py-3 text-left active:scale-[0.99]"
                      onClick={() => setEditingKey(team.key)}
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 w-5 h-5 rounded-sm"
                        style={{ backgroundColor: team.color, ...teamOutline(team.color) }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-board leading-tight break-words">
                          {team.name}
                        </span>
                        <span className="block text-xs text-chalk/50">
                          {[
                            team.players.length === 1
                              ? t('teamsPlayerCountOne')
                              : t('teamsPlayerCount', { n: team.players.length }),
                            lines === 0
                              ? null
                              : lines === 1
                                ? t('teamsLineCountOne')
                                : t('teamsLineCount', { n: lines }),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <ChevronRightIcon size="w-4 h-4 text-chalk/40" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 h-8 rounded-md px-2.5 text-xs border border-line bg-panel font-board font-semibold active:scale-[0.99]"
              onClick={clear}
            >
              <CrossIcon size="w-3.5 h-3.5" />
              {t('teamsYamlClear')}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 h-8 rounded-md px-2.5 text-xs border border-line bg-panel font-board font-semibold active:scale-[0.99]"
              onClick={copy}
            >
              <CopyIcon size="w-3.5 h-3.5" />
              {copyState === 'copied'
                ? t('copied')
                : copyState === 'failed'
                  ? t('copyFailed')
                  : t('copyReport')}
            </button>
          </div>
          <textarea
            ref={textarea}
            data-teams-yaml
            aria-label={t('teamsYamlLabel')}
            aria-invalid={error !== null}
            placeholder={t('teamsYamlPlaceholder')}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            disabled={!yamlMod}
            className="w-full min-h-[55dvh] rounded-md bg-panel border border-line px-3 py-2 font-mono text-[13px] leading-relaxed text-chalk focus:outline-none focus:border-accent aria-[invalid=true]:border-signal"
            value={draft.text}
            onChange={(e) => {
              const text = e.target.value;
              setDraft((d) => ({ ...d, text }));
            }}
          />
          {error && (
            <div role="alert" data-yaml-error={error.key} className="space-y-1">
              <p className={errorText}>
                {error.line !== null && (
                  <span className="font-semibold">{t('teamsYamlLine', { n: error.line })} </span>
                )}
                {t(error.key, error.vars)}
              </p>
              {error.excerpt !== undefined && error.excerpt.trim() !== '' && (
                <pre className="overflow-x-auto rounded bg-panel border border-line px-2 py-1 font-mono text-[12px] text-chalk/80">
                  {error.excerpt}
                </pre>
              )}
              {switchRefused && <p className={hintText}>{t('teamsYamlFixToSwitch')}</p>}
            </div>
          )}
          <p className={hintText}>{t('teamsYamlHelp')}</p>
        </section>
      )}

      {saveFailed && <p className={errorText}>{t('teamsSaveFailed')}</p>}

      {/* Save and Discard, only while there is something to save — the report's and
          the setup screen's sticky bar. Discard is the way out of YAML that can't be
          read, which is why it is here rather than only in the leave question. */}
      <div
        data-teams-actions
        className={`sticky bottom-0 z-20 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
          dirty ? 'border-t border-line bg-pitch/95 backdrop-blur' : ''
        }`}
      >
        {dirty && (
          <div className="grid grid-cols-2 gap-3">
            <button className={secondaryButtonOnPitch} onClick={() => reset(stored)}>
              {t('teamsDiscard')}
            </button>
            <button className={primaryButton} disabled={!teamsToSave()} onClick={save}>
              {t('btnSave')}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <TeamEditDialog
          team={editing}
          nameTaken={(name) => nameTaken(name, editing.key)}
          onChange={(patch) =>
            setTeams((teams) => teams.map((d) => (d.key === editing.key ? { ...d, ...patch } : d)))
          }
          onRemove={() => {
            setTeams((teams) => teams.filter((d) => d.key !== editing.key));
            setEditingKey(null);
          }}
          onClose={() => {
            setTeams((teams) => [...teams].sort((a, b) => a.name.localeCompare(b.name)));
            setEditingKey(null);
          }}
        />
      )}
      {creating && (
        <NewTeamDialog
          nameTaken={(name) => nameTaken(name, null)}
          onAdd={addTeam}
          onCancel={() => setCreating(false)}
        />
      )}
      {confirmRemoval && (
        <Modal title={t('teamsConfirmSaveTitle')} onClose={() => setConfirmRemoval(null)} size="sm">
          <p className="text-sm text-chalk/80">
            {t('teamsConfirmSave', { teams: confirmRemoval.join(', ') })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button className={secondaryButton} onClick={() => setConfirmRemoval(null)}>
              {t('btnCancel')}
            </button>
            <button
              className={dangerButton}
              onClick={() => {
                const teams = teamsToSave();
                if (teams) commit(teams);
              }}
            >
              {t('btnSave')}
            </button>
          </div>
        </Modal>
      )}
      {confirmLeave && (
        <Modal title={t('teamsConfirmLeaveTitle')} onClose={() => setConfirmLeave(false)} size="sm">
          <p className="text-sm text-chalk/80">{t('teamsConfirmLeave')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button className={secondaryButton} onClick={() => setConfirmLeave(false)}>
              {t('btnCancel')}
            </button>
            <button
              className={dangerButton}
              onClick={() => {
                setConfirmLeave(false);
                leave();
              }}
            >
              {t('teamsDiscard')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * The draft to open on: the one held from the last visit while it still has unsaved
 * work, otherwise the store as it is now — in whichever view was showing last.
 */
function initialDraft(stored: SavedTeam[]): TeamsDraft {
  const held = heldTeamsDraft();
  if (held?.dirty) return held;
  const mod = teamsYamlLoaded();
  const view = held?.view === 'yaml' && mod ? 'yaml' : 'visual';
  return {
    teams: draftFromStore(stored),
    view,
    text: view === 'yaml' && mod ? mod.teamsToYaml(stored) : '',
    dirty: false,
  };
}

function NewTeamDialog({
  nameTaken,
  onAdd,
  onCancel,
}: {
  nameTaken: (name: string) => boolean;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState('');
  const inputId = useId();
  const taken = name.trim() !== '' && nameTaken(name);
  const ready = name.trim() !== '' && !taken;
  return (
    <Modal title={t('teamsNewTeam')} onClose={onCancel} size="sm" showClose>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onAdd(name);
        }}
      >
        <div>
          <label htmlFor={inputId} className={fieldLabel}>
            {t('teamName')}
          </label>
          <input
            id={inputId}
            autoFocus
            className={`${inputClass} uppercase`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {taken && <p className={errorText}>{t('teamsNameTaken')}</p>}
        </div>
        <button type="submit" className={`w-full ${primaryButton}`} disabled={!ready}>
          {t('teamsAddTeam')}
        </button>
      </form>
    </Modal>
  );
}
