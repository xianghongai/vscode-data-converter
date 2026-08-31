import { parse, stringify } from 'smol-toml';
import type { Codec } from '@/types';

export const toml: Codec = {
  id: 'toml',
  label: 'TOML',
  languageId: 'plaintext',
  decode: (text) => parse(text),
  encode: (value) => `${stringify(value)}\n`,
};
