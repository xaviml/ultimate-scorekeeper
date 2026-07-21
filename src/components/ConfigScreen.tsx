import { useState } from 'react';
import { useT, type Lang } from '../i18n/useT';
import { defaultConfig } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { deleteTeam, loadSavedTeams } from '../state/rosterStorage';
import type { GameConfig, SavedTeam, TeamId } from '../state/types';
import { AboutDialog } from './AboutDialog';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { TeamColorPicker } from './TeamColorPicker';
import { TeamNameCombobox } from './TeamNameCombobox';
import { uid } from '../state/uid';
import { fieldLabel, inputClass, sectionTitle } from './ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-panel border border-line p-4 space-y-3">
      <h2 className={sectionTitle}>{title}</h2>
      {children}
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
  const [cfg, setCfg] = useState<GameConfig>(() =>
    state.config === defaultConfig
      ? {
          ...defaultConfig,
          teams: {
            A: { ...defaultConfig.teams.A, name: '' },
            B: { ...defaultConfig.teams.B, name: '' },
          },
        }
      : state.config,
  );
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [showAbout, setShowAbout] = useState(false);
  const removeSavedTeam = (name: string) => {
    deleteTeam(name);
    setSavedTeams((prev) => prev.filter((t) => t.name !== name));
  };

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

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const teamsReady = cfg.teams.A.name.trim() !== '' && cfg.teams.B.name.trim() !== '';

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
                onChangeText={(name) => setTeam(id, { name })}
                onSelectTeam={(team) => selectSavedTeam(id, team)}
                onDeleteTeam={removeSavedTeam}
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
              onChange={(e) => set('targetScore', num(e.target.value, cfg.targetScore))}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('timeLimit')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={cfg.timeLimitMinutes}
              onChange={(e) => set('timeLimitMinutes', num(e.target.value, cfg.timeLimitMinutes))}
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
              onChange={(e) => set('halfScore', num(e.target.value, cfg.halfScore))}
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('halfTimeLimit')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={cfg.halfTimeLimitMinutes}
              onChange={(e) =>
                set('halfTimeLimitMinutes', num(e.target.value, cfg.halfTimeLimitMinutes))
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
                set('halfTimeBreakSeconds', num(e.target.value, cfg.halfTimeBreakSeconds))
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

      <Section title={t('playersTitle')}>
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
            <label className={fieldLabel}>{t('timeoutsPerHalf')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              disabled={!cfg.timeouts.enabled}
              value={cfg.timeouts.perHalf ?? ''}
              placeholder="—"
              onChange={(e) =>
                set('timeouts', {
                  ...cfg.timeouts,
                  perHalf: e.target.value === '' ? null : num(e.target.value, 0),
                })
              }
            />
          </div>
          <div>
            <label className={fieldLabel}>{t('timeoutsPerGame')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              disabled={!cfg.timeouts.enabled}
              value={cfg.timeouts.perGame ?? ''}
              placeholder="—"
              onChange={(e) =>
                set('timeouts', {
                  ...cfg.timeouts,
                  perGame: e.target.value === '' ? null : num(e.target.value, 0),
                })
              }
            />
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
                  durationSeconds: num(e.target.value, cfg.timeouts.durationSeconds),
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
        className="w-full rounded-xl bg-signal text-pitch font-board font-bold text-lg py-4 active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
        disabled={!teamsReady}
        onClick={() => dispatch({ type: 'START_GAME', config: cfg })}
      >
        {t('startGame')}
      </button>
      {!teamsReady && <p className="text-sm text-chalk/60 text-center">{t('teamsRequired')}</p>}
    </div>
  );
}
