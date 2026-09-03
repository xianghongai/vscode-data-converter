# Repository Guidelines

## Project Structure & Module Organization

This repository contains a bundled TypeScript VS Code extension that converts data between formats. `src/extension.ts` is the activation entry and command registry. `src/types.ts` defines the two core abstractions: `Codec` (one data format's `decode`/`encode` pair) and `Conversion` (one entry in the flat conversion list the command layer renders). `src/formats/` holds one codec per format plus `index.ts`, which builds the conversion list from the cartesian product of sources and targets, minus the identity pairs. `src/encoding/index.ts` is the second capability domain — plain text-to-text transforms registered by hand, with no intermediate representation. `src/quick-pick.ts` and `src/output.ts` are the only modules that touch the VS Code API besides the entry point. The Marketplace icon is stored in `art/`. English and Simplified Chinese manifest strings live in `package.nls.json` and `package.nls.zh-cn.json`; `README.md` is English and `README.zh-CN.md` is its Simplified Chinese counterpart, and the two must be kept in step section by section. Vitest tests are under `test/`, written in TypeScript alongside the sources, with per-format samples in `test/fixtures/`. `dist/` is generated and must not be edited manually.

## Build, Test, and Development Commands

- `pnpm install` installs the pinned toolchain and refreshes `pnpm-lock.yaml` when dependencies change.
- `pnpm run compile` type-checks, lints, and creates an unminified development bundle with a sourcemap.
- `pnpm run watch:esbuild` rebuilds on change; `pnpm run watch:tsc` type-checks on change; `pnpm run watch` starts both in parallel (pnpm matches the `watch:` prefix, so the official template's `npm-run-all` dependency is not needed). All are for a manual terminal loop, not wired into F5.
- `pnpm test` runs the Node test suite.
- `pnpm run lint` runs oxlint over `src` and `test`; `pnpm run format` runs oxfmt and `pnpm run format:check` verifies formatting; `pnpm run check-types` type-checks sources and tests (`noEmit`; esbuild does the emitting).
- `pnpm run package` type-checks, lints, and creates the minified production bundle; `vscode:prepublish` cleans and calls it. The name follows the official VS Code esbuild guide, where `package` means the production build.
- `pnpm run vsce:package` creates a VSIX locally; never run `vsce:publish` without explicit release authorization.

## Design Constraints

The extension converts exactly what the developer picked from the list. Do not add source-format auto-detection, input validation, lossy-conversion warnings, structural fallbacks, or retry-with-another-parser logic — when the input does not match the chosen source format, the parser's own error is surfaced verbatim. Format-specific encoding rules (quoting a `.env` value, wrapping XML in a root element) are core correctness and belong in the codec; guarding against input the developer promised not to provide does not. Add a setting only when one is explicitly requested.

Prefer a library call over hand-written logic. Dependency size is not a constraint; the amount of code in this repository is. When a feature would need a large hand-written parser, AST walker, or mapping table, look for a package that already does it — and if none exists, drop the feature rather than writing it. Markdown tables and HTML tables were dropped for exactly this reason: nothing maintained parses a Markdown table, and nothing maintained renders rows as an HTML table.

Adding a format means adding one file under `src/formats/` and one entry in the `codecs` array — nothing else. A new code-generation target is one `codegen(...)` line in `src/formats/codegen.ts`; every quicktype language is already in the bundle, so this costs no bundle size. Check the target's `optionDefinitions` first — most languages strip serialization helpers with `just-types`, but Rust has no such option and needs `leading-comments: false`. `delimited.ts` is the one file holding two codecs, because CSV and TSV differ only by delimiter. Adding an entry to the encoding domain means one line in the `groups` table in `src/encoding/index.ts`. Adding a whole capability domain means a module that exports `Conversion[]` plus one command registered in `src/extension.ts`; the QuickPick and output layers stay untouched, as they did when the encoding domain was added.

Codec options travel as parameters, never through `vscode`: `formatConversions(options)` receives `DecodeOptions` from `src/extension.ts` and passes it to `decode`. `src/formats/**` must never import `vscode` — the tests run those modules directly.

TypeScript _types_ are out of scope. `src/formats/js-object.ts` parses TypeScript syntax only to skip past it and reach the object literal; nothing in this extension resolves, checks, or converts a type. A type declaration is not a value, and making it one requires the TypeScript compiler — which was tried and removed: the selection has to be self-contained, `import` statements cannot be resolved, and any reference to a type outside the selection fails. Do not reintroduce it.

## Bundling

`esbuild.js` at the repo root drives the build through esbuild's JS API, following the layout the official `yo code` esbuild template uses: `node esbuild.js` for development, `--production` to minify and drop the sourcemap, `--watch` to stay resident. Everything is bundled except `vscode`, so a new dependency needs no build-side registration.

Two options are load-bearing. `mainFields: ['module', 'main']` makes esbuild prefer each package's ESM entry — without it, `jsonc-parser`'s UMD wrapper reaches `require` through a variable, which esbuild cannot follow, and the bundle throws `Cannot find module './impl/format'` at load time. `external: ['vscode']` keeps the editor API out of the bundle, where the host provides it. The `@/` alias needs no configuration: esbuild reads `paths` from `tsconfig.json`.

`vscode:prepublish` cleans before building, because a production build emits no sourcemap and would otherwise leave a stale one from an earlier `compile` in `dist/`.

F5 runs `npm: compile` as a one-shot `preLaunchTask` — VS Code auto-detects npm scripts, so no `tasks.json` is needed. There is deliberately no background watch task and no esbuild problem-matcher plugin: those exist only so VS Code can tell when a long-running build has settled before launching the host, and that handshake is worth neither the third-party matcher extension nor the plugin when reloading the Extension Development Host by hand works. For an incremental loop, run `pnpm run watch:esbuild` (and optionally `pnpm run watch:tsc`) in a terminal and reload the host window after each change.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, semicolons, LF endings, and a 120-character line limit. oxfmt, EditorConfig, oxlint, and strict TypeScript define the source style. Explicit `any` is forbidden; accept uncertain external values as `unknown` and narrow them at the boundary. Use camelCase for functions and variables, PascalCase for types, and `data-converter.<action>` for command IDs. Import from `@/` rather than deep relative paths.

## Testing Guidelines

Tests run on Vitest (`pnpm test` → `vitest run`). Name them `*.test.ts` and keep fixtures under `test/fixtures/`. They are TypeScript like the sources and are covered by `tsconfig.json`'s `include`, so `pnpm run check-types` catches a test that calls a codec the wrong way instead of leaving it to fail at runtime — `Codec.decode` and `Codec.encode` are optional, so tests assert them with `!` when addressing a codec by id. `vitest.config.mts` maps the `@/` alias, which Vitest does not pick up from `tsconfig.json` on its own; that config is `.mts` because the package is CommonJS — `"type": "module"` would break the CJS extension bundle. Every new codec needs a round-trip case in `test/formats.test.ts` and a sample in `test/fixtures/samples.ts`, which the matrix test in `test/conversions.test.ts` runs against every target. Run `pnpm test`, `pnpm run lint`, `pnpm run format:check`, and `pnpm run check-types` before review.

## Commit & Pull Request Guidelines

History follows Conventional Commit-style prefixes such as `feat:`, `fix:`, `chore:`, `build:`, `doc:`, and `i18n:`. Keep commits focused. Pull requests should explain user impact, link relevant issues, and list verification commands. Keep `engines.vscode` aligned with the exact `@types/vscode` baseline, and verify with `vsce ls` that `.vscodeignore` keeps tests, sources, credentials, and build configuration out of the VSIX.
