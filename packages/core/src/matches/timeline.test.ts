import { describe, expect, it } from 'vitest';
import type { PointEvent } from '../types/match';
import {
  isPointEvent,
  netPoints,
  pointShare,
  scoreSeries,
  toPointEvents,
} from './timeline';

const ev = (
  atMs: number,
  playerId: 'p1' | 'p2',
  delta: 1 | -1,
  action: PointEvent['action'] = delta === 1 ? 'conquer' : null,
): PointEvent => ({ atMs, playerId, delta, action });

describe('netPoints', () => {
  it('a take-back cancels that player\'s latest point, and neither remains', () => {
    const kept = netPoints([
      ev(1000, 'p1', 1, 'conquer'),
      ev(2000, 'p1', 1, 'hold'),
      ev(3000, 'p2', 1),
      ev(4000, 'p1', 1, 'special'),
      ev(5000, 'p1', -1),
      ev(6000, 'p1', 1, 'conquer'),
    ]);
    expect(kept.map((e) => [e.atMs, e.playerId, e.action])).toEqual([
      [1000, 'p1', 'conquer'],
      [2000, 'p1', 'hold'],
      [3000, 'p2', 'conquer'],
      [6000, 'p1', 'conquer'],
    ]);
    expect(kept.every((e) => e.delta === 1)).toBe(true);
  });

  it('only cancels the same player\'s points', () => {
    const kept = netPoints([ev(1, 'p1', 1), ev(2, 'p2', 1), ev(3, 'p2', -1)]);
    expect(kept.map((e) => e.playerId)).toEqual(['p1']);
  });

  it('cancels back through several take-backs in a row', () => {
    const kept = netPoints([
      ev(1, 'p1', 1),
      ev(2, 'p1', 1),
      ev(3, 'p1', -1),
      ev(4, 'p1', -1),
    ]);
    expect(kept).toEqual([]);
  });

  it('ignores a take-back with nothing to cancel', () => {
    expect(netPoints([ev(1, 'p1', -1), ev(2, 'p1', 1)])).toHaveLength(1);
  });
});

describe('scoreSeries', () => {
  it('builds each player\'s step line from the net points', () => {
    const s = scoreSeries([
      ev(1000, 'p1', 1, 'conquer'),
      ev(2000, 'p2', 1, 'hold'),
      ev(3000, 'p1', 1, 'special'),
      ev(4000, 'p1', -1),
      ev(5000, 'p1', 1, 'hold'),
    ]);
    // The taken-back Special is gone; each step keeps how its point was scored.
    expect(s.p1).toEqual([
      { atMs: 0, score: 0, action: null },
      { atMs: 1000, score: 1, action: 'conquer' },
      { atMs: 5000, score: 2, action: 'hold' },
    ]);
    expect(s.p2).toEqual([
      { atMs: 0, score: 0, action: null },
      { atMs: 2000, score: 1, action: 'hold' },
    ]);
  });

  it('starts both lines at 0 when there are no points', () => {
    expect(scoreSeries([])).toEqual({
      p1: [{ atMs: 0, score: 0, action: null }],
      p2: [{ atMs: 0, score: 0, action: null }],
    });
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
