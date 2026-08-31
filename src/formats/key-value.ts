/**
 * INI、`.properties`、`.env` 都只能表达键值对，顶层是数组时各家库的退化行为都不可用：
 * `dot-properties` 渲染成 `# [object Object]` 注释，`ini` 造出 `[0]` 段，
 * `dotenv` 侧写出数字键。三者都是静默丢数据，所以在编码入口就拒绝。
 */
export function requireKeyValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object of key-value pairs');
  }

  return value as Record<string, unknown>;
}
