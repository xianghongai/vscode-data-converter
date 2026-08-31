import { ViewColumn, window, workspace } from 'vscode';

/**
 * 把转换结果在右侧的临时编辑器中打开。
 */
export async function openResult(content: string, languageId: string): Promise<void> {
  const document = await workspace.openTextDocument({ content, language: languageId });
  await window.showTextDocument(document, { viewColumn: ViewColumn.Beside, preview: true });
}
