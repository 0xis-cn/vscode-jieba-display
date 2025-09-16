import QuickLRU from 'quick-lru';
import * as vscode from 'vscode';

const cache = new QuickLRU<String, Token[]>({ maxSize: 25 });

interface Token {
  word: string;
  start: number;
  end: number;
}

type SegmenterFunction = (text: string) => Token[];

let segmenter: SegmenterFunction | null = null;

export enum SegmenterType {
  Jieba = 'jieba-wasm',
  IntlSegmenter = 'Intl.Segmenter'
}

export async function initializeSegmenter(): Promise<void> {
  cache.clear();
  const config = vscode.workspace.getConfiguration('jieba');
  const segmenterType = config.get<SegmenterType>('segmenter');

  vscode.window.showInformationMessage(`Initializing segmenter: ${segmenterType}...`);

  try {
    switch (segmenterType) {
      case SegmenterType.Jieba:
        const jieba = await import('jieba-wasm');
        segmenter = (text: string) => jieba.tokenize(text, "default", true);
        break;

      case SegmenterType.IntlSegmenter:
        const locales = config.get<string[]>('intlSegmenterLocales');
        const intlSegmenter = new Intl.Segmenter(locales, { granularity: 'word' });
        segmenter = (text: string) =>
          Array.from(intlSegmenter.segment(text), ({ segment, index }) => {
            return { word: segment, start: index, end: index + segment.length };
          });
        break;

      default:
        vscode.window.showErrorMessage(`Unknown segmenter type: ${segmenterType}`);
        segmenter = null;
        break;
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize ${segmenterType} segmenter. ${error instanceof Error ? error.message : error}`);
    segmenter = null;
  }
}

export function parseSentence(sentence: string): Token[] {
  if (!segmenter) {
    vscode.window.showErrorMessage('Segmenter is not initialized or failed to initialize.');
    throw new Error('Segmenter is not initialized or failed to initialize.');
  }
  if (cache.has(sentence)) {
    return cache.get(sentence)!;
  }
  const tokens = segmenter(sentence);
  cache.set(sentence, tokens);
  return tokens;
}
