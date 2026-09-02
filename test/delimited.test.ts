import assert from 'node:assert/strict';
import { test } from 'vitest';
import { csv, tsv } from '@/formats/delimited';
import type { Codec, DecodeOptions } from '@/types';

const DECODE: DecodeOptions = { unresolvedValue: 'omit' };
const ROWS = [
  { name: 'demo', version: '1.0.0' },
  { name: 'other', version: '2.0.0' },
];

const cases: [Codec, string, string][] = [
  [csv, ',', 'CSV'],
  [tsv, '\t', 'TSV'],
];

for (const [codec, delimiter, label] of cases) {
  // 分隔符格式的编解码都是同步的
  const encode = (value: unknown) => codec.encode!(value) as string;
  const decode = (text: string) => codec.decode!(text, DECODE);

  test(`${label}: 往返一致`, () => {
    assert.deepEqual(decode(encode(ROWS)), ROWS);
  });

  test(`${label}: 使用正确的分隔符`, () => {
    assert.equal(encode(ROWS).split('\n')[0], `name${delimiter}version`);
  });

  test(`${label}: 目标不是数组时报错`, () => {
    assert.throws(() => encode({ name: 'demo' }), /Expected an array of rows/);
  });

  test(`${label}: 嵌套值序列化成 JSON 字符串`, () => {
    const decoded = decode(encode([{ a: { deep: 1 }, b: [1, 2] }]));
    assert.deepEqual(decoded, [{ a: '{"deep":1}', b: '[1,2]' }]);
  });

  test(`${label}: 单元格里的分隔符与换行被正确转义`, () => {
    const tricky = [{ text: `x${delimiter}y "z"`, note: 'line1\nline2' }];
    assert.deepEqual(decode(encode(tricky)), tricky);
  });

  test(`${label}: 所有值都是字符串，不做类型推断`, () => {
    const decoded = decode(`n${delimiter}ok\n1${delimiter}true\n`);
    assert.deepEqual(decoded, [{ n: '1', ok: 'true' }]);
  });

  test(`${label}: 列数不匹配时如实抛出`, () => {
    assert.throws(() => decode(`a${delimiter}b\n1\n`), /fields/i);
  });
}

test('单列 CSV 不会被误报为无法识别分隔符', () => {
  assert.deepEqual(csv.decode!('name\ndemo\n', DECODE), [{ name: 'demo' }]);
});

test('CSV 与 TSV 互转', () => {
  assert.equal(tsv.encode!(csv.decode!('a,b\n1,2\n', DECODE)), 'a\tb\n1\t2\n');
});

// ── 经由完整清单验证表格类目标的真实路径 ──

const { formatConversions } = await import('@/formats');
const conversions = formatConversions();
const convert = (id: string, text: string) => conversions.find((item) => item.id === id)!.run(text) as string;

test('JSON → CSV：行数组转成表格', () => {
  assert.equal(convert('json-to-csv', JSON.stringify(ROWS)), 'name,version\ndemo,1.0.0\nother,2.0.0\n');
});

test('YAML → TSV：行数组转成表格', () => {
  assert.equal(convert('yaml-to-tsv', '- name: demo\n  version: "1.0.0"\n'), 'name\tversion\ndemo\t1.0.0\n');
});

test('CSV → JSON', () => {
  assert.deepEqual(JSON.parse(convert('csv-to-json', 'name,version\ndemo,1.0.0\n')), [
    { name: 'demo', version: '1.0.0' },
  ]);
});

test('CSV → YAML', () => {
  assert.equal(convert('csv-to-yaml', 'name,version\ndemo,1.0.0\n'), '- name: demo\n  version: 1.0.0\n');
});

test('CSV → TypeScript：由表格生成类型', async () => {
  const output = await convert('csv-to-typescript', 'name,version\ndemo,1.0.0\n');
  assert.match(output, /export interface Root/);
});
