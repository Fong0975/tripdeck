const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /password|secret|token|apikey/i;
const MAX_STRING_LENGTH = 5000;

/**
 * True for the shape `Buffer.prototype.toJSON()` produces
 * (`{ type: 'Buffer', data: number[] }`). JSON.stringify calls `toJSON()`
 * on a Buffer before ever invoking the replacer below, so a raw `Buffer`
 * value never reaches it directly — this is what the replacer actually
 * needs to recognize.
 */
function isSerializedBuffer(
  value: unknown,
): value is { type: 'Buffer'; data: number[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((value as { data?: unknown }).data)
  );
}

/**
 * `JSON.stringify` replacer that redacts sensitive-looking keys, collapses
 * Buffers to a byte-count placeholder, and truncates very long strings — a
 * last line of defense so an incautious `meta` object (e.g. an entire env
 * config, or a raw upload buffer) never ends up written to the log verbatim.
 */
function redactingReplacer(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }
  if (isSerializedBuffer(value)) {
    return `[Buffer ${value.data.length} bytes]`;
  }
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
  }
  return value;
}

/**
 * `JSON.stringify` with the redaction/truncation safeguards above applied,
 * falling back to a placeholder if the value still can't be serialized
 * (e.g. circular references) rather than letting a log call throw.
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, redactingReplacer);
  } catch {
    return '"[Unserializable value]"';
  }
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Normalizes a value caught from a `catch` block (typed `unknown` under
 * `strict` mode) into a consistent, loggable shape.
 */
export function serializeError(
  err: unknown,
): SerializedError | { value: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}
