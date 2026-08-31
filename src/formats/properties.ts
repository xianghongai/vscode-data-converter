import { parse, stringify } from 'dot-properties';
import type { Codec } from '@/types';
import { requireKeyValue } from './key-value';

export const properties: Codec = {
  id: 'properties',
  label: '.properties',
  languageId: 'properties',
  decode: (text) => parse(text),
  encode: (value) => `${stringify(requireKeyValue(value), { lineWidth: null })}\n`,
};
