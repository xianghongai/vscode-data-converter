import assert from 'node:assert/strict';
import { test } from 'vitest';
import { sources, targets } from '@/formats';
import type { DecodeOptions, FormatId } from '@/types';

const codecById = (id: FormatId) => [...sources(), ...targets()].find((codec) => codec.id === id)!;

/** 部分解析器返回 null 原型对象，断言只关心数据本身 */
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const DECODE: DecodeOptions = { unresolvedValue: 'omit' };

/** 保留类型的格式：往返后应与原值完全一致 */
const TYPED = {
  json: { name: 'demo', count: 2, ok: true, tags: ['a', 'b'], nested: { deep: null }, unicode: '中文 🎉' },
  json5: { name: 'demo', count: 2, ok: true, tags: ['a', 'b'], nested: { deep: null }, unicode: '中文 🎉' },
  yaml: { name: 'demo', count: 2, ok: true, tags: ['a', 'b'], nested: { deep: null }, unicode: '中文 🎉' },
  toml: { name: 'demo', count: 2, ok: true, tags: ['a', 'b'], nested: { deep: 'x' }, unicode: '中文 🎉' },
  plist: { name: 'demo', count: 2, ok: true, tags: ['a', 'b'], unicode: '中文 🎉' },
};

/** 只表达字符串的格式：往返后应与原字符串映射一致 */
const FLAT = {
  ini: { name: 'demo', version: '1.0.0' },
  properties: { name: 'demo', version: '1.0.0' },
  env: { name: 'demo', version: '1.0.0' },
};

for (const [id, value] of Object.entries({ ...TYPED, ...FLAT }) as [FormatId, unknown][]) {
  test(`${id}: decode(encode(value)) 往返一致`, async () => {
    const codec = codecById(id);
    assert.deepEqual(plain(codec.decode!(await codec.encode!(value), DECODE)), value);
  });
}

test('xml: 往返后包裹一层根元素', async () => {
  const codec = codecById('xml');
  const value = { name: 'demo', version: 'v1' };
  assert.deepEqual(plain(codec.decode!(await codec.encode!(value), DECODE)), { root: value });
});

test('xml: 顶层数组包裹为 root/item', async () => {
  const codec = codecById('xml');
  assert.deepEqual(plain(codec.decode!(await codec.encode!(['a', 'b']), DECODE)), { root: { item: ['a', 'b'] } });
});

test('jsonc: 解析注释与尾随逗号', () => {
  assert.deepEqual(plain(codecById('jsonc').decode!('{\n  // 注释\n  "a": 1,\n}', DECODE)), { a: 1 });
});

test('jsonc: 语法错误如实抛出', () => {
  assert.throws(() => codecById('jsonc').decode!('{ "a": }', DECODE), /at offset/);
});

test('json-min: 输出不含空白', async () => {
  assert.equal(await codecById('json-min').encode!({ a: 1, b: [2] }), '{"a":1,"b":[2]}');
});

test('INI / .properties / .env 收到行数组时报错，而不是静默丢数据', () => {
  const rows = [{ name: 'demo', version: '1.0.0' }];

  for (const id of ['ini', 'properties', 'env'] as const) {
    assert.throws(() => codecById(id).encode!(rows), /Expected an object of key-value pairs/, id);
  }
});

test('plist 仍然支持数组（其格式本身可表达）', async () => {
  assert.match(await codecById('plist').encode!([{ a: '1' }]), /<array>/);
});
