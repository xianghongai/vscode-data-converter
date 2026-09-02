import assert from 'node:assert/strict';
import { test } from 'vitest';
import { encodingConversions } from '@/encoding';

const conversions = encodingConversions();
const run = (label: string, text: string) => conversions.find((item) => item.label === label)!.run(text) as string;

const TEXT = 'Hello 世界 🎉';

test('条目 id 唯一', () => {
  assert.equal(new Set(conversions.map((item) => item.id)).size, conversions.length);
});

test('每个条目都有分组与 languageId', () => {
  for (const item of conversions) {
    assert.ok(item.group, `${item.label} 缺少分组`);
    assert.ok(item.languageId, `${item.label} 缺少 languageId`);
  }
});

// ── Base64 ──

test('Base64 往返，含多字节与 emoji', () => {
  const encoded = run('Text → Base64', TEXT);
  assert.equal(encoded, Buffer.from(TEXT, 'utf8').toString('base64'));
  assert.equal(run('Base64 → Text', encoded), TEXT);
});

test('Base64URL 往返，且不含 + / =', () => {
  const encoded = run('Text → Base64URL', '???>>>');
  assert.doesNotMatch(encoded, /[+/=]/);
  assert.equal(run('Base64URL → Text', encoded), '???>>>');
});

test('Base64 解码容忍首尾空白', () => {
  assert.equal(run('Base64 → Text', `\n  ${Buffer.from(TEXT).toString('base64')}  \n`), TEXT);
});

// ── URL ──

test('URL 编码往返', () => {
  const encoded = run('Text → URL Encoded', 'a b&c=中文');
  assert.equal(encoded, 'a%20b%26c%3D%E4%B8%AD%E6%96%87');
  assert.equal(run('URL Encoded → Text', encoded), 'a b&c=中文');
});

// ── Hex ──

test('Hex 往返', () => {
  const encoded = run('Text → Hex', TEXT);
  assert.equal(run('Hex → Text', encoded), TEXT);
});

// ── Unicode 转义 ──

test('Unicode 转义只处理非 ASCII 与反斜杠', () => {
  assert.equal(run('Text → Unicode Escape', 'ab 中'), 'ab \\u4e2d');
  assert.equal(run('Text → Unicode Escape', 'say "hi"'), 'say "hi"');
});

test('Unicode 转义对反斜杠可逆', () => {
  const cases = [
    'C:\\path',
    String.raw`\u4e2d`, // 原文就是字面量，不能被解码成「中」
    String.raw`中\test`,
    'a\\\\b',
    'end\\',
    String.raw`中\u4e2d"x"` + '\t🎉',
  ];

  for (const source of cases) {
    assert.equal(run('Unicode Escape → Text', run('Text → Unicode Escape', source)), source, source);
  }
});

test('Unicode 转义往返，emoji 走代理对', () => {
  const encoded = run('Text → Unicode Escape', TEXT);
  assert.equal(run('Unicode Escape → Text', encoded), TEXT);
});

test('Unicode 解码同时支持 \\u{XXXXX}', () => {
  assert.equal(run('Unicode Escape → Text', '\\u{1F389}'), '🎉');
});

// ── Query String ──

test('Query String → JSON', () => {
  assert.deepEqual(JSON.parse(run('Query String → JSON', 'a=1&b=%E4%B8%AD')), { a: '1', b: '中' });
});

test('Query String → JSON：重复键收成数组', () => {
  assert.deepEqual(JSON.parse(run('Query String → JSON', 'a=1&a=2&b=3')), { a: ['1', '2'], b: '3' });
});

test('Query String → JSON：可直接粘整条 URL', () => {
  assert.deepEqual(JSON.parse(run('Query String → JSON', 'https://example.com/p?a=1&b=2')), { a: '1', b: '2' });
});

test('JSON → Query String：数组展开为重复键', () => {
  assert.equal(run('JSON → Query String', '{"a":["1","2"],"b":3}'), 'a=1&a=2&b=3');
});

test('Query String 往返', () => {
  const query = 'a=1&a=2&b=%E4%B8%AD';
  assert.equal(run('JSON → Query String', run('Query String → JSON', query)), query);
});

// ── JWT ──

const JWT = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: '1234', name: '张三', admin: true })).toString('base64url'),
  'c2lnbmF0dXJl',
].join('.');

test('JWT → JSON 解出头部与载荷', () => {
  const decoded = JSON.parse(run('JWT → JSON', JWT));
  assert.deepEqual(decoded.header, { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(decoded.payload, { sub: '1234', name: '张三', admin: true });
  assert.equal(decoded.signature, 'c2lnbmF0dXJl');
});

test('JWT 格式不对时如实抛出', () => {
  assert.throws(() => run('JWT → JSON', 'not-a-jwt'));
});

// ── HTML / XML 实体 ──

const MIXED = 'a<b>&"x" © 中文 🎉';

test('HTML 实体：完整编码连非 ASCII 一并转义', () => {
  const encoded = run('Text → HTML Entities', MIXED);
  assert.match(encoded, /&lt;b&gt;/);
  assert.match(encoded, /&copy;/);
  assert.doesNotMatch(encoded, /中文/);
  assert.equal(run('HTML Entities → Text', encoded), MIXED);
});

test('HTML 实体：最小编码只转义特殊字符，保留中文与 emoji', () => {
  const encoded = run('Text → HTML Entities (Minimal)', MIXED);
  assert.match(encoded, /&lt;b&gt;/);
  assert.match(encoded, /© 中文 🎉/);
  assert.equal(run('HTML Entities → Text', encoded), MIXED);
});

test('HTML 解码支持命名、十六进制与十进制引用', () => {
  assert.equal(run('HTML Entities → Text', '&copy;&nbsp;&#x4e2d;&#25991;&amp;'), '© 中文&');
});

test('XML 实体往返', () => {
  const encoded = run('Text → XML Entities', MIXED);
  assert.match(encoded, /&lt;b&gt;&amp;/);
  assert.equal(run('XML Entities → Text', encoded), MIXED);
});

test('XML 解码认得 &apos;', () => {
  assert.equal(run('XML Entities → Text', '&apos;&lt;&amp;&gt;&quot;'), '\'<&>"');
});

// ── 摘要 ──

test('摘要与 Node crypto 一致', async () => {
  const { createHash } = await import('node:crypto');

  for (const [label, algorithm] of [
    ['Text → MD5', 'md5'],
    ['Text → SHA-1', 'sha1'],
    ['Text → SHA-256', 'sha256'],
    ['Text → SHA-512', 'sha512'],
  ]) {
    assert.equal(run(label, TEXT), createHash(algorithm).update(TEXT, 'utf8').digest('hex'));
  }
});

test('摘要输出为小写十六进制且长度固定', () => {
  const lengths: [string, number][] = [
    ['Text → MD5', 32],
    ['Text → SHA-1', 40],
    ['Text → SHA-256', 64],
    ['Text → SHA-512', 128],
  ];

  for (const [label, length] of lengths) {
    const value = run(label, TEXT);
    assert.match(value, /^[0-9a-f]+$/);
    assert.equal(value.length, length);
  }
});

test('摘要不预处理输入，空白参与计算', () => {
  assert.notEqual(run('Text → MD5', 'a'), run('Text → MD5', 'a\n'));
});

test('Query String → JSON：支持 a[b]=1 嵌套语法', () => {
  assert.deepEqual(JSON.parse(run('Query String → JSON', 'a[b]=1&a[c]=2&d=3')), {
    a: { b: '1', c: '2' },
    d: '3',
  });
});

test('Query String 嵌套往返', () => {
  const query = 'a%5Bb%5D=1&c=2';
  assert.equal(run('JSON → Query String', run('Query String → JSON', query)), query);
});
