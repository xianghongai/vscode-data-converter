import { build, parse, type PlistValue } from 'plist';
import type { Codec } from '@/types';

export const plist: Codec = {
  id: 'plist',
  label: 'plist',
  languageId: 'xml',
  decode: (text) => parse(text),
  encode: (value) => `${build(value as PlistValue)}\n`,
};
