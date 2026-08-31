'use strict';
import { commands, window, workspace, type ExtensionContext } from 'vscode';
import { encodingConversions } from '@/encoding';
import { formatConversions } from '@/formats';
import { openResult } from '@/output';
import { pickConversion } from '@/quick-pick';
import type { Conversion, DecodeOptions, UnresolvedValueStrategy } from '@/types';

function decodeOptions(): DecodeOptions {
  const configuration = workspace.getConfiguration('data-converter');
  return { unresolvedValue: configuration.get<UnresolvedValueStrategy>('jsObject.unresolvedValue', 'omit') };
}

/**
 * 从当前编辑器取待转换文本：有选区取选区，否则取全文。
 */
function readInput(): { text: string } | undefined {
  const editor = window.activeTextEditor;

  if (!editor) {
    return undefined;
  }

  const { document, selection } = editor;
  return { text: selection.isEmpty ? document.getText() : document.getText(selection) };
}

/**
 * 能力域入口：选择一个转换条目并执行。
 */
async function runConversionCommand(buildConversions: () => Conversion[]): Promise<void> {
  const input = readInput();

  if (!input) {
    window.showInformationMessage('Open a file or select some text first.');
    return;
  }

  const conversion = await pickConversion(buildConversions());

  if (!conversion) {
    return;
  }

  try {
    await openResult(await conversion.run(input.text), conversion.languageId);
  } catch (error) {
    window.showErrorMessage(`${conversion.label}: ${(error as Error).message}`);
  }
}

export function activate({ subscriptions }: ExtensionContext) {
  subscriptions.push(
    commands.registerCommand('data-converter.convertFormat', () =>
      runConversionCommand(() => formatConversions(decodeOptions()))
    ),
    commands.registerCommand('data-converter.encodeDecode', () => runConversionCommand(encodingConversions))
  );
}

export function deactivate() {}
