# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v1.1.0 (2026-09-03)

- Bundle the extension with esbuild; `node_modules` is no longer shipped in the VSIX
- Unify packaging and publishing scripts to `vsce:package` and `vsce:publish`
- Migrate toolchain to oxlint, oxfmt, and Vitest

## v1.0.1 (2026-08-31)

### 变更

- 命令 ID `data-converter.convertFormat` 改为 `data-converter.convert`，绑定过快捷键的需要重新绑定；
- Query String 新增 `a[b]=1` 括号嵌套语法，双向支持。

### 修复

- `Text → Unicode Escape` 现在也转义反斜杠，此前含 `\u4e2d` 字面量的文本往返后会被误解码；
- JavaScript / TypeScript Object 求值器的多处缺陷：计算属性键、模板键、正则字面量、一元运算符、无初值声明；
- INI、`.properties`、`.env` 收到行数组时静默丢数据，现在与 CSV / TSV 一致报形状错误。

## v1.0.0 (2026-08-31)

首个版本。两条指令式入口，共 271 条转换，全部以扁平清单呈现，支持模糊搜索。

### 数据格式转换

`Data Convert: Convert Format...`：249 条，13 种来源 × 20 种目标，排除源与目标相同的恒等条目。

- 来源：JSON、JSONC、JSON5、YAML、TOML、XML、INI、`.properties`、`.env`、plist、CSV、TSV、JavaScript / TypeScript Object
- 目标：JSON、JSON (Minified)、JSON5、YAML、TOML、XML、INI、`.properties`、`.env`、plist、CSV、TSV，以及代码生成 TypeScript、JSON Schema、Zod、Go、Rust、Python、Java、C#

JSONC 与 JavaScript / TypeScript Object 只作来源，注释和表达式无法从数据本身还原；代码生成的 8 个目标只作目标，输出只含类型定义，不含序列化辅助代码。

JavaScript / TypeScript Object 接受对象或数组字面量，两种选法都可以：只选花括号及内容，或选中被 `export const` / `export default` / `module.exports` / `const` 包裹的完整语句。支持单引号、无引号键、尾随逗号、注释，以及 TypeScript 的 `as const`、`satisfies`、类型断言、非空断言。

### 数据编码转换

`Data Convert: Encode / Decode...`：22 条，纯文本到文本，不经过中间表示。

- Base64：`Text → Base64`、`Base64 → Text`、`Text → Base64URL`、`Base64URL → Text`
- URL：`Text → URL Encoded`、`URL Encoded → Text`
- Hex：`Text → Hex`、`Hex → Text`
- Unicode：`Text → Unicode Escape`、`Unicode Escape → Text`
- HTML / XML：`Text → HTML Entities`、`Text → HTML Entities (Minimal)`、`HTML Entities → Text`、`Text → XML Entities`、`XML Entities → Text`
- Query String：`Query String → JSON`、`JSON → Query String`
- JWT：`JWT → JSON`
- Hash：`Text → MD5`、`Text → SHA-1`、`Text → SHA-256`、`Text → SHA-512`

### 输入与输出

无选区时转换整个文档，有选区时只转换选区；结果在右侧的临时编辑器中打开，按目标格式高亮，可继续编辑或另存。

### 配置

- `data-converter.jsObject.unresolvedValue`：JavaScript / TypeScript 对象中无法静态求值的表达式如何处理：`omit`（默认，省略该键）、`source`（保留源码文本作字符串）、`null`。

### 约定

转换按所选条目的规则执行，不做来源格式的自动探测，也不对输入做校验或兜底。输入不符合所选来源格式时，解析器的报错原样提示。

跨格式转换存在固有的表达力差异，不做额外补偿：注释不会保留；`.env`、`.properties`、INI、CSV、TSV 只表达字符串；XML 输出统一包一层 `<root>`；TOML 顶层必须是表；CSV / TSV 要求数据是行数组。
