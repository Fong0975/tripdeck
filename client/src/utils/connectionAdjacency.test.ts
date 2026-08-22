import { describe, expect, it } from 'vitest';

import {
  findConnectionsBrokenByMove,
  isConnectionAdjacent,
} from './connectionAdjacency';

describe('isConnectionAdjacent', () => {
  const orderedIds = [100, 101, 102];

  it('returns true when to directly follows from in the ordered ids', () => {
    const connection = { fromAttractionId: 100, toAttractionId: 101 };
    expect(isConnectionAdjacent(connection, orderedIds)).toBe(true);
  });

  it('returns false when from and to are not consecutive', () => {
    const connection = { fromAttractionId: 100, toAttractionId: 102 };
    expect(isConnectionAdjacent(connection, orderedIds)).toBe(false);
  });

  it('returns false when to comes before from', () => {
    const connection = { fromAttractionId: 101, toAttractionId: 100 };
    expect(isConnectionAdjacent(connection, orderedIds)).toBe(false);
  });

  it('returns false when either endpoint is missing from the ordered ids', () => {
    const connection = { fromAttractionId: 999, toAttractionId: 101 };
    expect(isConnectionAdjacent(connection, orderedIds)).toBe(false);
  });
});

describe('findConnectionsBrokenByMove', () => {
  it('flags a connection that was adjacent and no longer is', () => {
    const connections = [{ id: 1, fromAttractionId: 100, toAttractionId: 101 }];

    const broken = findConnectionsBrokenByMove(
      connections,
      [100, 101, 102],
      [100, 102, 101],
    );

    expect(broken).toEqual(connections);
  });

  it('does not flag a connection that stays adjacent after the move', () => {
    const connections = [{ id: 1, fromAttractionId: 100, toAttractionId: 101 }];

    const broken = findConnectionsBrokenByMove(
      connections,
      [100, 101, 102],
      [102, 100, 101],
    );

    expect(broken).toEqual([]);
  });

  it('does not flag a connection that was already non-adjacent before the move', () => {
    const connections = [{ id: 1, fromAttractionId: 100, toAttractionId: 102 }];

    const broken = findConnectionsBrokenByMove(
      connections,
      [100, 101, 102],
      [101, 100, 102],
    );

    expect(broken).toEqual([]);
  });

  it('flags every connection touching an attraction removed from the list (cross-day move)', () => {
    const connections = [
      { id: 1, fromAttractionId: 100, toAttractionId: 101 },
      { id: 2, fromAttractionId: 101, toAttractionId: 102 },
    ];

    const broken = findConnectionsBrokenByMove(
      connections,
      [100, 101, 102],
      [100, 102],
    );

    expect(broken).toEqual(connections);
  });
});
