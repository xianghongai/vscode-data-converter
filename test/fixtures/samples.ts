/** 每个源格式一份等价样本，内容为同一个扁平字符串映射 */
export const samples = {
  json: '{ "name": "demo", "version": "1.0.0" }',
  jsonc: '{\n  // 名称\n  "name": "demo",\n  "version": "1.0.0",\n}',
  json5: "{ name: 'demo', version: '1.0.0' }",
  yaml: 'name: demo\nversion: "1.0.0"\n',
  toml: 'name = "demo"\nversion = "1.0.0"\n',
  xml: '<root><name>demo</name><version>1.0.0</version></root>',
  ini: 'name=demo\nversion=1.0.0\n',
  properties: 'name=demo\nversion=1.0.0\n',
  env: 'name=demo\nversion=1.0.0\n',
  plist:
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<plist version="1.0"><dict><key>name</key><string>demo</string></dict></plist>',
  csv: 'name,version\ndemo,1.0.0\n',
  tsv: 'name\tversion\ndemo\t1.0.0\n',
  'js-object': "{ name: 'demo', version: '1.0.0', }",
};
