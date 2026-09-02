import assert from 'node:assert/strict';
import { test } from 'vitest';
import { jsObject } from '@/formats/js-object';
import type { DecodeOptions } from '@/types';

const OMIT: DecodeOptions = { unresolvedValue: 'omit' };
const SOURCE: DecodeOptions = { unresolvedValue: 'source' };
const NULLIFY: DecodeOptions = { unresolvedValue: 'null' };

const decode = (text: string, options: DecodeOptions = OMIT) => jsObject.decode!(text, options);

test('单引号、无引号键、尾随逗号', () => {
  assert.deepEqual(decode("{ name: 'demo', version: '1.0.0', }"), { name: 'demo', version: '1.0.0' });
});

test('嵌套对象与数组', () => {
  assert.deepEqual(decode("{ list: [1, 'two', { three: true }], empty: [] }"), {
    list: [1, 'two', { three: true }],
    empty: [],
  });
});

test('顶层数组与数组洞', () => {
  assert.deepEqual(decode('[1, , 3]'), [1, null, 3]);
});

test('负数、字符串键、无插值模板串', () => {
  assert.deepEqual(decode("{ 'a-b': -1, c: `text` }"), { 'a-b': -1, c: 'text' });
});

// ── 混有常量引用的配置对象，三种策略 ──

const WITH_REFERENCE = `{
  name: 'demo',
  enabled: false,
  size: 10,
  color: EXTERNAL_CONSTANT,
  nested: { depth: 2 },
}`;

const RESOLVED = { name: 'demo', enabled: false, size: 10, nested: { depth: 2 } };

test('omit：省略无法求值的键', () => {
  assert.deepEqual(decode(WITH_REFERENCE), RESOLVED);
});

test('source：保留源码文本', () => {
  assert.deepEqual(decode(WITH_REFERENCE, SOURCE), { ...RESOLVED, color: 'EXTERNAL_CONSTANT' });
});

test('null：输出 null', () => {
  assert.deepEqual(decode(WITH_REFERENCE, NULLIFY), { ...RESOLVED, color: null });
});

// ── 无法求值的各类表达式 ──

const EXPRESSIONS = '{ a: X, b: Y.Z, c: f(), d: new Date(), e: () => 1, f: `x${y}` }';

test('标识符/成员/调用/构造/箭头函数/插值模板：omit', () => {
  assert.deepEqual(decode(EXPRESSIONS), {});
});

test('标识符/成员/调用/构造/箭头函数/插值模板：source', () => {
  assert.deepEqual(decode(EXPRESSIONS, SOURCE), {
    a: 'X',
    b: 'Y.Z',
    c: 'f()',
    d: 'new Date()',
    e: '() => 1',
    f: '`x${y}`',
  });
});

test('展开运算符不再崩溃，作为无键成员跳过', () => {
  assert.deepEqual(decode('{ ...base, a: 1 }'), { a: 1 });
  assert.deepEqual(decode('{ ...base, a: 1 }', SOURCE), { a: 1 });
});

test('数组中无法求值的元素：omit 剔除，null 置空', () => {
  assert.deepEqual(decode('[1, X, 3]'), [1, 3]);
  assert.deepEqual(decode('[1, X, 3]', NULLIFY), [1, null, 3]);
  assert.deepEqual(decode('[1, X, 3]', SOURCE), [1, 'X', 3]);
});

// ── TypeScript 语法 ──

test('as const', () => {
  assert.deepEqual(decode('{ a: 1 } as const'), { a: 1 });
});

test('satisfies', () => {
  assert.deepEqual(decode('{ a: 1 } satisfies Config'), { a: 1 });
});

test('内层类型断言与非空断言', () => {
  assert.deepEqual(decode("{ a: '#fff' as string, b: 1! }"), { a: '#fff', b: 1 });
});

// ── 语句包裹 ──

test('export const', () => {
  assert.deepEqual(decode('export const cfg: Config = { a: 1 } as const;'), { a: 1 });
});

test('export default', () => {
  assert.deepEqual(decode('export default { a: 1 };'), { a: 1 });
});

test('module.exports', () => {
  assert.deepEqual(decode('module.exports = { a: 1 };'), { a: 1 });
});

test('const 声明', () => {
  assert.deepEqual(decode('const cfg = [1, 2];'), [1, 2]);
});

test('语法错误如实抛出', () => {
  assert.throws(() => decode('{ a: '), /Unexpected|Unsupported/);
});

test('TypeScript 类型声明的花括号不是对象字面量，如实报错', () => {
  const body = "{\n  name: SomeType;\n  enabled: boolean;\n  mode: 'a' | 'b';\n}";
  assert.throws(() => decode(body), /Expected an object or array literal/);
});

test('顶层是标量或标识符时报错，而不是产出 undefined', () => {
  assert.throws(() => decode("'text'"), /Expected an object or array literal/);
  assert.throws(() => decode('SOME_CONSTANT'), /Expected an object or array literal/);
});

// ── 求值器边界（Code Review 发现） ──

test('一元运算符作用于无法求值的操作数时按策略处理，不崩溃', () => {
  assert.deepEqual(decode('{ a: -X }'), {});
  assert.deepEqual(decode('{ a: -X }', SOURCE), { a: '-X' });
  assert.deepEqual(decode('{ a: -X }', NULLIFY), { a: null });
  assert.deepEqual(decode('{ t: -Infinity }'), {});
  assert.deepEqual(decode('{ t: -Infinity }', SOURCE), { t: '-Infinity' });
});

test('一元运算符对真正的数字仍然求值', () => {
  assert.deepEqual(decode('{ a: -1, b: +2 }'), { a: -1, b: 2 });
});

test('计算属性键按策略处理，不把变量名当字面量键', () => {
  assert.deepEqual(decode('{ [FOO]: 1 }'), {});
  assert.deepEqual(decode('{ [FOO]: 1 }', SOURCE), { FOO: 1 });
  assert.deepEqual(decode('{ [FOO]: 1 }', NULLIFY), {});
});

test('计算键里是字面量时仍静态可知', () => {
  assert.deepEqual(decode("{ ['a']: 1, [`b`]: 2 }"), { a: 1, b: 2 });
});

test('带插值的模板键不再产出字面量 undefined 键', () => {
  assert.deepEqual(decode('{ [`a${b}`]: 1 }'), {});
  assert.deepEqual(decode('{ [`a${b}`]: 1 }', SOURCE), { '`a${b}`': 1 });
});

test('正则字面量不再塌成空对象', () => {
  assert.deepEqual(decode('{ a: /re/g }'), {});
  assert.deepEqual(decode('{ a: /re/g }', SOURCE), { a: '/re/g' });
});

test('无初值的声明与多声明符如实报错', () => {
  assert.throws(() => decode('export declare const a: T;'), /single initialized declaration/);
  assert.throws(() => decode('const a = { x: 1 }, b = 2;'), /single initialized declaration/);
});
