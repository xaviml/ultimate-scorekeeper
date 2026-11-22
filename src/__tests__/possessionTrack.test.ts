import { describe, expect, it } from 'vitest';
import { layoutTrack } from '../components/possessionTrack';
import type { TrackSegment } from '../state/pointStory';

const seg = (patch: Partial<TrackSegment>): TrackSegment => ({
  team: 'A',
  seconds: 10,
  passes: null,
  passText: '',
  time: '10s',
  state: 'done',
  ...patch,
});

describe('layoutTrack', () => {
  it('sizes segments by time on the game-wide scale, with a gap at each turnover', () => {
    const { pieces } = layoutTrack(
      [seg({ seconds: 10 }), seg({ team: 'B', seconds: 20, state: 'goal' })],
      308,
      30,
    );
    // 308 wide, less the end room (8) and one turnover gap (4): 296 px for 30 s.
    expect(pieces[0].x1 - pieces[0].x0).toBeCloseTo(296 / 3);
    expect(pieces[1].x1 - pieces[1].x0).toBeCloseTo((296 * 2) / 3);
    expect(pieces[1].x0 - pieces[0].x1).toBe(4);
  });

  it('puts the time above and the passes below, and leaves no passes blank', () => {
    const { pieces, mid } = layoutTrack(
      [
        seg({ passes: 6, passText: '6 passes' }),
        seg({ team: 'B', passes: 0 }),
        seg({ passes: null, state: 'goal' }),
      ],
      300,
      30,
    );
    expect(pieces[0].time?.y).toBeLessThan(mid);
    expect(pieces[0].passLabel).toMatchObject({ text: '6 passes' });
    expect(pieces[0].passLabel!.y).toBeGreaterThan(mid);
    // Zero passes and passes nobody counted read the same: nothing under the segment.
    expect(pieces[1].passLabel).toBeNull();
    expect(pieces[2].passLabel).toBeNull();
  });

  it('draws an untimed possession dashed, at a fixed length', () => {
    const { pieces } = layoutTrack([seg({ seconds: null, time: '', state: 'inferred' })], 300, 30);
    expect(pieces[0].dashed).toBe(true);
    expect(pieces[0].time).toBeNull();
  });
});
