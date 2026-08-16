import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/**
 * The live-stats pager in the reserved action-row slot (see StatsSlot). What is
 * pinned here: statsMode decides one page or three, the two chevrons cycle the
 * pages in a loop, the page survives the slot changing hands, and the slot's
 * other tenants — the amber advance button above all — always win it back.
 */
function liveGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'B';
  state.offenseTeam = 'B';
  state.pullingTeam = 'A';
  state.pointStartSeconds = 0;
  // Copied rather than mutated: createInitialState()'s default config object is
  // shared, and flipping statsMode on it would leak into other test files.
  state.config = { ...state.config, statsMode: 'game' };
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

const pager = () => screen.queryByRole('group', { name: 'Live statistics' });
const ledger = () => document.querySelector('[data-ledger]');
const next = () => screen.getByLabelText('Next statistic');

beforeEach(() => sessionStorage.clear());

describe('the stats slot', () => {
  it('collapses to the holds/breaks page in statsMode none — no arrows, no ledger', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'none' };
    mount(state);

    const slot = pager() as HTMLElement;
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveTextContent('Holds');
    expect(slot).toHaveTextContent('Breaks');
    // One page: nothing to cycle, and no possession to draw.
    expect(screen.queryByLabelText('Next statistic')).toBeNull();
    expect(screen.queryByLabelText('Previous statistic')).toBeNull();
    expect(ledger()).toBeNull();
  });

  it('cycles ledger → pace → figures → ledger with the chevrons, looping both ways', () => {
    mount(liveGame());

    // Page 1 is the ledger.
    expect(ledger()).not.toBeNull();

    fireEvent.click(next());
    expect(ledger()).toBeNull();
    // Both the visible caption and the sr-only summary name the point page.
    expect(screen.getAllByText(/This point/).length).toBeGreaterThan(0);

    fireEvent.click(next());
    // Team figures, in the requested order: Holds, Breaks, Break ch., Turns.
    const slot = pager() as HTMLElement;
    expect(slot.textContent).toMatch(/Holds.*Breaks.*Break ch\..*Turns/);
    expect(slot.textContent).not.toContain('Clean');

    fireEvent.click(next());
    expect(ledger()).not.toBeNull(); // looped back around

    fireEvent.click(screen.getByLabelText('Previous statistic'));
    expect(slot.textContent).toMatch(/Break ch\./); // and backwards past the start
  });

  it('comes back on the page it was on after the slot changes hands', () => {
    // The same stored index StatsSlot writes when a chevron is tapped — the
    // pager unmounts whenever a button borrows the slot, and must not reset.
    sessionStorage.setItem(
      'ultimate-scorekeeper:stats-slot-page',
      JSON.stringify({ game: 0, page: 2 }),
    );
    mount(liveGame());

    expect(ledger()).toBeNull();
    expect((pager() as HTMLElement).textContent).toMatch(/Break ch\./);
  });

  it('cedes the slot to the amber advance button while awaiting the pull', () => {
    mount(liveGame({ status: 'awaitingPull', possessionTeam: null, pointStartSeconds: null }));

    // The regression that matters: the button occupies the slot, the pager is gone.
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();
    expect(pager()).toBeNull();
  });

  it('cedes the slot to the call answers while a call is open', () => {
    mount(liveGame({ pendingCall: { kind: 'foul', team: 'A', elapsedSeconds: 3 } }));

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(pager()).toBeNull();
  });

  it('renders a legacy PointRecord without possessionSeconds as a flat column, not a crash', () => {
    mount(
      liveGame({
        points: [
          // A point persisted by a build from before possession was timed.
          {
            scoredBy: 'A',
            offense: 'B',
            isBreak: true,
            durationSeconds: 42,
            half: 1,
            turnovers: 2,
          },
        ],
      }),
    );

    expect(pager()).toBeInTheDocument();
    const strip = ledger() as HTMLElement;
    const cols = strip.querySelectorAll('span.relative');
    // Two columns — the legacy point and the one in progress. The legacy one
    // draws no bars, only its running score in the aligned band.
    expect(cols).toHaveLength(2);
    expect(cols[0].querySelectorAll('[data-bar]')).toHaveLength(0);
    expect(cols[0].textContent).toBe('1');
  });

  it('gives a goal tapped in a breath after the pull a bar, not a flat column', () => {
    mount(
      liveGame({
        points: [
          // Zero seconds accrued, no turnovers: the receiving team held the
          // disc for the whole (instant) point, so its half is a full bar.
          {
            scoredBy: 'A',
            offense: 'A',
            isBreak: false,
            durationSeconds: 0,
            half: 1,
            turnovers: 0,
            possessionSeconds: { A: 0, B: 0 },
          },
        ],
      }),
    );

    const cols = [...(ledger() as HTMLElement).querySelectorAll('span.relative')];
    // One bar on the scorer's side, nothing opposite — plus its score label.
    expect(cols[0].querySelectorAll('[data-bar]')).toHaveLength(1);
    expect(cols[0].textContent).toBe('1');
  });

  it('marks the offence side of every column with the amber dot, breaks included', () => {
    mount(
      liveGame({
        points: [
          // A hold: A received and scored — dot and score both on top.
          {
            scoredBy: 'A',
            offense: 'A',
            isBreak: false,
            durationSeconds: 30,
            half: 1,
            turnovers: 0,
            possessionSeconds: { A: 20, B: 5 },
          },
          // A break: A received but B scored — dot top, score bottom.
          {
            scoredBy: 'B',
            offense: 'A',
            isBreak: true,
            durationSeconds: 40,
            half: 1,
            turnovers: 1,
            possessionSeconds: { A: 10, B: 25 },
          },
        ],
      }),
    );

    const cols = [...(ledger() as HTMLElement).querySelectorAll('span.relative')];
    const dotSide = (col: Element) =>
      (col.querySelector('[data-offense-dot]') as HTMLElement).style.top === '0px'
        ? 'top'
        : 'bottom';
    // Every column carries a dot — the point in progress too, whose receiver
    // (offenseTeam 'B', the bottom side here) is already known.
    expect(cols.map(dotSide)).toEqual(['top', 'top', 'bottom']);
  });

  it('labels every finished column with the scorer’s running score in one neutral ink', () => {
    mount(
      liveGame({
        points: [
          {
            scoredBy: 'A',
            offense: 'A',
            isBreak: false,
            durationSeconds: 30,
            half: 1,
            turnovers: 0,
            possessionSeconds: { A: 20, B: 5 },
          },
          {
            scoredBy: 'B',
            offense: 'B',
            isBreak: false,
            durationSeconds: 40,
            half: 1,
            turnovers: 0,
            possessionSeconds: { A: 10, B: 25 },
          },
          {
            scoredBy: 'A',
            offense: 'A',
            isBreak: false,
            durationSeconds: 30,
            half: 1,
            turnovers: 0,
            possessionSeconds: { A: 22, B: 3 },
          },
        ],
      }),
    );

    const cols = [...(ledger() as HTMLElement).querySelectorAll('span.relative')];
    // Running score per scorer: A 1, B 1, A 2 — and the open point is unlabelled.
    expect(cols.map((c) => c.textContent)).toEqual(['1', '1', '2', '']);
    const labels = cols.slice(0, 3).map((c) => c.querySelector('span.text-center') as HTMLElement);
    expect(labels.every((l) => l.className.includes('text-chalk/70'))).toBe(true);
  });
});
