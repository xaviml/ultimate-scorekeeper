import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { defaultConfig, rosterTeams, statsTrackingEnabled } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { ratioGenderCheckAvailable } from '../state/lines';
import {
  deleteTeam,
  loadSavedTeams,
  saveTeam,
  saveTeamLines,
  subscribeSavedTeams,
} from '../state/rosterStorage';
import { syncFormTeams } from '../state/savedTeamSync';
import {
  BEACH_TEMPLATE,
  GRASS_TEMPLATE,
  applyTemplate,
  deleteTemplate,
  extractTemplateSettings,
  loadSavedTemplates,
  saveTemplate,
} from '../state/templates';
import type {
  GameConfig,
  Gender,
  LineGenderCheck,
  PlayerInfo,
  SavedLine,
  SavedTeam,
  SavedTemplate,
  TeamId,
} from '../state/types';
import { AppMenu } from './AppMenu';
import { CheckField } from './CheckField';
import { ConfirmDeleteTemplateDialog } from './ConfirmDeleteTemplateDialog';
import {
  ChevronRightIcon,
  CoinIcon,
  DropIcon,
  FlagIcon,
  HalfIcon,
  MenuIcon,
  PlayersIcon,
  PlusIcon,
  SetupIcon,
  ShirtIcon,
  StatsIcon,
  TimeoutIcon,
} from './icons';
import { SavedLinesEditor } from './SavedLinesEditor';
import { RosterImportDialog } from './RosterImportDialog';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { TeamColorPicker } from './TeamColorPicker';
import { TeamNameCombobox } from './TeamNameCombobox';
import { TeamRosterDialog } from './TeamRosterDialog';
import { uid } from '../state/uid';
import { AppLogo } from './AppLogo';
import { Segmented, type SegmentOption } from './Segmented';
import { Stepper } from './Stepper';
import { fieldLabel, hintText, inputClass, pillClass, specSection, specTitle } from './ui';

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

/** Whole minutes from now until a configured "HH:MM" today, rounded up; null if not ahead. */
function minutesUntil(time: string, nowMs: number): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const d = new Date(nowMs);
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  const ms = d.getTime() - nowMs;
  return ms > 0 ? Math.ceil(ms / 60000) : null;
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
  id,
  title,
  icon,
  action,
  children,
  fold,
  summary,
  enabled,
}: {
  /** An anchor, so the Start bar can scroll to the section that is holding it up. */
  id?: string;
  title: string;
  /** A glyph from the icon set, drawn before the title in the accent. */
  icon?: React.ReactNode;
  /** A small control in the heading's right-hand corner, for a section with no on/off. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Folds the section to its heading and `summary` — the rules, which are set once a
   * tournament and then only glanced at. The whole heading is the toggle, through a
   * transparent button laid over it (so the heading stays a heading, with its own
   * name), named "Expand/Collapse {title}" for a screen reader.
   */
  fold?: { open: boolean; onToggle: () => void; label: string };
  /** One line that stands in for the folded contents: "15 pts · 100 min · CAP +1". */
  summary?: React.ReactNode;
  /**
   * An on/off for the whole section, drawn as an unlabelled switch in the heading's
   * top-right corner. Off folds the section down to its title: there is nothing in it
   * left to set, and the values stay as they were for when it is switched back on.
   */
  enabled?: { checked: boolean; onChange: (checked: boolean) => void; label: string };
}) {
  const on = !enabled || enabled.checked;
  const canOpen = fold !== undefined && on;
  const open = on && (!fold || fold.open);
  const heading = (
    <h2 className={`${specTitle} flex items-center gap-2`}>
      {icon && (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      )}
      {title}
    </h2>
  );
  return (
    <section id={id} className={`${specSection} scroll-mt-4`}>
      <div className="relative flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {heading}
          {summary && !open && (
            <div className="mt-1 text-xs leading-snug text-chalk/60 truncate">{summary}</div>
          )}
        </div>
        {canOpen && (
          <button
            type="button"
            className="absolute inset-0 w-full"
            aria-expanded={fold.open}
            aria-label={fold.label}
            onClick={fold.onToggle}
          />
        )}
        {enabled && (
          // Above the fold button, so the switch takes its own taps.
          <div className="relative z-10 -my-1.5 shrink-0">
            <CheckField
              variant="switch"
              label={enabled.label}
              labelHidden
              checked={enabled.checked}
              onChange={enabled.onChange}
            />
          </div>
        )}
        {action && <div className="relative z-10 shrink-0">{action}</div>}
        {canOpen && (
          // pointer-events-none: rotated, the chevron is transformed, which lifts it
          // above the fold button laid over the heading — and would swallow the tap.
          <span
            aria-hidden="true"
            className={`pointer-events-none shrink-0 text-chalk/50 transition-transform ${fold.open ? 'rotate-90' : ''}`}
          >
            <ChevronRightIcon size="w-4 h-4" />
          </span>
        )}
      </div>
      {open && children}
    </section>
  );
}

/**
 * A duration set in seconds, read back in minutes — "1m 30s", "7m" — under the
 * fields that count in seconds, so 420 doesn't have to be divided in your head.
 * Nothing under a minute, where the seconds already say it.
 */
function secondsInMinutes(seconds: number): string | null {
  if (seconds < 60) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** A problem with a field, said right under it. */
const errorText = 'text-xs leading-snug text-signal';

const DIVISION_LABEL = {
  open: 'divisionOpen',
  women: 'divisionWomen',
  mixed: 'divisionMixed',
} as const;

export default function ConfigScreen() {
  const { t } = useT();
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
  // This screen mounts fresh every time the phase becomes 'config' — from the
  // report's top or bottom "New game" buttons, or from the dashboard's own
  // "back to setup" before a game starts — and the page may still be scrolled
  // from whichever screen led here. Landing anywhere but the top reads as a
  // half-loaded form.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => loadSavedTeams());
  // The Teams page (#/teams) writes the store while this screen sits mounted under it,
  // so the combobox's list follows every write, and a replace from that page also
  // brings the form's own saved teams up to date (see syncFormTeams). The same sync
  // runs once on mount, for edits made there while this screen was not mounted.
  useEffect(() => {
    setCfg((c) => syncFormTeams(c, loadSavedTeams()));
    return subscribeSavedTeams((change) => {
      const stored = loadSavedTeams();
      setSavedTeams(stored);
      if (change.replaced) setCfg((c) => syncFormTeams(c, stored, change.renames));
    });
  }, []);
  // The header menu. Match history and the guides behind it are pages of their own
  // (#/history, #/guide, #/guide/advanced) that App opens over this screen, keeping it
  // mounted underneath so everything already typed into the form is still there when
  // the volunteer comes back.
  const [showMenu, setShowMenu] = useState(false);
  // "Now", for the scheduled start's countdown. It only needs to move while a start
  // time is set, and half a minute is fine-grained enough for a figure in minutes.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!cfg.startingTime.enabled) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [cfg.startingTime.enabled, cfg.startingTime.time]);
  // Which team's roster sheet is open, from its row in the Teams card.
  const [rosterTeam, setRosterTeam] = useState<TeamId | null>(null);
  // Which of the rule sections are unfolded. All start folded to their one-line
  // summaries: the rules are set once a tournament and then only glanced at.
  type RuleSection = 'win' | 'half' | 'timeouts' | 'water';
  const [openRules, setOpenRules] = useState<Record<RuleSection, boolean>>({
    win: false,
    half: false,
    timeouts: false,
    water: false,
  });
  const foldFor = (key: RuleSection, title: string) => ({
    open: openRules[key],
    onToggle: () => setOpenRules((o) => ({ ...o, [key]: !o[key] })),
    label: t(openRules[key] ? 'collapseSection' : 'expandSection', { title }),
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
  // Which team's roster the importer is open for, or null.
  const [importingTeam, setImportingTeam] = useState<TeamId | null>(null);

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

  // Every number on this screen is a Stepper around those same props: typing keeps
  // the draft-then-clamp behaviour above, and − / + commit at once (dropping any
  // half-typed draft, which the tap has just overruled).
  const numberField = (
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    commit: (n: number, final: boolean) => void,
    {
      step = 1,
      unit,
      id,
      note,
    }: { step?: number; unit?: string; id?: string; note?: string | null } = {},
  ) => (
    <>
      <Stepper
        label={label}
        input={{ ...numberFieldProps(key, value, min, max, commit), id }}
        value={value}
        min={min}
        max={max}
        step={step}
        unit={unit}
        onStep={(n) => {
          setNumberDrafts((d) => {
            const rest = { ...d };
            delete rest[key];
            return rest;
          });
          commit(n, true);
        }}
      />
      {/* On the label's line, at the far right — the wrapper around the label and
          this field is \`relative\` for it. */}
      {note && (
        <span className="absolute top-0 right-0 text-xs leading-4 text-chalk/50 font-clock font-semibold">
          {note}
        </span>
      )}
    </>
  );

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
    if (key === 'predefined:grass') setCfg((c) => applyTemplate(c, PREDEFINED_TEMPLATES.grass));
    else if (key === 'predefined:beach')
      setCfg((c) => applyTemplate(c, PREDEFINED_TEMPLATES.beach));
    else if (key.startsWith('custom:')) {
      const name = key.slice('custom:'.length);
      const template = savedTemplates.find((t) => t.name === name);
      if (template) setCfg((c) => applyTemplate(c, template.settings));
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
  /**
   * Division and mixed-rule are the only two fields `ratioGenderCheckAvailable`
   * reads, so both setters route through here: whichever one moves, if that flips
   * whether `'gameRatio'` is even an option, the gender check follows it — landing
   * on the default the option's availability implies rather than being left on a
   * value the dropdown no longer offers. `'fixed'` is a split named independently
   * of any ratio, so it rides through untouched either way.
   */
  const setDivisionOrMixedRule = (
    patch: Pick<GameConfig, 'division'> | Pick<GameConfig, 'mixedRule'>,
  ) =>
    setCfg((c) => {
      const next = { ...c, ...patch };
      const wasAvailable = ratioGenderCheckAvailable(c.division, c.mixedRule);
      const nowAvailable = ratioGenderCheckAvailable(next.division, next.mixedRule);
      if (wasAvailable === nowAvailable || c.lines.genderCheck === 'fixed') return next;
      return {
        ...next,
        lines: { ...next.lines, genderCheck: nowAvailable ? 'gameRatio' : 'none' },
      };
    });
  /**
   * Changing the detail always clears the scope: `trackedTeam` is null for both
   * "no roster at all" and "both rosters", so there is nothing to preserve across a
   * switch — the scope dropdown is right underneath, and both teams is the wider,
   * safer landing place. The feature flags below are deliberately left alone: they
   * are visible on the same screen, so silently rewriting them on a mode change is
   * the surprising behaviour, not keeping them.
   */
  const setStatsMode = (mode: GameConfig['statsMode']) => {
    if (mode !== 'none') setStatsDetail(mode);
    setCfg((c) => ({ ...c, statsMode: mode, trackedTeam: null }));
  };
  // The detail the Statistics switch turns back on to: whichever was last picked
  // this visit, Team the first time. Off is `statsMode: 'none'`, so the choice itself
  // is not in the config while the switch is off — this is what remembers it.
  const [statsDetail, setStatsDetail] = useState<'teams' | 'players'>(() =>
    cfg.statsMode === 'players' ? 'players' : 'teams',
  );
  /**
   * `cfg.lines.saved` holds one team's lines, so moving the tracked team has to swap
   * them for that team's — otherwise Ravens' lines would follow the pointer onto
   * Foxes. Read from the store rather than kept per team in cfg: the store is where
   * they live between games anyway, and a team with no entry yet correctly has none.
   */
  const setTrackedTeam = (id: TeamId | null) =>
    setCfg((c) => {
      // Following both teams has no single team's lines to hold, and line tracking
      // is off there anyway (see showLines) — the list is left as it is so picking
      // the team back brings its lines with it.
      if (id === null) return { ...c, trackedTeam: null };
      const name = c.teams[id].name.trim();
      const stored = savedTeams.find((s) => normalizeTeamName(s.name) === normalizeTeamName(name));
      return { ...c, trackedTeam: id, lines: { ...c.lines, saved: stored?.lines ?? [] } };
    });
  const setTeam = (id: TeamId, patch: Partial<GameConfig['teams'][TeamId]>) =>
    setCfg((c) => ({ ...c, teams: { ...c.teams, [id]: { ...c.teams[id], ...patch } } }));
  const selectSavedTeam = (id: TeamId, team: SavedTeam) =>
    setCfg((c) => ({
      ...c,
      teams: { ...c.teams, [id]: { name: team.name, color: team.color } },
      players: { ...c.players, [id]: team.players.map((p) => ({ ...p, id: uid() })) },
      // The lines come with the roster they are made of — but only for the team
      // whose lines are the ones being tracked, since cfg holds a single list.
      ...(c.trackedTeam === id ? { lines: { ...c.lines, saved: team.lines ?? [] } } : {}),
    }));
  // Editing a name keeps the roster: turning a loaded "Ravens" into "Ravens B" is
  // the common way to build a second squad out of the first. Emptying the box is
  // different — the team is gone, and its players (and, for the followed team, its
  // predefined lines) go with it, so whatever is typed next starts from an empty
  // roster rather than inheriting the last team's. The saved "Ravens" is untouched
  // either way — the store is only written by addSavedTeam below and by the roster
  // sync once a game starts.
  const changeTeamName = (id: TeamId, name: string) =>
    setCfg((c) => {
      const teams = { ...c.teams, [id]: { ...c.teams[id], name } };
      if (name.trim() !== '') return { ...c, teams };
      return {
        ...c,
        teams,
        players: { ...c.players, [id]: [] },
        ...(c.trackedTeam === id ? { lines: { ...c.lines, saved: [] } } : {}),
      };
    });
  // "Add <name> as a new team" writes to the saved-teams store there and then,
  // with whatever name, colour and roster the form currently holds, instead of
  // waiting for START_GAME. So a team can be set up (and reused next time) even
  // if this game never gets played.
  const addSavedTeam = (id: TeamId, name: string) => {
    saveTeam({
      name,
      color: cfg.teams[id].color,
      players: cfg.players[id],
      ...(cfg.trackedTeam === id ? { lines: cfg.lines.saved } : {}),
    });
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
  // A marking is a roster edit like any other, so it goes through setPlayers and is
  // written back to the saved team for free — which is the point: a squad's markings
  // are typed once and inherited by every game of the tournament.
  const setGender = (id: TeamId, playerId: string, gender: Gender | null) =>
    setPlayers(
      id,
      cfg.players[id].map((p) => (p.id === playerId ? { ...p, gender: gender ?? undefined } : p)),
    );
  const setLines = (patch: Partial<GameConfig['lines']>) =>
    setCfg((c) => ({ ...c, lines: { ...c.lines, ...patch } }));
  /**
   * Exactly `setPlayers`' bargain, for the same reason: the edit always lands in cfg,
   * and is written through to the store only for a team that is already in it. A team
   * that has never been saved keeps its lines locally until "add as a new team" or the
   * kickoff sync puts it there (see GameContext).
   */
  const setSavedLines = (lines: SavedLine[]) => {
    setLines({ saved: lines });
    const name = linesTeamName.trim();
    if (!isSavedTeamName(name)) return;
    saveTeamLines(name, lines);
    setSavedTeams(loadSavedTeams());
  };

  const teamsReady = cfg.teams.A.name.trim() !== '' && cfg.teams.B.name.trim() !== '';
  const duplicateTeamNames =
    teamsReady && normalizeTeamName(cfg.teams.A.name) === normalizeTeamName(cfg.teams.B.name);
  // A half that is switched off has no score to be out of range.
  const halfScoreValid = !cfg.halfTimeEnabled || cfg.halfScore < cfg.targetScore;
  const startingTimeReady =
    !cfg.startingTime.enabled || startingTimeIsFuture(cfg.startingTime.time);
  const canStart = teamsReady && !duplicateTeamNames && halfScoreValid && startingTimeReady;
  const minutesToStart = cfg.startingTime.enabled
    ? minutesUntil(cfg.startingTime.time, nowMs)
    : null;
  const startsIn =
    minutesToStart === null
      ? null
      : minutesToStart < 60
        ? `${minutesToStart} ${t('unitMin')}`
        : minutesToStart % 60 === 0
          ? `${Math.floor(minutesToStart / 60)} h`
          : `${Math.floor(minutesToStart / 60)} h ${minutesToStart % 60} ${t('unitMin')}`;

  // The folded rule sections' one-line summaries.
  const duration = (seconds: number) => secondsInMinutes(seconds) ?? `${seconds} ${t('unitSec')}`;
  const minutes = (n: number) => `${n} ${t('unitMin')}`;
  const capText = (cap: GameConfig['endCap']) =>
    cap.kind === 'none'
      ? t('sumCapNone')
      : cap.kind === 'cap'
        ? t('endCapPlus', { n: cap.plus })
        : t('sumCapCond', { n: cap.plus, x: cap.minDiff });
  const winSummary = [
    t('sumPoints', { n: cfg.targetScore }),
    minutes(cfg.timeLimitMinutes),
    capText(cfg.endCap),
  ].join(' · ');
  const halfSummary = !cfg.halfTimeEnabled ? (
    t('sumOff')
  ) : !halfScoreValid ? (
    <span className="text-signal">{t('halfScoreInvalid')}</span>
  ) : (
    [
      t('sumAt', { n: cfg.halfScore }),
      minutes(cfg.halfTimeLimitMinutes),
      cfg.halfTimeBreakSeconds === 0
        ? t('sumNoBreak')
        : t('sumBreak', { d: duration(cfg.halfTimeBreakSeconds) }),
      ...(cfg.halfCap.kind === 'cap' ? [t('endCapPlus', { n: cfg.halfCap.plus })] : []),
    ].join(' · ')
  );
  const timeoutsPerHalf = cfg.halfTimeEnabled && cfg.timeouts.perGame === null;
  const timeoutsSummary = !cfg.timeouts.enabled
    ? t('sumOff')
    : [
        `${cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0} ${t(
          timeoutsPerHalf ? 'timeoutsScopeHalf' : 'timeoutsScopeGame',
        ).toLowerCase()}`,
        duration(cfg.timeouts.durationSeconds),
      ].join(' · ');
  const waterSummary = [
    cfg.waterBreaks.enabled
      ? t('sumAt', { n: cfg.waterBreaks.atScores.join(', ') })
      : t('sumAutoOff'),
    duration(cfg.waterBreaks.durationSeconds),
  ].join(' · ');

  // The Start bar: the headline rules, or the first thing holding the start up and a
  // way to it. The full wording of each problem sits at its field; the bar names it.
  const startSummary = [
    t(DIVISION_LABEL[cfg.division]),
    t('sumPoints', { n: cfg.targetScore }),
    minutes(cfg.timeLimitMinutes),
  ].join(' · ');
  const goTo = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
    );
  const startProblem = !teamsReady
    ? { text: t('teamsRequired'), go: () => goTo('setup-match') }
    : duplicateTeamNames || !startingTimeReady
      ? { text: t('startFix', { section: t('matchTitle') }), go: () => goTo('setup-match') }
      : !halfScoreValid
        ? {
            text: t('startFix', { section: t('halfTimeTitle') }),
            go: () => {
              setOpenRules((o) => ({ ...o, half: true }));
              goTo('setup-half');
            },
          }
        : null;

  const statsModeHintKey =
    cfg.statsMode === 'players' ? 'statsModePlayersHint' : 'statsModeTeamsHint';
  // The two teams as segments, by name (or "Team 1/2" before they have one) — how
  // the coin toss and "Players of" are answered. Drawn like every other choice on
  // the screen: the team colours stay in the Teams card.
  const teamOptions: (SegmentOption<TeamId> & { label: string })[] = (['A', 'B'] as TeamId[]).map(
    (id) => ({
      value: id,
      label: cfg.teams[id].name.trim() || t(id === 'A' ? 'teamA' : 'teamB'),
    }),
  );
  const rosters = rosterTeams(cfg);
  /** "14 players · 6 FMP / 8 MMP" — the split only once anyone is marked. */
  const rosterSummary = (players: PlayerInfo[]) => {
    if (players.length === 0) return t('rosterEmpty');
    const count =
      players.length === 1 ? t('rosterCountOne') : t('rosterCount', { n: players.length });
    const female = players.filter((p) => p.gender === 'female').length;
    const male = players.filter((p) => p.gender === 'male').length;
    return female + male === 0 ? count : `${count} · ${t('rosterSplit', { female, male })}`;
  };
  const showRoster = rosters.length > 0;
  // Line tracking follows a single roster, so the section only exists where one team
  // is followed — see lineTrackingEnabled, which is the same rule at runtime.
  const showLines = cfg.statsMode === 'players' && cfg.trackedTeam !== null;
  const linesTeamName = showLines
    ? cfg.teams[cfg.trackedTeam!].name.trim() || t(cfg.trackedTeam === 'A' ? 'teamA' : 'teamB')
    : '';
  // The predefined lines belong to the saved team, so they are read from the store
  // rather than from cfg: renaming the team in the form must not appear to move them.
  const genderCheckHintKey = {
    none: 'lineGenderCheckNoneHint',
    gameRatio: 'lineGenderCheckRatioHint',
    fixed: 'lineGenderCheckFixedHint',
  }[cfg.lines.genderCheck] as
    'lineGenderCheckNoneHint' | 'lineGenderCheckRatioHint' | 'lineGenderCheckFixedHint';
  // The ratio hint spells the split out, so it needs the numbers the rule comes to.
  const genderCheckVars =
    cfg.lines.genderCheck === 'gameRatio'
      ? {
          size: cfg.lineSize,
          female: Math.ceil(cfg.lineSize / 2),
          male: cfg.lineSize - Math.ceil(cfg.lineSize / 2),
        }
      : undefined;

  return (
    <div className="min-h-dvh bg-pitch text-chalk px-4 pt-4 max-w-2xl mx-auto space-y-4">
      {/* The language picker sits back beside the menu button now that the guide
          chip is gone. It had been moved to a full-width row of its own precisely
          because that chip needed the room — with one control left there is no row
          to justify, and an all-but-empty one under the title read as a gap. */}
      <header className="flex items-start justify-between gap-2 pt-2">
        {/* The wordmark: the logo beside the name set in two capitalised lines —
            `w-min` puts each word on its own line whatever the language. */}
        <h1 className="flex items-center gap-3 font-board text-xl font-bold uppercase tracking-wide leading-[0.95]">
          <AppLogo />
          <span className="w-min">{t('appTitle')}</span>
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* The ⓘ that used to sit here opened one dialog and said so; the menu it
              became holds that dialog plus the things the setup screen had no door
              to — the archive of past games, and both guides. Same control, same
              corner, as the game screen's menu. */}
          <button
            type="button"
            className="rounded-md bg-panel border border-line w-8 h-8 text-chalk/70 flex items-center justify-center"
            aria-label={t('menuTitle')}
            onClick={() => setShowMenu(true)}
          >
            <MenuIcon size="w-5 h-5" />
          </button>
        </div>
      </header>

      <AppMenu open={showMenu} onClose={() => setShowMenu(false)} newGame={false} />

      {/* First, because what follows depends on it: the coin toss asks the ratio
          only for mixed with ABBA, and the template sets the rules below. */}
      <Section
        title={t('setupTitle')}
        icon={<SetupIcon size="w-4 h-4" />}
        action={
          <button
            type="button"
            className="-my-1 shrink-0 h-8 rounded-md px-2 text-xs border border-line text-accent font-board font-semibold flex items-center gap-1 active:bg-pitch"
            onClick={() => setShowSaveTemplate(true)}
          >
            <PlusIcon size="w-3.5 h-3.5" />
            {t('saveAsTemplateBtn')}
          </button>
        }
      >
        {/* Templates as chips: the built-in two, then the saved ones (saving another is
            the heading's corner button). Picking one rewrites the rules below. */}
        <div>
          <span id="template-label" className={fieldLabel}>
            {t('templateSelectLabel')}
          </span>
          <div role="radiogroup" aria-labelledby="template-label" className="flex flex-wrap gap-2">
            {[
              { key: 'predefined:grass', name: t('templateGrassName') },
              { key: 'predefined:beach', name: t('templateBeachName') },
              ...savedTemplates.map((template) => ({
                key: `custom:${template.name}`,
                name: template.name,
              })),
            ].map(({ key, name }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selectedTemplateKey === key}
                data-value={key}
                className={`${pillClass(selectedTemplateKey === key)} h-9 font-board font-semibold`}
                onClick={() => applyTemplateChoice(key)}
              >
                {name}
              </button>
            ))}
          </div>
          {selectedCustomName && (
            <button
              type="button"
              className="pt-2 text-xs text-chalk/50 underline"
              onClick={() => setPendingDeleteTemplate(selectedCustomName)}
            >
              {t('btnDeleteTemplate')}
            </button>
          )}
        </div>

        <Segmented
          label={t('division')}
          value={cfg.division}
          options={[
            { value: 'open', label: t('divisionOpen') },
            { value: 'women', label: t('divisionWomen') },
            { value: 'mixed', label: t('divisionMixed') },
          ]}
          onChange={(division) => setDivisionOrMixedRule({ division })}
        />

        {/* What matters about the mixed ratio is only whether the app calls it: ABBA
            (stored as mixedRule 'A') is announced point by point; off ('B') leaves
            it to the teams, however they settle it. */}
        {cfg.division === 'mixed' && (
          <CheckField
            variant="switch"
            label={t('ratioAbbaLabel')}
            hint={t(cfg.mixedRule === 'A' ? 'ratioAbbaOnHint' : 'ratioAbbaOffHint')}
            checked={cfg.mixedRule === 'A'}
            onChange={(on) => setDivisionOrMixedRule({ mixedRule: on ? 'A' : 'B' })}
          />
        )}
      </Section>

      {/* The matchup first: the one thing set every game, laid out like the
          scoreboard it is about to become — each team's colour as a large tile,
          the name beside it in board type, "vs" between them — then where and when. */}
      <Section id="setup-match" title={t('matchTitle')} icon={<ShirtIcon size="w-4 h-4" />}>
        {(['A', 'B'] as TeamId[]).map((id) => (
          <div key={id}>
            {id === 'B' && (
              <div
                aria-hidden="true"
                className="flex items-center gap-3 pb-3 font-board text-xs font-bold tracking-widest text-chalk/40"
              >
                <span className="h-px flex-1 bg-line" />
                VS
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <div className="flex items-end gap-3">
              <TeamColorPicker
                label={`${t('teamColor')} — ${cfg.teams[id].name}`}
                color={cfg.teams[id].color}
                onChange={(color) => setTeam(id, { color })}
                className="shrink-0 h-14 w-14 rounded-lg border border-line flex items-center justify-center"
              />
              <div className="flex-1 min-w-0">
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
                  inputClassName="w-full h-14 rounded-md bg-panel border border-line px-3 font-board text-xl font-bold tracking-wide text-chalk placeholder:text-chalk/30 focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            {/* The roster lives with its team: always editable, whatever the
                statistics are set to, in a sheet so a squad of twenty doesn't push
                the rest of the page down. Indented to sit under the name, and only
                once there is a team — typed or picked — for it to belong to. */}
            {cfg.teams[id].name.trim() !== '' && (
              <button
                type="button"
                data-roster-team={id}
                className="ml-[4.25rem] mt-1.5 flex max-w-[calc(100%-4.25rem)] items-center gap-2 py-1 text-left active:opacity-70"
                onClick={() => setRosterTeam(id)}
              >
                <span className="shrink-0 text-accent">
                  <PlayersIcon size="w-4 h-4" />
                </span>
                {/* Two lines, so a full squad's count and split never get cut off. */}
                <span className="min-w-0 flex flex-col leading-tight">
                  <span className="font-board text-sm font-semibold text-accent">
                    {t('playersTitle')}
                  </span>
                  <span className="truncate text-xs text-chalk/60">
                    {rosterSummary(cfg.players[id])}
                  </span>
                </span>
                <span className="shrink-0 text-chalk/40">
                  <ChevronRightIcon size="w-3.5 h-3.5" />
                </span>
              </button>
            )}
          </div>
        ))}
        {duplicateTeamNames && <p className={errorText}>{t('duplicateTeamNames')}</p>}
        <div className="border-t border-line pt-3 space-y-3">
          <div>
            <label className={fieldLabel}>{t('fieldNumber')}</label>
            <input
              className={inputClass}
              maxLength={20}
              value={cfg.fieldNumber}
              onChange={(e) => set('fieldNumber', e.target.value)}
            />
          </div>

          <CheckField
            variant="switch"
            label={t('startingTimeEnabled')}
            checked={cfg.startingTime.enabled}
            onChange={(v) => set('startingTime', { ...cfg.startingTime, enabled: v })}
          />
          {cfg.startingTime.enabled && (
            <div>
              <label className={fieldLabel}>{t('startingTimeLabel')}</label>
              <input
                type="time"
                className={inputClass}
                value={cfg.startingTime.time}
                onChange={(e) => set('startingTime', { ...cfg.startingTime, time: e.target.value })}
              />
              {!startingTimeReady && <p className={errorText}>{t('startingTimeInPast')}</p>}
              {/* How far away it is, so 14:00 typed for 16:00 is caught here rather
                than when the countdown looks odd. */}
              {startsIn !== null && <p className={hintText}>{t('startsIn', { d: startsIn })}</p>}
            </div>
          )}
        </div>
      </Section>

      {/* After the teams, which it asks about, and after Game setup, since its ratio
          question depends on the division and ABBA. Answered with the captains in
          front of you, so the choices are the teams by name. */}
      <Section title={t('coinToss')} icon={<CoinIcon size="w-4 h-4" />}>
        <p className={hintText}>{t('coinTossHelp')}</p>
        <Segmented
          label={t('startingOffense')}
          value={cfg.startingOffense}
          options={teamOptions}
          onChange={(v) => set('startingOffense', v)}
        />
        <Segmented
          label={t('startingSide')}
          value={cfg.startingSide}
          options={teamOptions}
          onChange={(v) => set('startingSide', v)}
        />
        {cfg.division === 'mixed' && cfg.mixedRule === 'A' && (
          <Segmented
            label={t('startingRatio')}
            value={cfg.startingRatio}
            options={[
              { value: 'female', label: t('ratioFemale') },
              { value: 'male', label: t('ratioMale') },
            ]}
            onChange={(v) => set('startingRatio', v)}
          />
        )}
      </Section>

      <Section
        title={t('winConditions')}
        icon={<FlagIcon size="w-4 h-4" />}
        fold={foldFor('win', t('winConditions'))}
        summary={winSummary}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('targetScore')}</label>
            {numberField('targetScore', t('targetScore'), cfg.targetScore, 1, 99, (targetScore) =>
              set('targetScore', targetScore),
            )}
          </div>
          <div>
            <label className={fieldLabel}>{t('fieldTime')}</label>
            {numberField(
              'timeLimit',
              t('fieldTime'),
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
              { step: 5, unit: t('unitMin') },
            )}
          </div>
        </div>
        <Segmented
          label={t('endCapLabel')}
          equal={false}
          value={cfg.endCap.kind === 'cap' ? (`cap${cfg.endCap.plus}` as const) : cfg.endCap.kind}
          options={[
            { value: 'none', label: t('endCapNoneShort') },
            { value: 'cap1', label: '+1' },
            { value: 'cap2', label: '+2' },
            { value: 'conditional', label: t('endCapCondShort') },
          ]}
          onChange={(v) => {
            if (v === 'none') set('endCap', { kind: 'none' });
            else if (v === 'cap1') set('endCap', { kind: 'cap', plus: 1 });
            else if (v === 'cap2') set('endCap', { kind: 'cap', plus: 2 });
            else set('endCap', { kind: 'conditional', plus: 1, minDiff: 2 });
          }}
          hint={
            cfg.endCap.kind === 'none'
              ? t('endCapNone')
              : cfg.endCap.kind === 'conditional'
                ? t('endCapCond', { n: cfg.endCap.plus, x: cfg.endCap.minDiff })
                : undefined
          }
        />
        {cfg.endCap.kind === 'conditional' && (
          <div className="grid grid-cols-2 gap-3">
            <Segmented
              label="CAP +"
              value={String(cfg.endCap.plus) as '1' | '2'}
              options={[
                { value: '1', label: '+1' },
                { value: '2', label: '+2' },
              ]}
              onChange={(v) =>
                set('endCap', {
                  kind: 'conditional',
                  plus: Number(v) as 1 | 2,
                  minDiff: cfg.endCap.kind === 'conditional' ? cfg.endCap.minDiff : 2,
                })
              }
            />
            <Segmented
              label={t('capDiff')}
              value={String(cfg.endCap.minDiff) as '1' | '2' | '3'}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
              onChange={(v) =>
                set('endCap', {
                  kind: 'conditional',
                  plus: cfg.endCap.kind === 'conditional' ? cfg.endCap.plus : 1,
                  minDiff: Number(v) as 1 | 2 | 3,
                })
              }
            />
          </div>
        )}
      </Section>

      <Section
        id="setup-half"
        title={t('halfTimeTitle')}
        icon={<HalfIcon size="w-4 h-4" />}
        fold={foldFor('half', t('halfTimeTitle'))}
        summary={halfSummary}
        enabled={{
          checked: cfg.halfTimeEnabled,
          onChange: (v) => set('halfTimeEnabled', v),
          label: t('halfTimeEnabled'),
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('halfScore')}</label>
            {numberField('halfScore', t('halfScore'), cfg.halfScore, 1, 99, (halfScore) =>
              set('halfScore', halfScore),
            )}
          </div>
          <div>
            <label className={fieldLabel}>{t('fieldTime')}</label>
            {numberField(
              'halfTimeLimit',
              t('fieldTime'),
              cfg.halfTimeLimitMinutes,
              1,
              cfg.timeLimitMinutes,
              (halfTimeLimitMinutes) => set('halfTimeLimitMinutes', halfTimeLimitMinutes),
              { step: 5, unit: t('unitMin') },
            )}
          </div>
          <div className="relative">
            <label className={fieldLabel}>{t('fieldBreak')}</label>
            {numberField(
              'halfTimeBreak',
              t('fieldBreak'),
              cfg.halfTimeBreakSeconds,
              // 0 is a legal setting, not a slip: the Beach template ships with
              // no half-time break at all.
              0,
              1800,
              (halfTimeBreakSeconds) => set('halfTimeBreakSeconds', halfTimeBreakSeconds),
              { step: 30, unit: t('unitSec'), note: secondsInMinutes(cfg.halfTimeBreakSeconds) },
            )}
          </div>
        </div>
        {!halfScoreValid && <p className={errorText}>{t('halfScoreInvalid')}</p>}
        <CheckField
          variant="switch"
          label={t('halfCapPlus')}
          checked={cfg.halfCap.kind === 'cap'}
          onChange={(v) => set('halfCap', v ? { kind: 'cap', plus: 1 } : { kind: 'none' })}
        />
      </Section>

      <Section
        title={t('timeoutsTitle')}
        icon={<TimeoutIcon size="w-4 h-4" />}
        fold={foldFor('timeouts', t('timeoutsTitle'))}
        summary={timeoutsSummary}
        enabled={{
          checked: cfg.timeouts.enabled,
          onChange: (v) => set('timeouts', { ...cfg.timeouts, enabled: v }),
          label: t('timeoutsEnabled'),
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('timeoutsCount')}</label>
            {numberField(
              'timeoutsCount',
              t('timeoutsCount'),
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
          </div>
          {/* With no half-time there is no second half to budget for, so per half and
              per game are the same allowance and the choice is hidden. What was
              picked is kept, and comes back with half-time. */}
          {cfg.halfTimeEnabled && (
            <div className="col-span-2 order-last">
              <Segmented
                label={t('timeoutsScope')}
                value={cfg.timeouts.perGame === null ? 'half' : 'game'}
                options={[
                  { value: 'half', label: t('timeoutsScopeHalf') },
                  { value: 'game', label: t('timeoutsScopeGame') },
                ]}
                onChange={(v) => {
                  const count = cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0;
                  const perHalf = v === 'half';
                  set('timeouts', {
                    ...cfg.timeouts,
                    perHalf: perHalf ? count : null,
                    perGame: perHalf ? null : count,
                  });
                }}
              />
            </div>
          )}
          <div className="relative">
            <label className={fieldLabel}>{t('fieldDuration')}</label>
            {numberField(
              'timeoutDuration',
              t('fieldDuration'),
              cfg.timeouts.durationSeconds,
              15,
              300,
              (durationSeconds) => set('timeouts', { ...cfg.timeouts, durationSeconds }),
              {
                step: 15,
                unit: t('unitSec'),
                note: secondsInMinutes(cfg.timeouts.durationSeconds),
              },
            )}
          </div>
          {/* Both full-width rows sit after the two numbers; order-last keeps the
              allowance (earlier in the markup, beside the count it qualifies)
              ahead of this switch. */}
          <div className="col-span-2 order-last">
            <CheckField
              variant="switch"
              label={t('timeoutLastFive')}
              // Worded as a permission, so the switch is the stored flag inverted.
              checked={!cfg.timeouts.disallowLastFiveMinutes}
              onChange={(v) => set('timeouts', { ...cfg.timeouts, disallowLastFiveMinutes: !v })}
            />
          </div>
        </div>
      </Section>

      {/* Hot-weather hydration breaks (WFDF Appendix B4.3). Folded like the other
          rules — most games never run the protocol — and the checkbox governs only the
          automatic ones: a break can always be called by hand from the game screen's
          raised-hand button, which is why the duration stays editable either way. */}
      <Section
        title={t('waterBreakTitle')}
        icon={<DropIcon size="w-4 h-4" />}
        fold={foldFor('water', t('waterBreakTitle'))}
        summary={waterSummary}
      >
        <p className={hintText}>{t('waterBreakHelp')}</p>
        <CheckField
          variant="switch"
          label={t('waterBreakEnabled')}
          checked={cfg.waterBreaks.enabled}
          onChange={(v) => set('waterBreaks', { ...cfg.waterBreaks, enabled: v })}
        />
        {/* Bottom-aligned: the scores label runs to two lines (three in some
            languages), and the two boxes should still sit level. */}
        <div className="grid grid-cols-2 gap-3 items-end">
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
          <div className="relative">
            <label className={fieldLabel} htmlFor="water-break-duration">
              {t('fieldDuration')}
            </label>
            {numberField(
              'waterBreakDuration',
              t('fieldDuration'),
              cfg.waterBreaks.durationSeconds,
              15,
              900,
              (durationSeconds) => set('waterBreaks', { ...cfg.waterBreaks, durationSeconds }),
              {
                step: 15,
                unit: t('unitSec'),
                id: 'water-break-duration',
                note: secondsInMinutes(cfg.waterBreaks.durationSeconds),
              },
            )}
          </div>
        </div>
      </Section>

      {/* What this game records on top of the score. Last, because nothing above
          depends on it — the rosters live with their teams. */}
      {/* Off by default, like a section that can be switched off: off is the plain
          score-only game (statsMode 'none'), and the choice below is then only how
          much detail — a team, or a named player. */}
      <Section
        title={t('statsTitle')}
        icon={<StatsIcon size="w-4 h-4" />}
        enabled={{
          checked: cfg.statsMode !== 'none',
          onChange: (on) => setStatsMode(on ? statsDetail : 'none'),
          label: t('statsEnabled'),
        }}
      >
        <Segmented
          label={t('statsModeLabel')}
          value={cfg.statsMode === 'players' ? 'players' : 'teams'}
          options={[
            { value: 'teams', label: t('statsModeTeams') },
            { value: 'players', label: t('statsModePlayers') },
          ]}
          onChange={setStatsMode}
          hint={t(statsModeHintKey)}
        />
        {/* Which rosters, once there are players to name. "Both teams" is the value
            `trackedTeam: null` carries here — the same null that means "no roster at
            all" in the other modes, which is why nothing tries to remember it. */}
        {/* A dropdown, not segments: two team names and "Both teams" side by side
            would cut long names off. */}
        {cfg.statsMode === 'players' && (
          <div>
            <label className={fieldLabel}>{t('trackedTeamLabel')}</label>
            <select
              className={inputClass}
              value={cfg.trackedTeam ?? 'both'}
              onChange={(e) =>
                setTrackedTeam(e.target.value === 'both' ? null : (e.target.value as TeamId))
              }
            >
              {teamOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="both">{t('trackedTeamBoth')}</option>
            </select>
          </div>
        )}
        {/* A followed roster that is still empty gets a quiet suggestion, not a
            warning: players can just as well be added once the game is underway. */}
        {rosters
          .filter((id) => cfg.teams[id].name.trim() !== '' && cfg.players[id].length === 0)
          .map((id) => (
            <p key={id} className={hintText}>
              {t('rosterMissingNudge', { team: teamOptions.find((o) => o.value === id)!.label })}
            </p>
          ))}
        {/* What this game records, on top of the detail above. Each is opt-in for the
            same reason line tracking is: the volunteer who wants goals and assists for
            a tournament has no use for the most frequent button on the action row, and
            the coach tracking lines may not want a dialog after every goal. Nothing is
            offered where the detail above has no answer for it. */}
        {statsTrackingEnabled(cfg) && (
          <CheckField
            variant="switch"
            label={t('trackTurnoversLabel')}
            hint={t('trackTurnoversHint')}
            checked={cfg.trackTurnovers}
            onChange={(v) => set('trackTurnovers', v)}
          />
        )}
        {/* Nested under Turnovers, and only where there is a roster to ask against:
            without one the tap has nobody to attribute the disc to. */}
        {showRoster && cfg.trackTurnovers && (
          <div className="pl-6">
            <CheckField
              variant="switch"
              label={t('trackTurnoverPlayersLabel')}
              hint={t('trackTurnoverPlayersHint')}
              checked={cfg.trackTurnoverPlayers}
              onChange={(v) => set('trackTurnoverPlayers', v)}
            />
          </div>
        )}
        {/* Also nested under Turnovers, but for a different reason than the switch
            above: not because there is nobody to ask — passes never ask — but
            because a pass is credited to whoever holds the disc, and possession only
            changes hands when the Turn button exists (see passesTracked). It needs
            no roster, so it is offered from team detail up, unlike its neighbour. */}
        {statsTrackingEnabled(cfg) && cfg.trackTurnovers && (
          <div className="pl-6">
            <CheckField
              variant="switch"
              label={t('trackPassesLabel')}
              hint={t('trackPassesHint')}
              checked={cfg.trackPasses}
              onChange={(v) => set('trackPasses', v)}
            />
          </div>
        )}
        {showRoster && (
          <CheckField
            variant="switch"
            label={t('trackGoalPlayersLabel')}
            hint={t('trackGoalPlayersHint')}
            checked={cfg.trackGoalPlayers}
            onChange={(v) => set('trackGoalPlayers', v)}
          />
        )}
        {/* Line tracking sits here rather than in a section of its own: it is another
            thing this game tracks, and it is narrower than showRoster on purpose —
            it follows a single roster, so "Both teams" never offers it (see
            lineTrackingEnabled). It names no team; changing the followed team above
            moves it. */}
        {showLines && (
          <>
            <CheckField
              variant="switch"
              label={t('linesEnabledLabel')}
              hint={t('linesEnabledHint')}
              checked={cfg.lines.enabled}
              onChange={(v) => setLines({ enabled: v })}
            />

            {cfg.lines.enabled && (
              <>
                <div>
                  <label className={fieldLabel}>{t('lineSizeLabel')}</label>
                  {numberField('lineSize', t('lineSizeLabel'), cfg.lineSize, 1, 15, (n) =>
                    set('lineSize', n),
                  )}
                </div>

                <div>
                  <label className={fieldLabel}>{t('lineGenderCheckLabel')}</label>
                  <select
                    className={inputClass}
                    value={cfg.lines.genderCheck}
                    onChange={(e) => setLines({ genderCheck: e.target.value as LineGenderCheck })}
                  >
                    <option value="none">{t('lineGenderCheckNone')}</option>
                    {/* Without ABBA no ratio is computed and the other divisions have none,
                    so there would be nothing for a line to be checked against. */}
                    {ratioGenderCheckAvailable(cfg.division, cfg.mixedRule) && (
                      <option value="gameRatio">{t('lineGenderCheckRatio')}</option>
                    )}
                    <option value="fixed">{t('lineGenderCheckFixed')}</option>
                  </select>
                  <p className={hintText}>{t(genderCheckHintKey, genderCheckVars)}</p>
                </div>

                {cfg.lines.genderCheck === 'fixed' && (
                  <div>
                    <label className={fieldLabel}>{t('lineFixedFemaleLabel')}</label>
                    {numberField(
                      'lines.fixedFemale',
                      t('lineFixedFemaleLabel'),
                      cfg.lines.fixedFemale,
                      0,
                      cfg.lineSize,
                      (n) => setLines({ fixedFemale: n }),
                    )}
                    <p className={hintText}>
                      {t('lineFixedSplit', {
                        female: cfg.lines.fixedFemale,
                        male: cfg.lineSize - cfg.lines.fixedFemale,
                      })}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Section>

      {/* Start, always within reach: the matchup and the headline rules, and while
          something blocks the start, what it is — a tap takes you there. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-pitch/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-board text-sm font-bold uppercase">
              {teamOptions[0].label} <span className="text-chalk/40">vs</span>{' '}
              {teamOptions[1].label}
            </p>
            {startProblem ? (
              <button
                type="button"
                className="flex max-w-full items-center gap-1 text-left text-xs text-signal"
                onClick={startProblem.go}
              >
                <span className="truncate">{startProblem.text}</span>
                <span className="shrink-0">
                  <ChevronRightIcon size="w-3 h-3" />
                </span>
              </button>
            ) : (
              <p className="truncate text-xs text-chalk/60">{startSummary}</p>
            )}
          </div>
          <button
            className="shrink-0 rounded-lg bg-accent px-5 py-3 font-board text-base font-bold text-panel active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
            disabled={!canStart}
            onClick={() => dispatch({ type: 'START_GAME', config: cfg })}
          >
            {t('startGame')}
          </button>
        </div>
      </div>

      {showSaveTemplate && (
        <SaveTemplateDialog
          savedNames={savedTemplates.map((template) => template.name)}
          currentName={selectedCustomName}
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
      {rosterTeam && cfg.teams[rosterTeam].name.trim() !== '' && (
        <TeamRosterDialog
          // Keyed by team, so a half-typed player never carries over to the other roster.
          key={rosterTeam}
          team={teamOptions.find((o) => o.value === rosterTeam)!.label}
          players={cfg.players[rosterTeam]}
          onAdd={(number, name) => addPlayer(rosterTeam, number, name)}
          onRemove={(id) => removePlayer(rosterTeam, id)}
          onSetGender={(id, gender) => setGender(rosterTeam, id, gender)}
          onImport={() => setImportingTeam(rosterTeam)}
          usedByGame={rosters.includes(rosterTeam)}
          onSaveTeam={
            cfg.teams[rosterTeam].name.trim() !== '' && !isSavedTeamName(cfg.teams[rosterTeam].name)
              ? () => addSavedTeam(rosterTeam, cfg.teams[rosterTeam].name.trim())
              : undefined
          }
          lines={
            // Lines are made of this roster, so they are edited beside it — for the
            // team whose lines this game tracks.
            showLines && cfg.lines.enabled && cfg.trackedTeam === rosterTeam ? (
              <SavedLinesEditor
                players={cfg.players[rosterTeam]}
                lines={cfg.lines.saved}
                onChange={setSavedLines}
              />
            ) : undefined
          }
          onClose={() => setRosterTeam(null)}
        />
      )}
      {importingTeam && (
        <RosterImportDialog
          teamLabel={
            cfg.teams[importingTeam].name.trim() || t(importingTeam === 'A' ? 'teamA' : 'teamB')
          }
          existing={cfg.players[importingTeam]}
          // Through setPlayers, so an import into a saved team updates the saved
          // roster too — same as adding a player by hand.
          onApply={(players) => setPlayers(importingTeam, players)}
          onClose={() => setImportingTeam(null)}
        />
      )}
    </div>
  );
}
