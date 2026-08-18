import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import GameScreen from '../components/GameScreen';
import { createInitialState } from '../state/gameReducer';
import type { GameState, LogEntry, PlayerInfo, PointRecord } from '../state/types';
import { tap } from './gestures';

/**
 * With a line registered, every "which player?" question narrows to the players who
 * were actually on the field for the point it is about — and an injury goes on to ask
 * who replaces them, from the bench.
 */
const roster: PlayerInfo[] = [
  { id: 'p1', number: '1', name: 'On1', gender: 'female' },
  { id: 'p2', number: '2', name: 'On2', gender: 'male' },
  { id: 'p3', number: '3', name: 'Bench3', gender: 'female' },
  { id: 'p4', number: '4', name: 'Bench4', gender: 'male' },
];

function lineGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'A';
  state.offenseTeam = 'A';
  state.pullingTeam = 'B';
  state.config = {
    ...state.config,
    statsMode: 'team',
    trackedTeam: 'A',
    lineSize: 2,
    trackTurnoverPlayers: true,
    lines: { enabled: true, genderCheck: 'none', fixedFemale: 1, saved: [] },
    players: { A: roster, B: [] },
  };
  state.line = ['p1', 'p2'];
  state.pointLine = [{ playerId: 'p1' }, { playerId: 'p2' }];
  return { ...state, ...overrides };
}

function mount(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

const stored = () =>
  JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!) as GameState;
const dialog = () => document.querySelector('div.fixed') as HTMLElement;
/** Every player chip the open dialog offers, by name. */
const offered = () =>
  [...dialog().querySelectorAll('button')]
    .map((b) => b.textContent ?? '')
    .filter((txt) => /^#\d/.test(txt))
    .map((txt) => txt.replace(/\s*(MMP|FMP)\s*$/, '').trim());

beforeEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

describe('the turnover pickers', () => {
  it('offer only the players on this point', () => {
    mount(lineGame());
    tap(screen.getByRole('button', { name: /turnover — hold to undo/i }));
    expect(offered()).toEqual(['#1 On1', '#2 On2']);
    expect(screen.getByText(/only the players registered on this point/i)).toBeTruthy();
  });

  // Only whoever is out there now can lose the disc, so a player a substitution has
  // taken off is out of the point and out of the picker — even though the record keeps
  // them, because they did play part of it.
  it('drop a player who has been substituted off', () => {
    mount(
      lineGame({
        line: ['p2', 'p3'],
        pointLine: [
          { playerId: 'p1', off: true },
          { playerId: 'p2' },
          { playerId: 'p3', sub: true },
        ],
      }),
    );
    tap(screen.getByRole('button', { name: /turnover — hold to undo/i }));
    expect(offered()).toEqual(['#2 On2', '#3 Bench3']);
  });

  // The volunteer who skipped the line still has to be able to attribute anything.
  it('offer the whole roster when no line was registered', () => {
    mount(lineGame({ line: [], pointLine: [] }));
    tap(screen.getByRole('button', { name: /turnover — hold to undo/i }));
    expect(offered()).toEqual(['#1 On1', '#2 On2', '#3 Bench3', '#4 Bench4']);
    expect(screen.queryByText(/only the players registered/i)).toBeNull();
  });
});

describe('the scorer and assist pickers', () => {
  const goal = (): LogEntry => ({
    id: 1,
    wallClock: '10:00:00',
    atMs: 0,
    gameSeconds: 30,
    type: 'goal',
    team: 'A',
  });
  const point = (line: PointRecord['line']): PointRecord => ({
    scoredBy: 'A',
    offense: 'A',
    isBreak: false,
    durationSeconds: 30,
    half: 1,
    turnovers: 0,
    line,
  });

  /**
   * A goal has been scored, so GOAL has already moved the live line on to the next
   * point — which is exactly why the dialog reads the finished point's own line.
   */
  function afterGoal(line: PointRecord['line'], next: string[] = ['p3', 'p4']): GameState {
    return lineGame({
      status: 'awaitingPull',
      scores: { A: 1, B: 0 },
      points: [point(line)],
      log: [goal()],
      line: next,
      pointLine: next.map((playerId) => ({ playerId })),
    });
  }

  it('offer the players from the point that was scored, not the next line', () => {
    mount(afterGoal([{ playerId: 'p1' }, { playerId: 'p2' }]));
    expect(screen.getByText(/who scored/i)).toBeTruthy();
    expect(offered()).toEqual(['#1 On1', '#2 On2', '#1 On1', '#2 On2']); // scorer + assist rows
  });

  // An injured player who was replaced was not on the field when the goal was scored,
  // so they cannot have scored or assisted it.
  it('drop a player the point substituted off', () => {
    mount(
      afterGoal([{ playerId: 'p1', off: true }, { playerId: 'p2' }, { playerId: 'p4', sub: true }]),
    );
    expect(offered()).not.toContain('#1 On1');
    expect(offered()).toContain('#4 Bench4');
  });

  it('include a player who was substituted into that point', () => {
    mount(afterGoal([{ playerId: 'p1' }, { playerId: 'p2' }, { playerId: 'p4', sub: true }]));
    expect(offered()).toContain('#4 Bench4');
  });

  it('offer the whole roster when that point had no line', () => {
    mount(afterGoal(undefined));
    expect(offered()).toContain('#3 Bench3');
  });
});

describe('an injury', () => {
  /** Raised hand → Injury, which is where the attribution step opens. */
  function openInjury(state: GameState) {
    mount(state);
    tap(screen.getByRole('button', { name: /stoppage or sotg/i }));
    tap(screen.getByRole('button', { name: /^injury$/i }));
  }

  it('offers only the players on this point', () => {
    openInjury(lineGame());
    expect(offered()).toEqual(['#1 On1', '#2 On2']);
  });

  /** Records an injury for `who` and lands on the replacement step. */
  function injure(state: GameState, who: RegExp) {
    openInjury(state);
    tap(screen.getByRole('button', { name: who }));
    tap(screen.getByRole('button', { name: /^save$/i }));
  }

  it('asks who is coming on, offering only eligible replacements', () => {
    injure(lineGame(), /#1 On1/);

    // The injury is recorded first, whatever happens to the line.
    expect(stored().log.some((e) => e.type === 'stoppage')).toBe(true);
    expect(screen.getByText(/who is coming on/i)).toBeTruthy();
    // Noa is FMP, so only the FMP on the bench is offered — an MMP cannot replace her.
    expect(offered()).toEqual(['#3 Bench3']);
  });

  it('swaps the replacement in, flagging both halves of it', () => {
    injure(lineGame(), /#1 On1/);
    tap(screen.getByRole('button', { name: /#3 Bench3/ }));
    tap(screen.getByRole('button', { name: /^save$/i }));

    const s = stored();
    expect(s.line).toEqual(['p2', 'p3']);
    // The injured player was on the field for part of this point and still counts as
    // having played it — flagged `off` rather than dropped.
    expect(s.pointLine).toEqual([
      { playerId: 'p1', off: true },
      { playerId: 'p2' },
      { playerId: 'p3', sub: true },
    ]);
  });

  // Skipping is a real answer — a player who walks it off and stays on.
  it('leaves the line alone when the substitution is skipped', () => {
    openInjury(lineGame());
    tap(screen.getByRole('button', { name: /#1 On1/ }));
    tap(screen.getByRole('button', { name: /^save$/i }));
    tap(screen.getByRole('button', { name: /no substitution/i }));

    const s = stored();
    expect(s.line).toEqual(['p1', 'p2']);
    expect(s.log.some((e) => e.type === 'stoppage')).toBe(true);
  });

  it('keeps the predefined line name through a forced substitution', () => {
    // D1 still played this point, one injury notwithstanding.
    injure(lineGame({ lineName: 'D1' }), /#1 On1/);
    tap(screen.getByRole('button', { name: /#3 Bench3/ }));
    tap(screen.getByRole('button', { name: /^save$/i }));
    expect(stored().lineName).toBe('D1');
  });

  // Someone already substituted off cannot be hurt in the play, so they are not even
  // offered as the injured player.
  it('does not offer a player who has been substituted off', () => {
    openInjury(
      lineGame({ line: ['p2'], pointLine: [{ playerId: 'p1', off: true }, { playerId: 'p2' }] }),
    );
    expect(offered()).toEqual(['#2 On2']);
  });

  /**
   * A correction is made later and may be about a point several ago, whose line was a
   * different seven from whoever is on now — narrowing there would hide the very
   * player the volunteer is trying to name. Hence `onField` is the caller's call.
   */
  it('is not narrowed when the same picker is reopened from the log to correct one', () => {
    mount(lineGame({ line: ['p3', 'p4'], pointLine: [{ playerId: 'p3' }, { playerId: 'p4' }] }));
    // Record an injury on the current line, then go and correct it from the log.
    tap(screen.getByRole('button', { name: /stoppage or sotg/i }));
    tap(screen.getByRole('button', { name: /^injury$/i }));
    tap(screen.getByRole('button', { name: /#3 Bench3/ }));
    tap(screen.getByRole('button', { name: /^save$/i }));
    tap(screen.getByRole('button', { name: /no substitution/i }));

    tap(screen.getByRole('button', { name: /^log$/i }));
    tap(screen.getAllByRole('button', { name: /fix this entry/i })[0]);
    // Every player is offered, not just the two who happen to be on right now.
    expect(offered()).toEqual(['#1 On1', '#2 On2', '#3 Bench3', '#4 Bench4']);
  });

  describe('the replacement must keep the split', () => {
    // You cannot swap an MMP for an FMP: the line has to come back to the same split.
    it('offers only the matching marking in mixed', () => {
      injure(lineGame(), /#2 On2/); // Kim is MMP
      expect(offered()).toEqual(['#4 Bench4']);
    });

    it('offers the whole bench outside mixed, where there is no split to keep', () => {
      const state = lineGame();
      state.config = { ...state.config, division: 'open' };
      injure(state, /#1 On1/);
      expect(offered()).toEqual(['#3 Bench3', '#4 Bench4']);
    });

    // A missing marking is unknown, not wrong — so an unmarked injured player puts no
    // constraint on the bench, and an unmarked substitute is never excluded.
    it('offers the whole bench when the injured player is unmarked', () => {
      const state = lineGame();
      state.config = {
        ...state.config,
        players: { A: roster.map((p) => (p.id === 'p1' ? { ...p, gender: undefined } : p)), B: [] },
      };
      injure(state, /#1 On1/);
      expect(offered()).toEqual(['#3 Bench3', '#4 Bench4']);
    });

    it('offers an unmarked substitute alongside the matching ones', () => {
      const state = lineGame();
      state.config = {
        ...state.config,
        players: { A: roster.map((p) => (p.id === 'p4' ? { ...p, gender: undefined } : p)), B: [] },
      };
      injure(state, /#1 On1/); // FMP: Bench3 matches, Bench4 is now unknown
      expect(offered()).toEqual(['#3 Bench3', '#4 Bench4']);
    });

    /**
     * An empty result is a real answer, so the question is stated and closed rather
     * than dropped: the volunteer is told why, and the injured player plays on.
     */
    it('says the injured player plays on when nobody matching is left', () => {
      const state = lineGame();
      // Both bench players are MMP, so an FMP injury has nobody to bring on.
      state.config = {
        ...state.config,
        players: {
          A: roster.map((p) => (p.id === 'p3' ? { ...p, gender: 'male' as const } : p)),
          B: [],
        },
      };
      injure(state, /#1 On1/);
      expect(screen.getByText(/nobody with a matching mmp\/fmp marking/i)).toBeTruthy();
      expect(screen.getByText(/so they play on/i)).toBeTruthy();
      tap(screen.getByRole('button', { name: /^ok$/i }));
      // Nothing changed but the injury, which was recorded before the question.
      expect(stored().line).toEqual(['p1', 'p2']);
      expect(stored().log.some((e) => e.type === 'stoppage')).toBe(true);
    });

    it('distinguishes an empty bench from an unmatched one', () => {
      const state = lineGame();
      state.config = { ...state.config, players: { A: roster.slice(0, 2), B: [] } };
      injure(state, /#1 On1/);
      expect(screen.getByText(/everyone on the roster is already on the field/i)).toBeTruthy();
    });
  });

  it('does not ask when nobody was named', () => {
    openInjury(lineGame());
    tap(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.queryByText(/who is coming on/i)).toBeNull();
    expect(stored().log.some((e) => e.type === 'stoppage')).toBe(true);
  });

  /**
   * An opponent going down buys us a change too, so the step opens for their injury
   * as well — and with nobody of ours hurt, who goes off is the volunteer's pick.
   */
  describe('an injury on the other team', () => {
    /** Ticks the "also mark the other team as injured" box and saves. */
    function injureOther(state: GameState) {
      openInjury(state);
      tap(screen.getByRole('checkbox'));
      tap(screen.getByRole('button', { name: /^save$/i }));
    }

    it('still asks who we are changing', () => {
      injureOther(lineGame());
      // Both halves are the question, so the heading asks both — "who is coming on"
      // would be hiding the fact that somebody has to go off for them.
      expect(screen.getByText(/who is changing/i)).toBeTruthy();
      expect(screen.getByText(/you may change 1 player/i)).toBeTruthy();
      // Both halves are asked: nobody of ours was named, so who goes off is a choice.
      expect(screen.getByText('Coming off')).toBeTruthy();
      expect(screen.getByText('Coming on')).toBeTruthy();
    });

    it('swaps the player we picked off for the one we picked on', () => {
      injureOther(lineGame());
      tap(screen.getByRole('button', { name: /#2 On2/ })); // off — MMP
      tap(screen.getByRole('button', { name: /#4 Bench4/ })); // on — MMP
      tap(screen.getByRole('button', { name: /^save$/i }));

      const st = stored();
      expect(st.line).toEqual(['p1', 'p4']);
      // The player who came off still played part of the point.
      expect(st.pointLine).toEqual([
        { playerId: 'p1' },
        { playerId: 'p2', off: true },
        { playerId: 'p4', sub: true },
      ]);
    });

    // The injury is what matters; the change is optional and skipping is a real answer.
    it('leaves the line alone when it is skipped', () => {
      injureOther(lineGame());
      tap(screen.getByRole('button', { name: /no substitution/i }));
      expect(stored().line).toEqual(['p1', 'p2']);
      expect(stored().log.some((e) => e.type === 'stoppage')).toBe(true);
    });

    // Line tracking is the whole reason this question exists.
    it('is not asked when line tracking is off', () => {
      const state = lineGame();
      state.config = { ...state.config, lines: { ...state.config.lines, enabled: false } };
      injureOther(state);
      expect(screen.queryByText(/who is changing/i)).toBeNull();
    });
  });

  /**
   * The swap warns, and never refuses — the same bargain the line dialog strikes.
   * What `replacementsFor` narrows away it cannot catch: a mixed set going off admits
   * both markings, and an unmarked player is always offered.
   */
  describe('the swap is checked', () => {
    const issues = () =>
      (document.querySelector('[data-sub-issues]') as HTMLElement).getAttribute('data-sub-issues');
    const saveState = () =>
      (document.querySelector('[data-sub-save]') as HTMLElement).getAttribute('data-sub-save');

    it('warns when the numbers do not match, and takes a second tap', () => {
      const state = lineGame();
      // Both bench players unmarked, so two can come on for one without a split issue.
      state.config = {
        ...state.config,
        players: {
          A: roster.map((p) => (p.id === 'p3' || p.id === 'p4' ? { ...p, gender: undefined } : p)),
          B: [],
        },
      };
      injure(state, /#1 On1/);
      tap(screen.getByRole('button', { name: /#3 Bench3/ }));
      expect(issues()).toBe('');
      tap(screen.getByRole('button', { name: /#4 Bench4/ }));
      expect(issues()).toBe('count');

      // Warned, then armed — and nothing is committed until the confirming tap.
      expect(saveState()).toBe('warned');
      tap(screen.getByRole('button', { name: /save anyway/i }));
      expect(saveState()).toBe('armed');
      expect(stored().line).toEqual(['p1', 'p2']);
      tap(screen.getByRole('button', { name: /tap again to save/i }));
      // One off, two on — the line is a player bigger, which is what it warned about.
      expect(stored().line).toEqual(['p2', 'p3', 'p4']);
    });

    it('warns when the markings coming on cannot account for the ones going off', () => {
      const state = lineGame();
      // Two hurt, one of each marking — so the bench is unnarrowed and both FMP and
      // MMP are offered. Two FMP coming on is a swap that could not have happened.
      state.config = {
        ...state.config,
        players: {
          A: roster.map((p) => (p.id === 'p4' ? { ...p, gender: 'female' as const } : p)),
          B: [],
        },
      };
      openInjury(state);
      tap(screen.getByRole('button', { name: /#1 On1/ }));
      tap(screen.getByRole('button', { name: /#2 On2/ }));
      tap(screen.getByRole('button', { name: /^save$/i }));

      tap(screen.getByRole('button', { name: /#3 Bench3/ }));
      tap(screen.getByRole('button', { name: /#4 Bench4/ }));
      expect(issues()).toBe('ratio');
    });

    // The other team's injury buys exactly one change, and the checkbox has no count.
    it('warns when more of ours are changed than the injury allows', () => {
      openInjury(lineGame());
      tap(screen.getByRole('checkbox'));
      tap(screen.getByRole('button', { name: /^save$/i }));
      tap(screen.getByRole('button', { name: /#1 On1/ })); // off
      tap(screen.getByRole('button', { name: /#2 On2/ })); // off as well — one too many
      expect(issues()).toContain('allowance');
    });
  });
});
