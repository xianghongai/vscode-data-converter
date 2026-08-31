import { INDENT, type Codec } from '@/types';

export const json: Codec = {
  id: 'json',
  label: 'JSON',
  languageId: 'json',
  decode: (text) => JSON.parse(text),
  encode: (value) => `${JSON.stringify(value, null, INDENT)}\n`,
};

export const jsonMinified: Codec = {
  id: 'json-min',
  label: 'JSON (Minified)',
  languageId: 'json',
  encode: (value) => JSON.stringify(value),
};
