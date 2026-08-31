import { parse } from 'dotenv';
import type { Codec } from '@/types';

/** 无需引号的裸值字符集 */
const BARE_VALUE = /^[A-Za-z0-9_./:@-]*$/;

function encodeValue(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return BARE_VALUE.test(text) ? text : JSON.stringify(text);
}

export const env: Codec = {
  id: 'env',
  label: '.env',
  languageId: 'properties',
  decode: (text) => parse(text),
  encode: (value) =>
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}=${encodeValue(item)}`)
      .join('\n') + '\n',
};
