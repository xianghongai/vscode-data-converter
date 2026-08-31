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

/** 表示"丢弃这个值"——对象属性跳过该键，数组元素从结果中剔除 */
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

        const value = evaluate(property.value as AnyNode, context);

        if (value !== OMIT) {
          result[propertyKey(property.key as AnyNode)] = value;
        }
      }

      return result;
    }

    case 'ArrayExpression':
      return (node.elements as (AnyNode | null)[])
        .map((element) => (element === null ? null : evaluate(element, context)))
        .filter((element) => element !== OMIT);

    case 'Literal':
      return node.value;

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

function propertyKey(key: AnyNode): string {
  switch (key.type) {
    case 'Identifier':
      return key.name as string;

    case 'Literal':
      return String(key.value);

    case 'TemplateLiteral':
      return templateValue(key) ?? String(key.value);

    default:
      throw new Error(`Unsupported property key: ${key.type}`);
  }
}

/** 带插值的模板串无法静态求值，返回 undefined 交给调用方按策略处理 */
function templateValue(node: AnyNode): string | undefined {
  const quasis = node.quasis as AnyNode[];
  return quasis.length === 1 ? (quasis[0].value as { cooked: string }).cooked : undefined;
}

function unaryValue(node: AnyNode, context: Context): unknown {
  const argument = evaluate(node.argument as AnyNode, context);

  switch (node.operator) {
    case '-':
      return -(argument as number);

    case '+':
      return +(argument as number);

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

    case 'VariableDeclaration':
      return (node.declarations as AnyNode[])[0].init as AnyNode;

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
