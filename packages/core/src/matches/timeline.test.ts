import { describe, expect, it } from 'vitest';
import type { PointEvent } from '../types/match';
import { buildTimeline, isPointEvent, pointShare, toPointEvents } from './timeline';

const ev = (
  atMs: number,
  playerId: 'p1' | 'p2',
  delta: 1 | -1,
  action: PointEvent['action'] = delta === 1 ? 'conquer' : null,
): PointEvent => ({ atMs, playerId, delta, action });

describe('buildTimeline', () => {
  it('replays the running score after each event', () => {
    const t = buildTimeline([
      ev(1000, 'p1', 1),
      ev(2000, 'p2', 1, 'hold'),
      ev(3000, 'p1', 1, 'special'),
      ev(4000, 'p1', -1),
    ]);
    expect(t.map((e) => e.score)).toEqual([
      { p1: 1, p2: 0 },
      { p1: 1, p2: 1 },
      { p1: 2, p2: 1 },
      { p1: 1, p2: 1 },
    ]);
    // Each entry keeps its own snapshot, not a shared reference.
    expect(t[0]?.score).toEqual({ p1: 1, p2: 0 });
  });

  it('never goes below zero', () => {
    const t = buildTimeline([ev(1, 'p2', -1), ev(2, 'p2', 1)]);
    expect(t.map((e) => e.score.p2)).toEqual([0, 1]);
  });

  it('handles no events', () => {
    expect(buildTimeline([])).toEqual([]);
  });
});

describe('pointShare', () => {
  it('is your fraction of all points', () => {
    expect(pointShare({ p1: 8, p2: 5 })).toBeCloseTo(8 / 13);
    expect(pointShare({ p1: 4, p2: 8 })).toBeCloseTo(1 / 3);
    expect(pointShare({ p1: 8, p2: 5 }, 'p2')).toBeCloseTo(5 / 13);
  });

  it('is 0 for a 0–0 game', () => {
    expect(pointShare({ p1: 0, p2: 0 })).toBe(0);
  });
});

describe('stored events', () => {
  it('accepts valid events and rejects malformed ones', () => {
    expect(isPointEvent(ev(10, 'p1', 1))).toBe(true);
    expect(isPointEvent(ev(10, 'p2', -1, null))).toBe(true);
    expect(isPointEvent({ atMs: -1, playerId: 'p1', delta: 1, action: null })).toBe(false);
    expect(isPointEvent({ atMs: 1, playerId: 'p3', delta: 1, action: null })).toBe(false);
    expect(isPointEvent({ atMs: 1, playerId: 'p1', delta: 2, action: null })).toBe(false);
    expect(isPointEvent({ atMs: 1, playerId: 'p1', delta: 1, action: 'steal' })).toBe(false);
  });

  it('narrows arrays and drops bad entries; non-arrays are empty', () => {
    expect(toPointEvents([ev(1, 'p1', 1), { junk: true }])).toHaveLength(1);
    expect(toPointEvents(null)).toEqual([]);
    expect(toPointEvents({})).toEqual([]);
  });
});
