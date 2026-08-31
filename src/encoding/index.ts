import { createHash } from 'node:crypto';
import { decodeHTML, decodeXML, encodeHTML, encodeXML, escapeUTF8 } from 'entities';
import type { Conversion } from '@/types';

const JSON_INDENT = 2;

type Transform = (text: string) => string;

interface Entry {
  label: string;
  languageId?: string;
  run: Transform;
}

/** 非 ASCII 字符转 `\uXXXX`，代理对逐个码元转义 */
const toUnicodeEscape: Transform = (text) =>
  text.replace(/[^\x20-\x7E]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);

const fromUnicodeEscape: Transform = (text) =>
  text.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, braced, plain) =>
    String.fromCodePoint(Number.parseInt(braced ?? plain, 16))
  );

/** 允许直接粘整条 URL，取 `?` 之后的部分 */
const queryStringToJson: Transform = (text) => {
  const params = new URLSearchParams(text.trim().replace(/^[^?]*\?/, ''));
  const result: Record<string, string | string[]> = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }

  return `${JSON.stringify(result, null, JSON_INDENT)}\n`;
};

const jsonToQueryString: Transform = (text) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(JSON.parse(text) as Record<string, unknown>)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, String(item));
    }
  }

  return params.toString();
};

/** 摘要是单向的，只有 `Text → X` 一个方向 */
const digest =
  (algorithm: string): Transform =>
  (text) =>
    createHash(algorithm).update(text, 'utf8').digest('hex');

/** 只解码，不校验签名 */
const jwtToJson: Transform = (text) => {
  const [header, payload, signature] = text.trim().split('.');
  const part = (segment: string) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as unknown;

  return `${JSON.stringify({ header: part(header), payload: part(payload), signature }, null, JSON_INDENT)}\n`;
};

/** 分组顺序即清单展示顺序 */
const groups: Record<string, Entry[]> = {
  Base64: [
    { label: 'Text → Base64', run: (text) => Buffer.from(text, 'utf8').toString('base64') },
    { label: 'Base64 → Text', run: (text) => Buffer.from(text.trim(), 'base64').toString('utf8') },
    { label: 'Text → Base64URL', run: (text) => Buffer.from(text, 'utf8').toString('base64url') },
    { label: 'Base64URL → Text', run: (text) => Buffer.from(text.trim(), 'base64url').toString('utf8') },
  ],
  URL: [
    { label: 'Text → URL Encoded', run: encodeURIComponent },
    { label: 'URL Encoded → Text', run: decodeURIComponent },
  ],
  Hex: [
    { label: 'Text → Hex', run: (text) => Buffer.from(text, 'utf8').toString('hex') },
    { label: 'Hex → Text', run: (text) => Buffer.from(text.trim(), 'hex').toString('utf8') },
  ],
  Unicode: [
    { label: 'Text → Unicode Escape', run: toUnicodeEscape },
    { label: 'Unicode Escape → Text', run: fromUnicodeEscape },
  ],
  'HTML / XML': [
    { label: 'Text → HTML Entities', run: encodeHTML },
    { label: 'Text → HTML Entities (Minimal)', run: escapeUTF8 },
    { label: 'HTML Entities → Text', run: decodeHTML },
    { label: 'Text → XML Entities', run: encodeXML },
    { label: 'XML Entities → Text', run: decodeXML },
  ],
  'Query String': [
    { label: 'Query String → JSON', languageId: 'json', run: queryStringToJson },
    { label: 'JSON → Query String', run: jsonToQueryString },
  ],
  JWT: [{ label: 'JWT → JSON', languageId: 'json', run: jwtToJson }],
  Hash: [
    { label: 'Text → MD5', run: digest('md5') },
    { label: 'Text → SHA-1', run: digest('sha1') },
    { label: 'Text → SHA-256', run: digest('sha256') },
    { label: 'Text → SHA-512', run: digest('sha512') },
  ],
};

/**
 * 编码转换清单。
 *
 * 与格式转换不同，这一族是纯文本到文本的变换，不经过中间表示。
 */
export function encodingConversions(): Conversion[] {
  return Object.entries(groups).flatMap(([group, entries]) =>
    entries.map(({ label, languageId, run }) => ({
      id: label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      label,
      group,
      languageId: languageId ?? 'plaintext',
      run,
    }))
  );
}
