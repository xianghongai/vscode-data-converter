import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatConversions, sources, targets } from '@/formats';
import { samples } from './fixtures/samples';

const conversions = formatConversions();

test('清单条数为笛卡尔积减去恒等项', () => {
  const identity = sources().filter((from) => targets().some((to) => to.id === from.id)).length;
  assert.equal(conversions.length, sources().length * targets().length - identity);
});

test('清单中没有源与目标相同的恒等条目', () => {
  const identity = conversions.filter((item) => {
    const [from, to] = item.label.split(' → ');
    return from === to;
  });
  assert.deepEqual(identity, []);
});

test('清单条目 id 唯一', () => {
  assert.equal(new Set(conversions.map((item) => item.id)).size, conversions.length);
});

test('每个源格式都有对应样本', () => {
  assert.deepEqual(
    sources().map((codec) => codec.id),
    Object.keys(samples)
  );
});

/**
 * 样本是扁平对象，表格类来源的样本是行数组，两者都存在固有的形状约束。
 * 这里把允许的失败限定成这两条，其余任何报错都算回归。
 */
const SHAPE_CONSTRAINTS = [
  /Expected an array of rows/, // 扁平对象转不成表格
  /stringify can only be called with an object/, // TOML 顶层必须是表，来源是行数组时不成立
];

for (const conversion of conversions) {
  const [from] = conversion.id.split('-to-') as [keyof typeof samples];

  test(`${conversion.label} 产出非空结果`, async () => {
    let output;

    try {
      output = await conversion.run(samples[from]);
    } catch (thrown) {
      const error = thrown as Error;
      assert.ok(
        SHAPE_CONSTRAINTS.some((pattern) => pattern.test(error.message)),
        `非形状约束的报错：${error.message}`
      );
      return;
    }

    assert.equal(typeof output, 'string');
    assert.ok(output.trim().length > 0, '结果不应为空');
  });
}
