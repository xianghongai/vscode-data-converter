import { DEFAULT_DECODE_OPTIONS, type Codec, type Conversion, type DecodeOptions } from '@/types';
import { csharp, go, java, jsonSchema, python, rust, typescript, zod } from './codegen';
import { csv, tsv } from './delimited';
import { env } from './env';
import { ini } from './ini';
import { jsObject } from './js-object';
import { json, jsonMinified } from './json';
import { json5 } from './json5';
import { jsonc } from './jsonc';
import { plist } from './plist';
import { properties } from './properties';
import { toml } from './toml';
import { xml } from './xml';
import { yaml } from './yaml';

/** 数组顺序即清单展示顺序 */
const codecs: Codec[] = [
  json,
  jsonMinified,
  jsonc,
  json5,
  yaml,
  toml,
  xml,
  ini,
  properties,
  env,
  plist,
  csv,
  tsv,
  jsObject,
  typescript,
  jsonSchema,
  zod,
  go,
  rust,
  python,
  java,
  csharp,
];

export const sources = (): Codec[] => codecs.filter((codec) => codec.decode);

export const targets = (): Codec[] => codecs.filter((codec) => codec.encode);

/**
 * 由编解码器表的笛卡尔积生成完整的格式转换清单。
 *
 * 排除源与目标相同的恒等条目，那等同于格式化，编辑器本身已经提供。
 */
export function formatConversions(options: DecodeOptions = DEFAULT_DECODE_OPTIONS): Conversion[] {
  return sources().flatMap((from) =>
    targets()
      .filter((to) => to.id !== from.id)
      .map((to) => ({
        id: `${from.id}-to-${to.id}`,
        label: `${from.label} → ${to.label}`,
        group: from.label,
        languageId: to.languageId,
        run: (text: string) => to.encode!(from.decode!(text, options)),
      }))
  );
}
