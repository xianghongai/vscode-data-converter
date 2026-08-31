import { build, parse } from 'plist';
import type { Codec } from '@/types';

export const plist: Codec = {
  id: 'plist',
  label: 'plist',
  languageId: 'xml',
  decode: (text) => parse(text),
  encode: (value) => `${build(value as never)}\n`,
};
