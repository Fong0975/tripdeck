import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { mockLogger } from '../test-utils/loggerMock';

import {
  geocodeByName,
  MapsQuotaError,
  MapsRequestDeniedError,
} from './geocodeClient';

const API_KEY = 'secret-key-123';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('geocodeByName', () => {
  const fetchMock = vi.fn();
  const geocode = (name = 'Taipei 101') =>
    geocodeByName(name, API_KEY, fetchMock as unknown as typeof fetch);

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('requests the geocoding endpoint with the encoded name, language and key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ZERO_RESULTS' }));

    await geocode('台北 101 & 觀景台');

    const requested = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requested.origin + requested.pathname).toBe(
      'https://maps.googleapis.com/maps/api/geocode/json',
    );
    expect(requested.searchParams.get('address')).toBe('台北 101 & 觀景台');
    expect(requested.searchParams.get('language')).toBe('zh-TW');
    expect(requested.searchParams.get('key')).toBe(API_KEY);
  });

  it.each([
    {
      description: 'the first result',
      body: {
        status: 'OK',
        results: [
          { geometry: { location: { lat: 25.03, lng: 121.56 } } },
          { geometry: { location: { lat: 1, lng: 2 } } },
        ],
      },
      expected: { lat: 25.03, lng: 121.56 },
    },
    {
      description: 'null for ZERO_RESULTS',
      body: { status: 'ZERO_RESULTS', results: [] },
      expected: null,
    },
    {
      description: 'null for OK with no results',
      body: { status: 'OK', results: [] },
      expected: null,
    },
  ])('returns $description', async ({ body, expected }) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(body));

    await expect(geocode()).resolves.toEqual(expected);
  });

  it.each([
    { status: 'OVER_QUERY_LIMIT', errorClass: MapsQuotaError },
    { status: 'OVER_DAILY_LIMIT', errorClass: MapsQuotaError },
    { status: 'REQUEST_DENIED', errorClass: MapsRequestDeniedError },
    { status: 'INVALID_REQUEST', errorClass: MapsRequestDeniedError },
  ])('throws $errorClass.name for $status', async ({ status, errorClass }) => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status, error_message: 'details' }),
    );

    await expect(geocode()).rejects.toBeInstanceOf(errorClass);
  });

  it('throws a plain error for an unexpected status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'UNKNOWN_ERROR' }));

    const failure = geocode();

    await expect(failure).rejects.toThrow('Unexpected geocoding status');
    await expect(failure).rejects.not.toBeInstanceOf(MapsQuotaError);
  });

  it('throws on an HTTP failure without logging the key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));

    await expect(geocode()).rejects.toThrow('HTTP 503');

    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain(API_KEY);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Google geocoding request failed',
      { status: 503 },
    );
  });

  it('logs the rejection reason for a denied request without the key', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: 'REQUEST_DENIED',
        error_message: 'API key is invalid',
      }),
    );

    await expect(geocode()).rejects.toBeInstanceOf(MapsRequestDeniedError);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Google geocoding request was rejected',
      { status: 'REQUEST_DENIED', message: 'API key is invalid' },
    );
    expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain(API_KEY);
  });

  it('uses the global fetch by default', async () => {
    const globalFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ status: 'ZERO_RESULTS' }) as unknown as Response,
      );

    await expect(geocodeByName('X', API_KEY)).resolves.toBeNull();

    expect(globalFetch).toHaveBeenCalledTimes(1);
    globalFetch.mockRestore();
  });
});
