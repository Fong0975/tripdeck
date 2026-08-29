import { describe, expect, it } from 'vitest';

import { safeStringify, serializeError } from './serialize';

describe('safeStringify', () => {
  it('redacts keys that look like secrets, case-insensitively', () => {
    const result = JSON.parse(
      safeStringify({ dbPassword: 'hunter2', Token: 'abc', apiKey: 'xyz' }),
    );

    expect(result).toEqual({
      dbPassword: '[REDACTED]',
      Token: '[REDACTED]',
      apiKey: '[REDACTED]',
    });
  });

  it('collapses a Buffer value into a byte-count placeholder', () => {
    const result = JSON.parse(
      safeStringify({ buffer: Buffer.from('hello world') }),
    );

    expect(result).toEqual({ buffer: '[Buffer 11 bytes]' });
  });

  it('truncates strings longer than the length threshold', () => {
    const longString = 'a'.repeat(6000);

    const result = JSON.parse(safeStringify({ text: longString }));

    expect(result.text).toHaveLength(5000 + '...[truncated]'.length);
    expect(result.text.endsWith('...[truncated]')).toBe(true);
  });

  it('leaves ordinary values untouched', () => {
    expect(JSON.parse(safeStringify({ tripId: 42, name: 'ok' }))).toEqual({
      tripId: 42,
      name: 'ok',
    });
  });

  it('falls back to a placeholder for unserializable values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(safeStringify(circular)).toBe('"[Unserializable value]"');
  });
});

describe('serializeError', () => {
  it('extracts name/message/stack from an Error instance', () => {
    const err = new TypeError('boom');

    const result = serializeError(err);

    expect(result).toMatchObject({ name: 'TypeError', message: 'boom' });
    expect('stack' in result && result.stack).toContain('TypeError: boom');
  });

  it('stringifies non-Error values', () => {
    expect(serializeError('plain string')).toEqual({ value: 'plain string' });
    expect(serializeError(42)).toEqual({ value: '42' });
  });
});
