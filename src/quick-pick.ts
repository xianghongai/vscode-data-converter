import { QuickPickItemKind, window, type QuickPickItem } from 'vscode';
import type { Conversion } from '@/types';

interface ConversionItem extends QuickPickItem {
  conversion?: Conversion;
}

/**
 * 按分组插入分隔符，把转换清单铺成扁平列表。
 */
function toItems(conversions: Conversion[]): ConversionItem[] {
  const items: ConversionItem[] = [];
  let group = '';

  for (const conversion of conversions) {
    if (conversion.group !== group) {
      group = conversion.group;
      items.push({ label: group, kind: QuickPickItemKind.Separator });
    }

    items.push({ label: conversion.label, conversion });
  }

  return items;
}

export async function pickConversion(conversions: Conversion[]): Promise<Conversion | undefined> {
  const picked = await window.showQuickPick(toItems(conversions), {
    placeHolder: 'Select a conversion',
    matchOnDescription: true,
  });

  return picked?.conversion;
}
