import * as vscode from 'vscode';

export interface PosToken {
  word: string;
  start: number;
  end: number;
  tag: string;
}

/**
 * 词性标注与高亮相关逻辑
 */
export async function highlightPosTagsInEditor(jieba: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor.');
    return;
  }
  const doc = editor.document;
  const text = doc.getText();
  // 使用 jieba-wasm 的词性标注
  let tokens: PosToken[] = [];
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
