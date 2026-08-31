import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import type { Codec } from '@/types';

export const jsonc: Codec = {
  id: 'jsonc',
  label: 'JSONC',
  languageId: 'jsonc',
  decode: (text) => {
    const errors: ParseError[] = [];
    const value = parse(text, errors, { allowTrailingComma: true });

    if (errors.length > 0) {
      const [{ error, offset }] = errors;
      throw new Error(`${printParseErrorCode(error)} at offset ${offset}`);
    }

    return value;
  },
};
