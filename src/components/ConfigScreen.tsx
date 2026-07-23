import { useState } from 'react';
import { useT, type Lang } from '../i18n/useT';
import { defaultConfig } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { useBackGuard } from '../hooks/useBackGuard';
import { deleteTeam, loadSavedTeams } from '../state/rosterStorage';
import {
  BEACH_TEMPLATE,
  GRASS_TEMPLATE,
  deleteTemplate,
  extractTemplateSettings,
  loadSavedTemplates,
  saveTemplate,
} from '../state/templates';
import type { GameConfig, SavedTeam, SavedTemplate, TeamId } from '../state/types';
import { loadPlayersSectionCollapsed, savePlayersSectionCollapsed } from '../state/uiPreferences';
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

  const applyTemplateChoice = (key: string) => {
    setSelectedTemplateKey(key);
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
  // Typing away from a name that matched a loaded saved team means the user is
  // now building a different team, so its roster shouldn't carry over.
  const changeTeamName = (id: TeamId, name: string) => {
    const normalize = (n: string) => n.trim().toLowerCase();
    const current = cfg.teams[id].name;
    const wasLoadedSavedTeam = savedTeams.some(
      (team) => normalize(team.name) === normalize(current),
    );
    setCfg((c) => ({
      ...c,
      teams: { ...c.teams, [id]: { ...c.teams[id], name } },
      players:
        wasLoadedSavedTeam && normalize(name) !== normalize(current)
          ? { ...c.players, [id]: [] }
          : c.players,
    }));
  };
  const addPlayer = (id: TeamId, number: string, name: string) =>
    setCfg((c) => ({
      ...c,
      players: {
        ...c.players,
        [id]: [...c.players[id], { id: uid(), number: number.trim(), name: name.trim() }],
      },
    }));
  const removePlayer = (id: TeamId, playerId: string) =>
    setCfg((c) => ({
      ...c,
      players: { ...c.players, [id]: c.players[id].filter((p) => p.id !== playerId) },
    }));

  const num = (v: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };
  const normalizeTeamName = (n: string) => n.trim().toLowerCase();

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
              className={inputClass}
              inputMode="numeric"
              value={cfg.targetScore}
              onChange={(e) => set('targetScore', num(e.target.value, cfg.targetScore, 1, 99))}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('timeLimit')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={cfg.timeLimitMinutes}
              onChange={(e) => {
                const timeLimitMinutes = num(e.target.value, cfg.timeLimitMinutes, 1, 180);
                setCfg((c) => ({
                  ...c,
                  timeLimitMinutes,
                  halfTimeLimitMinutes: Math.min(c.halfTimeLimitMinutes, timeLimitMinutes),
                }));
              }}
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
              className={inputClass}
              inputMode="numeric"
              value={cfg.halfScore}
              onChange={(e) => set('halfScore', num(e.target.value, cfg.halfScore, 1, 99))}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('halfTimeLimit')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={cfg.halfTimeLimitMinutes}
              onChange={(e) =>
                set(
                  'halfTimeLimitMinutes',
                  num(e.target.value, cfg.halfTimeLimitMinutes, 1, cfg.timeLimitMinutes),
                )
              }
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('halfTimeBreak')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={cfg.halfTimeBreakSeconds}
              onChange={(e) =>
                set('halfTimeBreakSeconds', num(e.target.value, cfg.halfTimeBreakSeconds, 30, 1800))
              }
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
              className={inputClass}
              inputMode="numeric"
              disabled={!cfg.timeouts.enabled}
              value={cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0}
              onChange={(e) => {
                const count = num(e.target.value, 0, 0, 10);
                const perHalf = cfg.timeouts.perGame === null;
                set('timeouts', {
                  ...cfg.timeouts,
                  perHalf: perHalf ? count : null,
                  perGame: perHalf ? null : count,
                });
              }}
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
              className={inputClass}
              inputMode="numeric"
              disabled={!cfg.timeouts.enabled}
              value={cfg.timeouts.durationSeconds}
              onChange={(e) =>
                set('timeouts', {
                  ...cfg.timeouts,
                  durationSeconds: num(e.target.value, cfg.timeouts.durationSeconds, 15, 300),
                })
              }
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
