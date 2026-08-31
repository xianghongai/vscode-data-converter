import Papa from 'papaparse';
import type { Codec } from '@/types';

const COMMA = ',';
const TAB = '\t';

function decodeWith(delimiter: string) {
  return (text: string): unknown => {
    const { data, errors } = Papa.parse<Record<string, string>>(text.trim(), {
      delimiter,
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      const [{ message, row }] = errors;
      throw new Error(row === undefined ? message : `${message} (row ${row + 1})`);
    }

    return data;
  };
}

/** 分隔符格式的单元格只能是标量，嵌套值序列化成 JSON 字符串 */
function toCell(value: unknown): unknown {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
}

function encodeWith(delimiter: string) {
  return (value: unknown): string => {
    if (!Array.isArray(value)) {
      throw new Error('Expected an array of rows');
    }

    const rows = value.map((row) =>
      Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, item]) => [key, toCell(item)]))
    );

    return `${Papa.unparse(rows, { delimiter, newline: '\n' })}\n`;
  };
}

export const csv: Codec = {
  id: 'csv',
  label: 'CSV',
  languageId: 'csv',
  decode: decodeWith(COMMA),
  encode: encodeWith(COMMA),
};

export const tsv: Codec = {
  id: 'tsv',
  label: 'TSV',
  languageId: 'tsv',
  decode: decodeWith(TAB),
  encode: encodeWith(TAB),
};
