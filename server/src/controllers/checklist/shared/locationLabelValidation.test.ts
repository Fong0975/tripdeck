import { describe, expect, it } from 'vitest';

import {
  LABEL_NAME_CHARACTERS_ERROR,
  parseLocationLabelCreate,
  parseLocationLabelUpdate,
  SHOW_AS_GROUP_REQUIRED_ERROR,
} from './locationLabelValidation';
import { NAME_REQUIRED_ERROR } from './validation';

describe('parseLocationLabelCreate', () => {
  it.each([
    {
      label: 'a name only, defaulting show_as_group to true',
      body: { name: '託運' },
      expected: { ok: true, value: { name: '託運', showAsGroup: true } },
    },
    {
      label: 'a name with surrounding spaces, trimmed',
      body: { name: '  手提 ', show_as_group: false },
      expected: { ok: true, value: { name: '手提', showAsGroup: false } },
    },
    {
      label: 'a name of exactly the maximum length',
      body: { name: 'x'.repeat(20) },
      expected: {
        ok: true,
        value: { name: 'x'.repeat(20), showAsGroup: true },
      },
    },
    {
      label: 'a missing body',
      body: undefined,
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a non-string name',
      body: { name: 5 },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a blank name',
      body: { name: '   ' },
      expected: { ok: false, error: NAME_REQUIRED_ERROR },
    },
    {
      label: 'a name containing a comma',
      body: { name: '託運,隨身' },
      expected: { ok: false, error: LABEL_NAME_CHARACTERS_ERROR },
    },
    {
      label: 'a name containing a pipe',
      body: { name: '託|運' },
      expected: { ok: false, error: LABEL_NAME_CHARACTERS_ERROR },
    },
    {
      label: 'a name that is too long',
      body: { name: 'x'.repeat(21) },
      expected: { ok: false, error: 'name must be at most 20 characters' },
    },
    {
      label: 'a show_as_group that is not a boolean',
      body: { name: '託運', show_as_group: 'yes' },
      expected: { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR },
    },
  ])('handles $label', ({ body, expected }) => {
    expect(parseLocationLabelCreate(body)).toEqual(expected);
  });
});

describe('parseLocationLabelUpdate', () => {
  it.each([
    {
      label: 'true',
      body: { show_as_group: true },
      expected: { ok: true, value: true },
    },
    {
      label: 'false',
      body: { show_as_group: false },
      expected: { ok: true, value: false },
    },
    {
      label: 'a missing field',
      body: {},
      expected: { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR },
    },
    {
      label: 'a non-boolean value',
      body: { show_as_group: 1 },
      expected: { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR },
    },
    {
      label: 'a missing body',
      body: undefined,
      expected: { ok: false, error: SHOW_AS_GROUP_REQUIRED_ERROR },
    },
  ])('handles $label', ({ body, expected }) => {
    expect(parseLocationLabelUpdate(body)).toEqual(expected);
  });
});
