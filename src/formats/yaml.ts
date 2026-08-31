import { parse, stringify } from 'yaml';
import { INDENT, type Codec } from '@/types';

export const yaml: Codec = {
  id: 'yaml',
  label: 'YAML',
  languageId: 'yaml',
  decode: (text) => parse(text),
  encode: (value) => stringify(value, { indent: INDENT, lineWidth: 0 }),
};
