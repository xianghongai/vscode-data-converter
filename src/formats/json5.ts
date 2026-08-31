import JSON5 from 'json5';
import { INDENT, type Codec } from '@/types';

export const json5: Codec = {
  id: 'json5',
  label: 'JSON5',
  languageId: 'json5',
  decode: (text) => JSON5.parse(text),
  encode: (value) => `${JSON5.stringify(value, null, INDENT)}\n`,
};
