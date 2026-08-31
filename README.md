# Data Converter (Visual Studio Code)

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

[中文文档](./README_CN.md)

Convert data formats and encodings inside the editor. The result opens in a scratch editor beside the source. Command Palette only, no UI.

## Usage

1. Open a file or an untitled buffer. Select a fragment if you only want to convert part of it.
2. Press `Cmd/Ctrl+Shift+P` and run `Data Converter: Convert Format...` (data formats) or `Data Converter: Encode / Decode...` (encodings).
3. Pick an entry from the list, such as `YAML → JSON`. The list is fuzzy-searchable — type `yamljson` to jump straight to it.

With no selection the whole document is converted; with a selection only the selection is.

## Data format conversion

`Data Converter: Convert Format...`

| Direction | Formats                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| As source | JSON, JSONC, JSON5, YAML, TOML, XML, INI, `.properties`, `.env`, plist, CSV, TSV, JavaScript / TypeScript Object                                     |
| As target | JSON, JSON (Minified), JSON5, YAML, TOML, XML, INI, `.properties`, `.env`, plist, CSV, TSV, TypeScript, JSON Schema, Zod, Go, Rust, Python, Java, C# |

### Code generation

Type definitions are inferred from your sample data, targeting TypeScript, JSON Schema, Zod, Go, Rust, Python, Java and C#. The output contains type definitions only, without the serialization helpers each language would otherwise ship with.

Inference is driven entirely by the sample: whether a field is optional, how wide a numeric type is — all of it comes from the data you give it. The closer your sample is to real data, the better the result.

## Encoding conversion

`Data Converter: Encode / Decode...`

| Group        | Entries                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Base64       | `Text → Base64`, `Base64 → Text`, `Text → Base64URL`, `Base64URL → Text`                                                       |
| URL          | `Text → URL Encoded`, `URL Encoded → Text`                                                                                     |
| Hex          | `Text → Hex`, `Hex → Text`                                                                                                     |
| Unicode      | `Text → Unicode Escape`, `Unicode Escape → Text`                                                                               |
| HTML / XML   | `Text → HTML Entities`, `Text → HTML Entities (Minimal)`, `HTML Entities → Text`, `Text → XML Entities`, `XML Entities → Text` |
| Query String | `Query String → JSON`, `JSON → Query String`                                                                                   |
| JWT          | `JWT → JSON`                                                                                                                   |
| Hash         | `Text → MD5`, `Text → SHA-1`, `Text → SHA-256`, `Text → SHA-512`                                                               |

These are plain text-to-text transforms and do not go through an intermediate representation. A few conventions:

- `Query String → JSON` accepts a whole URL — everything after `?` is used. Repeated keys collapse into an array, and `JSON → Query String` expands arrays back into repeated keys.
- `Text → Unicode Escape` escapes non-ASCII characters only, with emoji escaped one code unit at a time as surrogate pairs. Decoding accepts both `\uXXXX` and `\u{XXXXX}`.
- `Text → HTML Entities` also turns non-ASCII into numeric references (`中` → `&#x4e2d;`); `(Minimal)` escapes only `&<>"'` and leaves CJK and emoji intact. `HTML Entities → Text` reverses both.
- `JWT → JSON` decodes the header and payload only. **It does not verify the signature** — the signature segment is passed through untouched.
- Hashes are one-way, so they run in a single direction and output lowercase hex. The input is not preprocessed, so newlines inside your selection count toward the digest (matching `md5sum`). MD5 and SHA-1 are no longer collision-resistant; use them for checksums and legacy compatibility, not for security.

## Settings

| Setting                                   | Default | Description                                                                                                                                                                                 |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-converter.jsObject.unresolvedValue` | `omit`  | What to do with expressions in a JavaScript / TypeScript object that cannot be evaluated statically: `omit` drops the key, `source` keeps the source text as a string, `null` writes `null` |

## How it behaves

Conversions run exactly the rule you picked. There is no source-format detection, and no validation or fallback on the input: if you choose `TOML → JSON`, the input is expected to be TOML. When it isn't, the parser's own error is reported verbatim.

Formats differ in what they can express, and the extension does not compensate for the gaps:

- Comments are not preserved — the intermediate representation carries data only.
- `.env` and `.properties` express strings only, so numbers and booleans come back as strings, and nested values in `.env` are serialized to JSON strings.
- XML output is always wrapped in a single `<root>` element, with a top-level array wrapped once more in `<item>`.
- TOML requires a table at the top level, so `smol-toml` reports an error when the source is an array.
- CSV / TSV need an array of rows (`[{...}, {...}]`); a flat object will not convert. Cells hold scalars only, nested values are serialized to JSON strings, and parsed values are always strings — no type inference.

## License 📃

MIT License
