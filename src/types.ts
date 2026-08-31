/**
 * 支持的数据格式标识
 */
export type FormatId =
  | 'json'
  | 'json-min'
  | 'jsonc'
  | 'json5'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'ini'
  | 'properties'
  | 'env'
  | 'plist'
  | 'csv'
  | 'tsv'
  | 'js-object'
  | 'typescript'
  | 'json-schema'
  | 'zod'
  | 'go'
  | 'rust'
  | 'python'
  | 'java'
  | 'csharp';

/** 无法求值的 JS 表达式如何处理 */
export type UnresolvedValueStrategy = 'omit' | 'source' | 'null';

export interface DecodeOptions {
  unresolvedValue: UnresolvedValueStrategy;
}

export const DEFAULT_DECODE_OPTIONS: DecodeOptions = { unresolvedValue: 'omit' };

/**
 * 单个数据格式的编解码器。
 *
 * 缺省 `decode` 表示该格式只能作为转换目标（如代码生成）；
 * 缺省 `encode` 表示该格式只能作为转换来源（如 JSONC、JavaScript Object）。
 */
export interface Codec {
  id: FormatId;
  /** 清单中展示的名称，如 `YAML` */
  label: string;
  /** 结果编辑器使用的 VS Code language id */
  languageId: string;
  decode?(text: string, options: DecodeOptions): unknown;
  encode?(value: unknown): string | Promise<string>;
}

/**
 * 转换清单中的一个条目。
 *
 * 命令层只认识这个结构，不关心条目由格式编解码器笛卡尔积生成，
 * 还是由后续的编码转换能力域手写注册。
 */
export interface Conversion {
  /** 唯一标识，如 `json-to-yaml` */
  id: string;
  /** 清单中展示的标题，如 `JSON → YAML` */
  label: string;
  /** 清单中的分组名，用作 QuickPick 分隔符文案 */
  group: string;
  /** 结果编辑器使用的 VS Code language id */
  languageId: string;
  run(text: string): string | Promise<string>;
}

/** 统一的输出缩进 */
export const INDENT = 2;
