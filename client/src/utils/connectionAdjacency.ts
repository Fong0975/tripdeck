interface ConnectionEndpoints {
  fromAttractionId: number;
  toAttractionId: number;
}

/**
 * A connection is only ever rendered (see DayColumn) when its from/to
 * attractions sit next to each other in the given order.
 */
export function isConnectionAdjacent(
  connection: ConnectionEndpoints,
  orderedAttractionIds: number[],
): boolean {
  const fromIdx = orderedAttractionIds.indexOf(connection.fromAttractionId);
  const toIdx = orderedAttractionIds.indexOf(connection.toAttractionId);
  return fromIdx !== -1 && toIdx === fromIdx + 1;
}

/**
 * Connections that are currently adjacent (and therefore visible) under
 * currentOrderedIds but would no longer be adjacent under newOrderedIds.
 *
 * Used to warn before a drag-and-drop move that would silently orphan a
 * connection. Passing a newOrderedIds list with an attraction removed (e.g.
 * a cross-day move) naturally flags every connection touching that
 * attraction as broken, since it can no longer be found at any position.
 */
export function findConnectionsBrokenByMove<T extends ConnectionEndpoints>(
  connections: T[],
  currentOrderedIds: number[],
  newOrderedIds: number[],
): T[] {
  return connections.filter(
    c =>
      isConnectionAdjacent(c, currentOrderedIds) &&
      !isConnectionAdjacent(c, newOrderedIds),
  );
}
