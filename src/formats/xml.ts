import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { INDENT, type Codec } from '@/types';

const ATTRIBUTE_PREFIX = '@_';
const ROOT_NAME = 'root';
const ITEM_NAME = 'item';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTRIBUTE_PREFIX,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: ATTRIBUTE_PREFIX,
  format: true,
  indentBy: ' '.repeat(INDENT),
});

export const xml: Codec = {
  id: 'xml',
  label: 'XML',
  languageId: 'xml',
  decode: (text) => parser.parse(text),
  // XML 文档只能有一个根元素；顶层数组再套一层 `item` 才能表达
  encode: (value) => builder.build({ [ROOT_NAME]: Array.isArray(value) ? { [ITEM_NAME]: value } : value }),
};
