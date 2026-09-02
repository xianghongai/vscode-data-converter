import { parse, parseExpression, type ParserOptions } from '@babel/parser';
import type { Codec, DecodeOptions } from '@/types';

interface AnyNode {
  type: string;
  [key: string]: unknown;
}

interface Context {
  options: DecodeOptions;
  source: string;
}

/** `estree` 插件让 Babel 产出与 ESTree 同构的 AST，`typescript` 插件负责 TS 语法 */
const PARSE_OPTIONS: ParserOptions = {
  plugins: ['estree', ['typescript', {}]],
  sourceType: 'module',
};

/** 表示"丢弃这个值"，对象属性跳过该键，数组元素从结果中剔除 */
const OMIT = Symbol('omit');

function evaluate(node: AnyNode, context: Context): unknown {
  switch (node.type) {
    case 'ObjectExpression': {
      const result: Record<string, unknown> = {};

      for (const property of node.properties as AnyNode[]) {
        // SpreadElement 没有键，无法表达成 JSON 成员
        if (property.type !== 'Property') {
          continue;
        }

        const key = propertyKey(property.key as AnyNode, property.computed === true, context);
        const value = evaluate(property.value as AnyNode, context);

        if (key !== OMIT && value !== OMIT) {
          result[key] = value;
        }
      }

      return result;
    }

    case 'ArrayExpression':
      return (node.elements as (AnyNode | null)[])
        .map((element) => (element === null ? null : evaluate(element, context)))
        .filter((element) => element !== OMIT);

    // estree 的正则字面量把活的 RegExp 实例放在 value 里，JSON 编码后会塌成 {}
    case 'Literal':
      return node.regex ? unresolved(node, context) : node.value;

    case 'TemplateLiteral':
      return templateValue(node) ?? unresolved(node, context);

    case 'UnaryExpression':
      return unaryValue(node, context);

    // TS 包装节点：`as const`、`satisfies C`、`x!`、`<T>x`、`f<T>`
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
    case 'TSInstantiationExpression':
      return evaluate(node.expression as AnyNode, context);

    default:
      return unresolved(node, context);
  }
}

/** 标识符、成员表达式、函数调用等无法静态求值的表达式 */
function unresolved(node: AnyNode, { options, source }: Context): unknown {
  switch (options.unresolvedValue) {
    case 'source':
      return source.slice(node.start as number, node.end as number);

    case 'null':
      return null;

    default:
      return OMIT;
  }
}

/**
 * 计算键 `{ [X]: 1 }` 里的标识符是变量引用，不是键名本身；只有方括号里是字面量
 * 或无插值模板串时键才静态可知，其余按 `unresolvedValue` 策略处理。
 */
function propertyKey(key: AnyNode, computed: boolean, context: Context): string | typeof OMIT {
  if (!computed && key.type === 'Identifier') {
    return key.name as string;
  }

  if (key.type === 'Literal' && !key.regex) {
    return String(key.value);
  }

  if (key.type === 'TemplateLiteral') {
    const cooked = templateValue(key);

    if (cooked !== undefined) {
      return cooked;
    }
  }

  if (computed) {
    const resolved = unresolved(key, context);
    return typeof resolved === 'string' ? resolved : OMIT;
  }

  throw new Error(`Unsupported property key: ${key.type}`);
}

/** 带插值的模板串无法静态求值，返回 undefined 交给调用方按策略处理 */
function templateValue(node: AnyNode): string | undefined {
  const quasis = node.quasis as AnyNode[];
  return quasis.length === 1 ? (quasis[0].value as { cooked: string }).cooked : undefined;
}

function unaryValue(node: AnyNode, context: Context): unknown {
  const argument = evaluate(node.argument as AnyNode, context);

  // 操作数没求出数值时（未解析的标识符是 OMIT / null / 源码文本），整个表达式也不可解析
  if (typeof argument !== 'number') {
    return unresolved(node, context);
  }

  switch (node.operator) {
    case '-':
      return -argument;

    case '+':
      return argument;

    default:
      return unresolved(node, context);
  }
}

/** 先按表达式解析；失败则按语句解析，取出被 `export const` 一类包裹的值 */
function parseValue(text: string): AnyNode {
  try {
    return parseExpression(text, PARSE_OPTIONS) as unknown as AnyNode;
  } catch {
    const file = parse(text, PARSE_OPTIONS) as unknown as { program: { body: AnyNode[] } };
    return unwrapStatement(file.program.body[0]);
  }
}

function unwrapStatement(node: AnyNode | undefined): AnyNode {
  if (!node) {
    throw new Error('Empty input');
  }

  switch (node.type) {
    case 'ExportDefaultDeclaration':
    case 'ExportNamedDeclaration':
      return unwrapStatement(node.declaration as AnyNode);

    case 'VariableDeclaration': {
      const [declaration, ...rest] = node.declarations as AnyNode[];

      // `export declare const a: T;` 没有初值；`const a = {}, b = 2;` 取第一个会静默丢掉 b
      if (rest.length > 0 || !declaration?.init) {
        throw new Error('Expected a single initialized declaration');
      }

      return declaration.init as AnyNode;
    }

    case 'ExpressionStatement': {
      const expression = node.expression as AnyNode;
      return expression.type === 'AssignmentExpression' ? (expression.right as AnyNode) : expression;
    }

    // 已经是值表达式（如 `export default { ... }` 解包后），交给 evaluate
    default:
      return node;
  }
}

export const jsObject: Codec = {
  id: 'js-object',
  label: 'JavaScript / TypeScript Object',
  languageId: 'typescript',
  decode: (text, options) => {
    const value = evaluate(parseValue(text), { options, source: text });

    // 顶层必须是对象或数组字面量；类型声明的花括号、裸标识符等都不是值
    if (typeof value !== 'object' || value === null) {
      throw new Error('Expected an object or array literal');
    }

    return value;
  },
};
