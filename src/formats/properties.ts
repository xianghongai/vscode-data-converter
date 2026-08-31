import { parse, stringify } from 'dot-properties';
import type { Codec } from '@/types';

export const properties: Codec = {
  id: 'properties',
  label: '.properties',
  languageId: 'properties',
  decode: (text) => parse(text),
  encode: (value) => `${stringify(value as Record<string, unknown>, { lineWidth: null })}\n`,
};
