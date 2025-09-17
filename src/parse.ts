/**
 * 词性标注与高亮相关逻辑
 */
export async function highlightPosTagsInEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor.');
    return;
  }
  const doc = editor.document;
  const text = doc.getText();
  // 仅支持 jieba-wasm
  let jieba: any;
  try {
    jieba = await import('jieba-wasm');
  } catch (e) {
    vscode.window.showErrorMessage('未能加载 jieba-wasm: ' + (e instanceof Error ? e.message : e));
    return;
  }
  let tokens: { word: string; start: number; end: number; tag: string }[] = [];
  try {
    tokens = jieba.tag(text).map((t: any) => ({
      word: t.word,
      start: t.start,
      end: t.end,
      tag: t.tag,
    }));
  } catch (e) {
    vscode.window.showErrorMessage('Jieba 词性标注失败: ' + (e instanceof Error ? e.message : e));
    return;
  }
  // 词性到颜色的简单映射
  const tagColors: Record<string, string> = {
    'n': '#e57373', // 名词
    'v': '#64b5f6', // 动词
    'a': '#81c784', // 形容词
    'd': '#ffd54f', // 副词
    'm': '#ba68c8', // 数量词
    'r': '#4db6ac', // 代词
    'c': '#ffb74d', // 连词
    'p': '#90a4ae', // 介词
    'u': '#bdbdbd', // 助词
    'x': '#f06292', // 其他
  };
  // 清理旧装饰
  if ((editor as any)._jiebaPosDecorations) {
    for (const deco of (editor as any)._jiebaPosDecorations) {
      editor.setDecorations(deco, []);
    }
  }
  const decoMap: Record<string, vscode.TextEditorDecorationType> = {};
  for (const tag in tagColors) {
    decoMap[tag] = vscode.window.createTextEditorDecorationType({
      backgroundColor: tagColors[tag] + '55',
      borderRadius: '2px',
    });
  }
  // 按词性分组装饰
  const tagRanges: Record<string, vscode.DecorationOptions[]> = {};
  for (const token of tokens) {
    const colorTag = tagColors[token.tag] ? token.tag : 'x';
    if (!tagRanges[colorTag]) tagRanges[colorTag] = [];
    const start = doc.positionAt(token.start);
    const end = doc.positionAt(token.end);
    tagRanges[colorTag].push({ range: new vscode.Range(start, end) });
  }
  for (const tag in tagRanges) {
    editor.setDecorations(decoMap[tag], tagRanges[tag]);
  }
  (editor as any)._jiebaPosDecorations = Object.values(decoMap);
}
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
