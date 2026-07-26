import { useState } from 'react';
import { useT, type Lang } from '../i18n/useT';
import { defaultConfig } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { useBackGuard } from '../hooks/useBackGuard';
import { deleteTeam, loadSavedTeams, saveTeam } from '../state/rosterStorage';
import {
  BEACH_TEMPLATE,
  GRASS_TEMPLATE,
  deleteTemplate,
  extractTemplateSettings,
  loadSavedTemplates,
  saveTemplate,
} from '../state/templates';
import type { GameConfig, PlayerInfo, SavedTeam, SavedTemplate, TeamId } from '../state/types';
import {
  loadPlayersSectionCollapsed,
  loadWaterBreakSectionCollapsed,
  savePlayersSectionCollapsed,
  saveWaterBreakSectionCollapsed,
} from '../state/uiPreferences';
import { AboutDialog } from './AboutDialog';
import { ConfirmDeleteTemplateDialog } from './ConfirmDeleteTemplateDialog';
import GuideScreen from './GuideScreen';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { TeamColorPicker } from './TeamColorPicker';
import { TeamNameCombobox } from './TeamNameCombobox';
import { uid } from '../state/uid';
import { fieldLabel, inputClass, secondaryButtonOnPitch, sectionTitle } from './ui';

const PREDEFINED_TEMPLATES = {
  grass: GRASS_TEMPLATE,
  beach: BEACH_TEMPLATE,
} as const;

/** "HH:MM" for the next quarter-hour strictly after `date` (10:55→11:00, 10:31→10:45, 11:00→11:15). */
function suggestedStartingTime(date: Date = new Date()): string {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const nextQuarter = (Math.floor(totalMinutes / 15) * 15 + 15) % (24 * 60);
  const h = Math.floor(nextQuarter / 60);
  const m = nextQuarter % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Whether a configured "HH:MM" starting time is still ahead of the current time (today). */
function startingTimeIsFuture(time: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.getTime() > Date.now();
}

function Section({
  title,
  children,
  collapsible,
  collapsed,
  onToggleCollapsed,
  toggleAriaLabel,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  toggleAriaLabel?: string;
}) {
  return (
    <section className="rounded-xl bg-panel border border-line p-4 space-y-3">
      {collapsible ? (
        <button
          type="button"
          className="w-full flex items-center justify-between"
          aria-expanded={!collapsed}
          aria-label={toggleAriaLabel}
          onClick={onToggleCollapsed}
        >
          <h2 className={sectionTitle}>{title}</h2>
          <span
            aria-hidden="true"
            className={`text-chalk/60 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          >
            ▾
          </span>
        </button>
      ) : (
        <h2 className={sectionTitle}>{title}</h2>
      )}
      {(!collapsible || !collapsed) && children}
    </section>
  );
}

export default function ConfigScreen() {
  const { t, lang, setLang } = useT();
  const dispatch = useGameDispatch();
  const state = useGame();
  // BACK_TO_CONFIG seeds state.config with the just-finished game's config (a
  // fresh app load or reload always resets it to the defaultConfig singleton
  // instead, see GameContext) — so a referential check tells apart "coming back
  // from a game, prefill for a quick edit" from "starting clean, blank the names".
  // A fresh start also defaults to the Grass template — the common case — rather
  // than forcing every volunteer to pick it by hand.
  const startingFresh = state.config === defaultConfig;
  const [cfg, setCfg] = useState<GameConfig>(() =>
    startingFresh
      ? {
          ...defaultConfig,
          ...GRASS_TEMPLATE,
          teams: {
            A: { ...defaultConfig.teams.A, name: '' },
            B: { ...defaultConfig.teams.B, name: '' },
          },
          // Pre-filled and ready the moment the checkbox is ticked, so the volunteer
          // never has to hand-compute the next quarter-hour themselves.
          startingTime: { enabled: false, time: suggestedStartingTime() },
        }
      : // Coming back to config (e.g. BACK_TO_CONFIG) carries over the previous
        // game's startingTime verbatim. If that time has already passed, refresh
        // it to the next quarter-hour rather than showing (and blocking on) a
        // clock time that's now in the past.
        state.config.startingTime.enabled && !startingTimeIsFuture(state.config.startingTime.time)
        ? {
            ...state.config,
            startingTime: { ...state.config.startingTime, time: suggestedStartingTime() },
          }
        : state.config,
  );
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [showAbout, setShowAbout] = useState(false);
  // The guide is a page, not a dialog, and it is rendered from here rather than
  // from App so this screen stays mounted underneath it — everything already
  // typed into the form is still there when the volunteer comes back.
  const [showGuide, setShowGuide] = useState(false);
  // Collapsed by default; a fresh load/reload always starts collapsed regardless of what
  // was saved, since that saved value only means something relative to a just-finished
  // game. Coming back from BACK_TO_CONFIG (see startingFresh above) is the one case where
  // "the user had it open" is worth honoring.
  const [playersCollapsed, setPlayersCollapsed] = useState(() =>
    startingFresh ? true : loadPlayersSectionCollapsed(),
  );
  const togglePlayersCollapsed = () =>
    setPlayersCollapsed((prev) => {
      const next = !prev;
      savePlayersSectionCollapsed(next);
      return next;
    });
  // Same treatment as Roster, for the same reason: hot weather is the exception, so
  // the section is folded away until a tournament actually runs the protocol.
  const [waterBreakCollapsed, setWaterBreakCollapsed] = useState(() =>
    startingFresh ? true : loadWaterBreakSectionCollapsed(),
  );
  const toggleWaterBreakCollapsed = () =>
    setWaterBreakCollapsed((prev) => {
      const next = !prev;
      saveWaterBreakSectionCollapsed(next);
      return next;
    });
  const removeSavedTeam = (name: string) => {
    deleteTeam(name);
    setSavedTeams((prev) => prev.filter((t) => t.name !== name));
  };

  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(() => loadSavedTemplates());
  // Grass is always the dropdown's starting selection — there's no "none" option,
  // since every field already has a sensible value and can just be overwritten.
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('predefined:grass');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<string | null>(null);

  // Whatever is currently typed into a numeric field, while it is being typed.
  // Clamping on every keystroke (what this screen used to do) makes the fields
  // unusable on a phone: emptying one to retype it snaps it straight back to the
  // old value, and the "1" on the way to "15" is instantly rewritten to the
  // minimum. So the raw text is shown as-is and the clamp is deferred to blur —
  // an in-range number still commits as you type, an out-of-range or half-typed
  // one just waits.
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const numberFieldProps = (
    key: string,
    value: number,
    min: number,
    max: number,
    // `final` is true only for the blur commit, i.e. once the number is the one
    // the user meant — the moment for any knock-on clamp of another field.
    commit: (n: number, final: boolean) => void,
  ) => ({
    className: inputClass,
    inputMode: 'numeric' as const,
    value: numberDrafts[key] ?? String(value),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setNumberDrafts((d) => ({ ...d, [key]: raw }));
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= min && n <= max) commit(n, false);
    },
    onBlur: () => {
      const n = parseInt(numberDrafts[key] ?? '', 10);
      // An emptied field falls back to the value it had, not to the minimum.
      commit(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value, true);
      setNumberDrafts((d) => {
        const rest = { ...d };
        delete rest[key];
        return rest;
      });
    },
  });

  // The water-break trigger scores are a list, not a single number, so they can't go
  // through numberFieldProps: the field holds free text ("4, 12") while it is being
  // typed and is only parsed on blur — re-sorting and de-duplicating on every
  // keystroke would fight the comma the user is halfway through typing.
  const [scoresDraft, setScoresDraft] = useState<string | null>(null);
  const commitScores = () => {
    const parsed = (scoresDraft ?? '')
      .split(/[^0-9]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 100);
    setCfg((c) => ({
      ...c,
      waterBreaks: { ...c.waterBreaks, atScores: [...new Set(parsed)].sort((a, b) => a - b) },
    }));
    setScoresDraft(null);
  };

  const applyTemplateChoice = (key: string) => {
    setSelectedTemplateKey(key);
    // A template rewrites these fields wholesale, so any half-typed value in one
    // of them is stale — drop the drafts rather than let them mask the new value.
    setNumberDrafts({});
    setScoresDraft(null);
    if (key === 'predefined:grass') setCfg((c) => ({ ...c, ...PREDEFINED_TEMPLATES.grass }));
    else if (key === 'predefined:beach') setCfg((c) => ({ ...c, ...PREDEFINED_TEMPLATES.beach }));
    else if (key.startsWith('custom:')) {
      const name = key.slice('custom:'.length);
      const template = savedTemplates.find((t) => t.name === name);
      if (template) setCfg((c) => ({ ...c, ...template.settings }));
    }
  };
  const selectedCustomName = selectedTemplateKey.startsWith('custom:')
    ? selectedTemplateKey.slice('custom:'.length)
    : null;

  const normalizeTeamName = (n: string) => n.trim().toLowerCase();
  const isSavedTeamName = (name: string) =>
    savedTeams.some((team) => normalizeTeamName(team.name) === normalizeTeamName(name));

  const set = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));
  const setTeam = (id: TeamId, patch: Partial<GameConfig['teams'][TeamId]>) =>
    setCfg((c) => ({ ...c, teams: { ...c.teams, [id]: { ...c.teams[id], ...patch } } }));
  const selectSavedTeam = (id: TeamId, team: SavedTeam) =>
    setCfg((c) => ({
      ...c,
      teams: { ...c.teams, [id]: { name: team.name, color: team.color } },
      players: { ...c.players, [id]: team.players.map((p) => ({ ...p, id: uid() })) },
    }));
  // Renaming never touches the roster: turning a loaded "Ravens" into "Ravens B"
  // is the common way to build a second squad out of the first, and silently
  // emptying the list would throw away exactly what the user meant to keep. The
  // saved "Ravens" is untouched either way — the store is only written by
  // addSavedTeam below and by the roster sync once a game starts.
  const changeTeamName = (id: TeamId, name: string) => setTeam(id, { name });
  // "Add <name> as a new team" writes to the saved-teams store there and then,
  // with whatever name, colour and roster the form currently holds, instead of
  // waiting for START_GAME. So a team can be set up (and reused next time) even
  // if this game never gets played.
  const addSavedTeam = (id: TeamId, name: string) => {
    saveTeam({ name, color: cfg.teams[id].color, players: cfg.players[id] });
    setSavedTeams(loadSavedTeams());
    setTeam(id, { name });
  };
  // Every roster edit is written back to the saved-teams store immediately, so a
  // roster survives the combobox being switched to another team and back — that
  // reload reads from the store, and waiting for START_GAME to write meant it
  // still held the roster as it was when the team was first saved (usually
  // empty). Only teams already in the store are synced: a name that was never
  // added stays local until "add as a new team" or the game start says otherwise.
  const setPlayers = (id: TeamId, players: PlayerInfo[]) => {
    setCfg((c) => ({ ...c, players: { ...c.players, [id]: players } }));
    const name = cfg.teams[id].name.trim();
    if (!isSavedTeamName(name)) return;
    saveTeam({ name, color: cfg.teams[id].color, players });
    setSavedTeams(loadSavedTeams());
  };
  const addPlayer = (id: TeamId, number: string, name: string) =>
    setPlayers(id, [...cfg.players[id], { id: uid(), number: number.trim(), name: name.trim() }]);
  const removePlayer = (id: TeamId, playerId: string) =>
    setPlayers(
      id,
      cfg.players[id].filter((p) => p.id !== playerId),
    );

  // Phone back button on the guide: same as tapping its own "back to setup" —
  // it's a screen reached from a link, not an external page, so the gesture
  // should return here rather than exit the app. This "lands" (no stay()), so a
  // single press drops us straight back onto the setup form, leaving nothing on
  // the history stack behind it.
  const resolveGuide = useBackGuard(showGuide, () => setShowGuide(false));

  // Closing via the guide's own button (not the gesture) has to drop the still-
  // pending history entry too, so the next back press doesn't hit a dead one.
  if (showGuide)
    return (
      <GuideScreen
        onBack={() => {
          setShowGuide(false);
          resolveGuide();
        }}
      />
    );

  const teamsReady = cfg.teams.A.name.trim() !== '' && cfg.teams.B.name.trim() !== '';
  const duplicateTeamNames =
    teamsReady && normalizeTeamName(cfg.teams.A.name) === normalizeTeamName(cfg.teams.B.name);
  const halfScoreValid = cfg.halfScore < cfg.targetScore;
  const startingTimeReady =
    !cfg.startingTime.enabled || startingTimeIsFuture(cfg.startingTime.time);
  const canStart = teamsReady && !duplicateTeamNames && halfScoreValid && startingTimeReady;

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-board text-2xl font-bold">{t('appTitle')}</h1>
          <p className="text-chalk/50 text-sm">{t('tagline')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            aria-label={t('language')}
            className="rounded-lg bg-panel border border-line px-2 py-1"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="ca">CA</option>
          </select>
          <button
            className="rounded-lg bg-panel border border-line w-8 h-8 text-chalk/70"
            aria-label={t('aboutBtn')}
            onClick={() => setShowAbout(true)}
          >
            ⓘ
          </button>
        </div>
      </header>

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}

      {/* Entry to the guide: directly under the description and above the first
          card, where a volunteer who has never done this lands before touching
          anything — and out of the header, so it never competes with the icons. */}
      <p className="text-center">
        <button
          type="button"
          className="text-sm text-signal underline"
          onClick={() => setShowGuide(true)}
        >
          {t('guideLink')}
        </button>
      </p>

      <Section title={t('templateTitle')}>
        <div>
          <label className={fieldLabel}>{t('templateSelectLabel')}</label>
          <select
            aria-label={t('templateSelectLabel')}
            className={inputClass}
            value={selectedTemplateKey}
            onChange={(e) => applyTemplateChoice(e.target.value)}
          >
            <optgroup label={t('templatePredefinedGroup')}>
              <option value="predefined:grass">{t('templateGrassName')}</option>
              <option value="predefined:beach">{t('templateBeachName')}</option>
            </optgroup>
            {savedTemplates.length > 0 && (
              <optgroup label={t('templateCustomGroup')}>
                {savedTemplates.map((template) => (
                  <option key={template.name} value={`custom:${template.name}`}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {selectedCustomName && (
          <button
            type="button"
            className="text-xs text-chalk/60 underline"
            onClick={() => setPendingDeleteTemplate(selectedCustomName)}
          >
            {t('btnDeleteTemplate')}
          </button>
        )}
      </Section>

      <Section title={t('setupTitle')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('division')}</label>
            <select
              className={inputClass}
              value={cfg.division}
              onChange={(e) => set('division', e.target.value as GameConfig['division'])}
            >
              <option value="open">{t('divisionOpen')}</option>
              <option value="women">{t('divisionWomen')}</option>
              <option value="mixed">{t('divisionMixed')}</option>
            </select>
          </div>
          <div>
            <label className={fieldLabel}>{t('fieldNumber')}</label>
            <input
              className={inputClass}
              maxLength={20}
              value={cfg.fieldNumber}
              onChange={(e) => set('fieldNumber', e.target.value)}
            />
          </div>
        </div>

        {(['A', 'B'] as TeamId[]).map((id) => (
          <div key={id} className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={fieldLabel}>{id === 'A' ? t('teamA') : t('teamB')}</label>
              <TeamNameCombobox
                label={id === 'A' ? t('teamA') : t('teamB')}
                value={cfg.teams[id].name}
                savedTeams={savedTeams}
                otherTeamName={cfg.teams[id === 'A' ? 'B' : 'A'].name}
                onChangeText={(name) => changeTeamName(id, name)}
                onSelectTeam={(team) => selectSavedTeam(id, team)}
                onAddAsNewTeam={(name) => addSavedTeam(id, name)}
                onDeleteTeam={removeSavedTeam}
                maxLength={40}
              />
            </div>
            <div>
              <label className={fieldLabel}>{t('teamColor')}</label>
              <TeamColorPicker
                label={`${t('teamColor')} ${cfg.teams[id].name}`}
                color={cfg.teams[id].color}
                onChange={(color) => setTeam(id, { color })}
              />
            </div>
          </div>
        ))}

        {cfg.division === 'mixed' && (
          <div>
            <label className={fieldLabel}>{t('mixedRatioRule')}</label>
            <select
              className={inputClass}
              value={cfg.mixedRule}
              onChange={(e) => set('mixedRule', e.target.value as 'A' | 'B')}
            >
              <option value="A">{t('ruleA')}</option>
              <option value="B">{t('ruleB')}</option>
            </select>
          </div>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.startingTime.enabled}
            onChange={(e) =>
              set('startingTime', { ...cfg.startingTime, enabled: e.target.checked })
            }
          />
          <span>{t('startingTimeEnabled')}</span>
        </label>
        {cfg.startingTime.enabled && (
          <div>
            <label className={fieldLabel}>{t('startingTimeLabel')}</label>
            <input
              type="time"
              className={inputClass}
              value={cfg.startingTime.time}
              onChange={(e) => set('startingTime', { ...cfg.startingTime, time: e.target.value })}
            />
          </div>
        )}
      </Section>

      <Section
        title={t('playersTitle')}
        collapsible
        collapsed={playersCollapsed}
        onToggleCollapsed={togglePlayersCollapsed}
        toggleAriaLabel={t(playersCollapsed ? 'expandSection' : 'collapseSection', {
          title: t('playersTitle'),
        })}
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.trackPlayers}
            onChange={(e) => set('trackPlayers', e.target.checked)}
          />
          <span>{t('trackPlayers')}</span>
        </label>
        <PlayerRosterEditor
          label={cfg.teams.A.name.trim() || t('teamA')}
          players={cfg.players.A}
          onAdd={(number, name) => addPlayer('A', number, name)}
          onRemove={(id) => removePlayer('A', id)}
        />
        <PlayerRosterEditor
          label={cfg.teams.B.name.trim() || t('teamB')}
          players={cfg.players.B}
          onAdd={(number, name) => addPlayer('B', number, name)}
          onRemove={(id) => removePlayer('B', id)}
        />
      </Section>

      <Section title={t('coinToss')}>
        <p className="text-sm text-chalk/60">{t('coinTossHelp')}</p>
        <div>
          <label className={fieldLabel}>{t('startingOffense')}</label>
          <select
            className={inputClass}
            value={cfg.startingOffense}
            onChange={(e) => set('startingOffense', e.target.value as TeamId)}
          >
            <option value="A">{cfg.teams.A.name.trim() || t('teamA')}</option>
            <option value="B">{cfg.teams.B.name.trim() || t('teamB')}</option>
          </select>
        </div>
        <div>
          <label className={fieldLabel}>{t('startingSide')}</label>
          <select
            className={inputClass}
            value={cfg.startingSide}
            onChange={(e) => set('startingSide', e.target.value as TeamId)}
          >
            <option value="A">{cfg.teams.A.name.trim() || t('teamA')}</option>
            <option value="B">{cfg.teams.B.name.trim() || t('teamB')}</option>
          </select>
        </div>
        {cfg.division === 'mixed' && cfg.mixedRule === 'A' && (
          <div>
            <label className={fieldLabel}>{t('startingRatio')}</label>
            <select
              className={inputClass}
              value={cfg.startingRatio}
              onChange={(e) => set('startingRatio', e.target.value as 'male' | 'female')}
            >
              <option value="female">{t('ratioFemale')}</option>
              <option value="male">{t('ratioMale')}</option>
            </select>
          </div>
        )}
      </Section>

      <Section title={t('winConditions')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('targetScore')}</label>
            <input
              {...numberFieldProps('targetScore', cfg.targetScore, 1, 99, (targetScore) =>
                set('targetScore', targetScore),
              )}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('timeLimit')}</label>
            <input
              {...numberFieldProps(
                'timeLimit',
                cfg.timeLimitMinutes,
                1,
                180,
                // The half-time limit can't outlive the game, but it is only pulled
                // down once this field is finished: cascading per keystroke would
                // collapse a 55 to 4 on the way to typing 40, and leave it there.
                (timeLimitMinutes, final) =>
                  setCfg((c) => ({
                    ...c,
                    timeLimitMinutes,
                    halfTimeLimitMinutes: final
                      ? Math.min(c.halfTimeLimitMinutes, timeLimitMinutes)
                      : c.halfTimeLimitMinutes,
                  })),
              )}
            />
          </div>
        </div>
        <div>
          <label className={fieldLabel}>{t('endCapLabel')}</label>
          <select
            className={inputClass}
            value={cfg.endCap.kind === 'cap' ? `cap${cfg.endCap.plus}` : cfg.endCap.kind}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'none') set('endCap', { kind: 'none' });
              else if (v === 'cap1') set('endCap', { kind: 'cap', plus: 1 });
              else if (v === 'cap2') set('endCap', { kind: 'cap', plus: 2 });
              else set('endCap', { kind: 'conditional', plus: 1, minDiff: 2 });
            }}
          >
            <option value="none">{t('endCapNone')}</option>
            <option value="cap1">{t('endCapPlus', { n: 1 })}</option>
            <option value="cap2">{t('endCapPlus', { n: 2 })}</option>
            <option value="conditional">
              {t('endCapCond', {
                n: cfg.endCap.kind === 'conditional' ? cfg.endCap.plus : 1,
                x: cfg.endCap.kind === 'conditional' ? cfg.endCap.minDiff : 2,
              })}
            </option>
          </select>
          {cfg.endCap.kind === 'conditional' && (
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <label className={fieldLabel}>CAP +</label>
                <select
                  className={inputClass}
                  value={cfg.endCap.plus}
                  onChange={(e) =>
                    set('endCap', {
                      kind: 'conditional',
                      plus: Number(e.target.value) as 1 | 2,
                      minDiff: cfg.endCap.kind === 'conditional' ? cfg.endCap.minDiff : 2,
                    })
                  }
                >
                  <option value={1}>+1</option>
                  <option value={2}>+2</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t('capDiff')}</label>
                <select
                  className={inputClass}
                  value={cfg.endCap.minDiff}
                  onChange={(e) =>
                    set('endCap', {
                      kind: 'conditional',
                      plus: cfg.endCap.kind === 'conditional' ? cfg.endCap.plus : 1,
                      minDiff: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title={t('halfTimeTitle')}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('halfScore')}</label>
            <input
              {...numberFieldProps('halfScore', cfg.halfScore, 1, 99, (halfScore) =>
                set('halfScore', halfScore),
              )}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('halfTimeLimit')}</label>
            <input
              {...numberFieldProps(
                'halfTimeLimit',
                cfg.halfTimeLimitMinutes,
                1,
                cfg.timeLimitMinutes,
                (halfTimeLimitMinutes) => set('halfTimeLimitMinutes', halfTimeLimitMinutes),
              )}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('halfTimeBreak')}</label>
            <input
              {...numberFieldProps(
                'halfTimeBreak',
                cfg.halfTimeBreakSeconds,
                // 0 is a legal setting, not a slip: the Beach template ships with
                // no half-time break at all.
                0,
                1800,
                (halfTimeBreakSeconds) => set('halfTimeBreakSeconds', halfTimeBreakSeconds),
              )}
            />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.halfCap.kind === 'cap'}
            onChange={(e) =>
              set('halfCap', e.target.checked ? { kind: 'cap', plus: 1 } : { kind: 'none' })
            }
          />
          <span>{t('halfCapPlus')}</span>
        </label>
      </Section>

      <Section title={t('timeoutsTitle')}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.timeouts.enabled}
            onChange={(e) => set('timeouts', { ...cfg.timeouts, enabled: e.target.checked })}
          />
          <span className="text-sm">{t('timeoutsEnabled')}</span>
        </label>
        <div
          className={`grid grid-cols-2 gap-3 ${cfg.timeouts.enabled ? '' : 'opacity-40'}`}
          aria-disabled={!cfg.timeouts.enabled}
        >
          <div>
            <label className={fieldLabel}>{t('timeoutsCount')}</label>
            <input
              {...numberFieldProps(
                'timeoutsCount',
                cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0,
                0,
                10,
                (count) => {
                  const perHalf = cfg.timeouts.perGame === null;
                  set('timeouts', {
                    ...cfg.timeouts,
                    perHalf: perHalf ? count : null,
                    perGame: perHalf ? null : count,
                  });
                },
              )}
              disabled={!cfg.timeouts.enabled}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('timeoutsScope')}</label>
            <select
              className={inputClass}
              disabled={!cfg.timeouts.enabled}
              value={cfg.timeouts.perGame === null ? 'half' : 'game'}
              onChange={(e) => {
                const count = cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0;
                const perHalf = e.target.value === 'half';
                set('timeouts', {
                  ...cfg.timeouts,
                  perHalf: perHalf ? count : null,
                  perGame: perHalf ? null : count,
                });
              }}
            >
              <option value="half">{t('timeoutsScopeHalf')}</option>
              <option value="game">{t('timeoutsScopeGame')}</option>
            </select>
          </div>
          <div>
            <label className={fieldLabel}>{t('timeoutDuration')}</label>
            <input
              {...numberFieldProps(
                'timeoutDuration',
                cfg.timeouts.durationSeconds,
                15,
                300,
                (durationSeconds) => set('timeouts', { ...cfg.timeouts, durationSeconds }),
              )}
              disabled={!cfg.timeouts.enabled}
            />
          </div>
          <label className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              disabled={!cfg.timeouts.enabled}
              checked={cfg.timeouts.disallowLastFiveMinutes}
              onChange={(e) =>
                set('timeouts', { ...cfg.timeouts, disallowLastFiveMinutes: e.target.checked })
              }
            />
            <span className="text-sm">{t('timeoutLastFive')}</span>
          </label>
        </div>
      </Section>

      {/* Hot-weather hydration breaks (WFDF Appendix B4.3). Collapsed by default —
          most games never run the protocol — and the checkbox governs only the
          automatic ones: a break can always be called by hand from the game screen's
          raised-hand button, which is why the duration stays editable either way. */}
      <Section
        title={t('waterBreakTitle')}
        collapsible
        collapsed={waterBreakCollapsed}
        onToggleCollapsed={toggleWaterBreakCollapsed}
        toggleAriaLabel={t(waterBreakCollapsed ? 'expandSection' : 'collapseSection', {
          title: t('waterBreakTitle'),
        })}
      >
        <p className="text-xs text-chalk/50">{t('waterBreakHelp')}</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cfg.waterBreaks.enabled}
            onChange={(e) => set('waterBreaks', { ...cfg.waterBreaks, enabled: e.target.checked })}
          />
          <span className="text-sm">{t('waterBreakEnabled')}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className={cfg.waterBreaks.enabled ? '' : 'opacity-40'}>
            <label className={fieldLabel} htmlFor="water-break-scores">
              {t('waterBreakScores')}
            </label>
            <input
              id="water-break-scores"
              className={inputClass}
              inputMode="numeric"
              disabled={!cfg.waterBreaks.enabled}
              value={scoresDraft ?? cfg.waterBreaks.atScores.join(', ')}
              onChange={(e) => setScoresDraft(e.target.value)}
              onBlur={commitScores}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="water-break-duration">
              {t('waterBreakDuration')}
            </label>
            <input
              id="water-break-duration"
              {...numberFieldProps(
                'waterBreakDuration',
                cfg.waterBreaks.durationSeconds,
                15,
                900,
                (durationSeconds) => set('waterBreaks', { ...cfg.waterBreaks, durationSeconds }),
              )}
            />
          </div>
        </div>
      </Section>

      <button
        type="button"
        className={`${secondaryButtonOnPitch} w-full`}
        onClick={() => setShowSaveTemplate(true)}
      >
        {t('saveAsTemplateBtn')}
      </button>
      <button
        className="w-full rounded-xl bg-signal text-pitch font-board font-bold text-lg py-4 active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
        disabled={!canStart}
        onClick={() => dispatch({ type: 'START_GAME', config: cfg })}
      >
        {t('startGame')}
      </button>
      {!teamsReady && <p className="text-sm text-chalk/60 text-center">{t('teamsRequired')}</p>}
      {teamsReady && duplicateTeamNames && (
        <p className="text-sm text-chalk/60 text-center">{t('duplicateTeamNames')}</p>
      )}
      {teamsReady && !duplicateTeamNames && !halfScoreValid && (
        <p className="text-sm text-chalk/60 text-center">{t('halfScoreInvalid')}</p>
      )}
      {teamsReady && !duplicateTeamNames && halfScoreValid && !startingTimeReady && (
        <p className="text-sm text-chalk/60 text-center">{t('startingTimeInPast')}</p>
      )}

      {showSaveTemplate && (
        <SaveTemplateDialog
          onClose={() => setShowSaveTemplate(false)}
          onSave={(name) => {
            saveTemplate({ name, settings: extractTemplateSettings(cfg) });
            setSavedTemplates(loadSavedTemplates());
            setSelectedTemplateKey(`custom:${name}`);
            setShowSaveTemplate(false);
          }}
        />
      )}
      {pendingDeleteTemplate && (
        <ConfirmDeleteTemplateDialog
          name={pendingDeleteTemplate}
          onCancel={() => setPendingDeleteTemplate(null)}
          onConfirm={() => {
            deleteTemplate(pendingDeleteTemplate);
            setSavedTemplates((prev) => prev.filter((t) => t.name !== pendingDeleteTemplate));
            if (selectedTemplateKey === `custom:${pendingDeleteTemplate}`)
              applyTemplateChoice('predefined:grass');
            setPendingDeleteTemplate(null);
          }}
        />
      )}
    </div>
  );
}
