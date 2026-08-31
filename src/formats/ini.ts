import { parse, stringify } from 'ini';
import type { Codec } from '@/types';
import { requireKeyValue } from './key-value';

export const ini: Codec = {
  id: 'ini',
  label: 'INI',
  languageId: 'ini',
  decode: (text) => parse(text),
  encode: (value) => stringify(requireKeyValue(value)),
};
