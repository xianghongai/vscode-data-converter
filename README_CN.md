# Data Convert (Visual Studio Code)

<p>
  <a href="https://github.com/xianghongai/vscode-data-converter">
    <img src="https://img.shields.io/github/repo-size/xianghongai/vscode-data-converter?color=4ac51c&style=plastic" alt="Repo Size">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-data-converter">
    <img src="https://vsmarketplacebadges.dev/version/nicholashsiang.vscode-data-converter.svg?style=plastic&color=4ac51c" alt="Visual Studio Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-data-converter">
    <img src="https://vsmarketplacebadges.dev/downloads-short/nicholashsiang.vscode-data-converter.svg?style=plastic&color=4ac51c" alt="Downloads">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=nicholashsiang.vscode-data-converter">
    <img src="https://vsmarketplacebadges.dev/rating-short/nicholashsiang.vscode-data-converter.svg?style=plastic&color=4ac51c" alt="Rating">
  </a>
  <a href="https://github.com/xianghongai/vscode-data-converter/blob/HEAD/LICENSE">
    <img src="https://img.shields.io/github/license/xianghongai/vscode-data-converter?color=4ac51c&style=plastic" alt="License">
  </a>
</p>

[English](./README.md)

在编辑器里做数据格式转换与编码转换，结果在右侧的临时编辑器中打开。纯指令式，无图形界面。

## 使用

1. 打开文件或临时文件；需要只转换其中一段时，选中它；
2. `Cmd/Ctrl+Shift+P` 执行 `Data Convert: Convert Format...`（数据格式）或 `Data Convert: Encode / Decode...`（编码）；
3. 在清单中选择转换条目，比如 `YAML → JSON`。清单支持模糊搜索，输入 `yamljson` 可直达。

无选区时转换整个文档，有选区时只转换选区。

## 数据格式转换

`Data Convert: Convert Format...`

| 方向     | 格式                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 可作来源 | JSON、JSONC、JSON5、YAML、TOML、XML、INI、`.properties`、`.env`、plist、CSV、TSV、JavaScript / TypeScript Object                                     |
| 可作目标 | JSON、JSON (Minified)、JSON5、YAML、TOML、XML、INI、`.properties`、`.env`、plist、CSV、TSV、TypeScript、JSON Schema、Zod、Go、Rust、Python、Java、C# |

### 代码生成

由样本数据推断类型定义，目标为 TypeScript、JSON Schema、Zod、Go、Rust、Python、Java、C#。输出只含类型定义，不含各语言默认附带的序列化辅助代码。

推断依据是样本本身：字段是否可选、数值类型宽窄，都取决于给的数据。样本越贴近真实数据，结果越准。

## 编码转换

`Data Convert: Encode / Decode...`

| 分组         | 条目                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Base64       | `Text → Base64`、`Base64 → Text`、`Text → Base64URL`、`Base64URL → Text`                                                       |
| URL          | `Text → URL Encoded`、`URL Encoded → Text`                                                                                     |
| Hex          | `Text → Hex`、`Hex → Text`                                                                                                     |
| Unicode      | `Text → Unicode Escape`、`Unicode Escape → Text`                                                                               |
| HTML / XML   | `Text → HTML Entities`、`Text → HTML Entities (Minimal)`、`HTML Entities → Text`、`Text → XML Entities`、`XML Entities → Text` |
| Query String | `Query String → JSON`、`JSON → Query String`                                                                                   |
| JWT          | `JWT → JSON`                                                                                                                   |
| Hash         | `Text → MD5`、`Text → SHA-1`、`Text → SHA-256`、`Text → SHA-512`                                                               |

这一族是纯文本到文本的变换，不经过中间表示。几处约定：

- `Query String → JSON` 可以直接粘整条 URL，取 `?` 之后的部分；重复键收成数组，`JSON → Query String` 再把数组展开成重复键；括号语法双向支持，`a[b]=1` 解析为嵌套对象；
- `Text → Unicode Escape` 转义非 ASCII 字符与反斜杠，emoji 按代理对逐个码元转义。反斜杠必须转义变换才可逆 —— 否则原文里本来就有的 `\u4e2d` 字面量会在解码时变成字符。解码接受 `\\`、`\uXXXX` 与 `\u{XXXXX}`；
- `Text → HTML Entities` 会把非 ASCII 一并转成数字引用（`中` → `&#x4e2d;`）；`(Minimal)` 只转义 `&<>"'`，保留中文与 emoji。两者都由 `HTML Entities → Text` 还原；
- `JWT → JSON` 只解码头部与载荷，**不校验签名**，签名段原样输出；
- Hash 是单向的，只有一个方向，输出小写十六进制。输入不做预处理，选区里的换行会参与计算（与 `md5sum` 一致）。MD5 与 SHA-1 已不具备抗碰撞性，供校验和与兼容旧系统用，不要用于安全场景。

## 配置

| 配置项                                    | 默认   | 说明                                                                                                                           |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `data-converter.jsObject.unresolvedValue` | `omit` | JavaScript / TypeScript 对象中无法静态求值的表达式如何处理：`omit` 省略该键、`source` 保留源码文本作字符串、`null` 输出 `null` |

## 约定

转换按所选条目的规则执行，不做来源格式的自动探测，也不对输入做校验或兜底：选了 `TOML → JSON`，输入就应当是 TOML。输入不符合所选来源格式时，解析器的报错会原样提示。

跨格式转换存在固有的表达力差异，扩展不对此做额外补偿：

- 注释不会保留 —— 中间表示只承载数据；
- `.env`、`.properties` 只表达字符串，数值与布尔会变成字符串；`.env` 的嵌套值会被序列化为 JSON 字符串；
- XML 输出统一包一层 `<root>`，顶层数组再包一层 `<item>`；
- TOML 的顶层必须是表，来源是数组时 `smol-toml` 会报错；
- CSV / TSV 要求数据是行数组（`[{...}, {...}]`），扁平对象转不过去；单元格只能是标量，嵌套值会序列化成 JSON 字符串；解析结果一律是字符串，不做类型推断。

## License 📃

MIT License
