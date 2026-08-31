import { InputData, jsonInputForTargetLanguage, quicktype, type RendererOptions } from 'quicktype-core';
import type { Codec, FormatId } from '@/types';

/** 本扩展用到的 quicktype 目标语言 */
type Language = 'typescript' | 'json-schema' | 'typescript-zod' | 'go' | 'rust' | 'python' | 'java' | 'cs';

const ROOT_NAME = 'Root';

async function generate(value: unknown, lang: Language, rendererOptions: RendererOptions = {}): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage(lang);
  await jsonInput.addSource({ name: ROOT_NAME, samples: [JSON.stringify(value)] });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const { lines } = await quicktype({ inputData, lang, rendererOptions });
  return `${lines.join('\n')}\n`;
}

/**
 * 代码生成目标只作转换目标，没有 `decode`。
 *
 * `rendererOptions` 用来去掉各语言默认附带的序列化辅助代码，只留类型定义。
 * 大多数语言用 `just-types`，Rust 没有这个选项，改用 `leading-comments`。
 */
const codegen = (
  id: FormatId,
  label: string,
  languageId: string,
  lang: Language,
  rendererOptions: RendererOptions = {}
): Codec => ({
  id,
  label,
  languageId,
  encode: (value) => generate(value, lang, rendererOptions),
});

export const typescript = codegen('typescript', 'TypeScript', 'typescript', 'typescript', { 'just-types': true });
export const jsonSchema = codegen('json-schema', 'JSON Schema', 'json', 'json-schema');
export const zod = codegen('zod', 'Zod', 'typescript', 'typescript-zod');
export const go = codegen('go', 'Go', 'go', 'go', { 'just-types': true });
export const rust = codegen('rust', 'Rust', 'rust', 'rust', { 'leading-comments': false });
export const python = codegen('python', 'Python', 'python', 'python', { 'just-types': true });
export const java = codegen('java', 'Java', 'java', 'java', { 'just-types': true });
export const csharp = codegen('csharp', 'C#', 'csharp', 'cs', { 'just-types': true });
