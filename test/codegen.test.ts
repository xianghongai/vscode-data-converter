import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatConversions, targets } from '@/formats';

const conversions = formatConversions();
const run = (id: string, text: string) => conversions.find((item) => item.id === id)!.run(text);

const SAMPLE = JSON.stringify({ name: 'demo', port: 8080, debug: true, tags: ['a', 'b'], db: { host: 'x', ttl: 30 } });

/** 每个目标的标志性语法，以及默认会附带、配置后应当消失的序列化辅助代码 */
const EXPECTED = {
  typescript: { has: [/export interface Root/, /port:\s+number/], hasNot: [/class Convert/] },
  go: { has: [/type Root struct/, /Port\s+int64\s+`json:"port"`/], hasNot: [/func UnmarshalRoot/, /package main/] },
  rust: { has: [/pub struct Root/, /pub port: i64/, /derive\(/], hasNot: [/extern crate serde/] },
  python: { has: [/@dataclass/, /class Root:/, /port: int/], hasNot: [/def from_str/, /TypeVar/] },
  java: { has: [/public class Root/, /private long port;/], hasNot: [/class Converter/] },
  csharp: { has: [/public partial class Root/, /public long Port/], hasNot: [/JsonConvert/] },
};

for (const [id, { has, hasNot }] of Object.entries(EXPECTED)) {
  test(`JSON → ${id}：产出类型定义`, async () => {
    const output = await run(`json-to-${id}`, SAMPLE);

    for (const pattern of has) {
      assert.match(output, pattern);
    }

    for (const pattern of hasNot) {
      assert.doesNotMatch(output, pattern, '渲染选项未生效，输出仍含序列化辅助代码');
    }
  });
}

test('嵌套对象在每个目标里都生成了第二个类型', async () => {
  for (const id of Object.keys(EXPECTED)) {
    const output = await run(`json-to-${id}`, SAMPLE);
    assert.match(output, /\bDb|DB\b/, `${id} 缺少嵌套类型`);
  }
});

test('代码生成目标只作目标，不作来源', () => {
  const ids = new Set<string>(targets().map((codec) => codec.id));

  for (const id of Object.keys(EXPECTED)) {
    assert.ok(ids.has(id), `${id} 应在目标列表中`);
    assert.equal(
      conversions.some((item) => item.id.startsWith(`${id}-to-`)),
      false,
      `${id} 不应作为来源`
    );
  }
});

test('结果编辑器的 languageId 为对应语言', () => {
  const byId = Object.fromEntries(targets().map((codec) => [codec.id, codec.languageId]));
  assert.deepEqual(
    { go: byId.go, rust: byId.rust, python: byId.python, java: byId.java, csharp: byId.csharp },
    { go: 'go', rust: 'rust', python: 'python', java: 'java', csharp: 'csharp' }
  );
});
