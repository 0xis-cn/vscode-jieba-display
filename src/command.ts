import * as vscode from "vscode";
import { parseSentence } from "./parse";

export function forwardWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { newSelections } = searchForward();
  editor.selections = newSelections;
}

export function backwardWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { newSelections } = searchBackward();
  editor.selections = newSelections;
}

export async function killWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const clipboard = vscode.env.clipboard;
  const document = editor.document;

  const { newSelections, rangesToDelete } = searchForward();

  for (const range of rangesToDelete) {
    const textToCut = document.getText(range);
    clipboard.writeText(textToCut);
    break;
  }
  editor.selections = newSelections;
  await editor.edit((edit) => {
    for (const range of rangesToDelete) {
      edit.delete(range);
    }
  });
}

export async function backwardKillWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const clipboard = vscode.env.clipboard;
  const document = editor.document;

  const { newSelections, rangesToDelete } = searchBackward();

  for (const range of rangesToDelete) {
    const textToCut = document.getText(range);
    clipboard.writeText(textToCut);
    break;
  }
  editor.selections = newSelections;
  await editor.edit((edit) => {
    for (const range of rangesToDelete) {
      edit.delete(range);
    }
  });
}

export function selectWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }

  editor.selections = editor.selections.map((selection) => {
    const start = selection.start;
    const end = selection.end;
    const lineNum = start.line;
    const startNext = new vscode.Position(lineNum, start.character + 1);

    const wordStartPos = findWordStartPosition(startNext);
    if (wordStartPos === undefined) {
      return selection;
    }
    const wordStart = new vscode.Position(lineNum, wordStartPos);

    const wordEndPos = findWordEndPosition(end);
    if (wordEndPos === undefined) {
      return selection;
    }
    const wordEnd = new vscode.Position(lineNum, wordEndPos);

    return new vscode.Selection(wordStart, wordEnd);
  });
}

function searchForward(): {
  newSelections: vscode.Selection[];
  rangesToDelete: vscode.Range[];
} {
  const document = vscode.window.activeTextEditor!.document;
  const selections = vscode.window.activeTextEditor!.selections;

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    let cursor = selection.start;
    const line = document.lineAt(cursor.line);

    if (cursor.isEqual(line.range.end) && document.lineCount === cursor.line + 1) {
      newSelections.push(new vscode.Selection(cursor, cursor));
      continue;
    }

    /*
     * if the cursor is not at the end of the line
     * and the character after is whitespace,
     * then mark range(cursor, next non-whitespace) for deletion
     * and move the cursor to the next non-whitespace character,
     * then continue the process of moving forward.
     */
    if (
      cursor.character !== line.range.end.character &&
      isWhiteSpaceOrAsciiSymbol(line.text[cursor.character])
    ) {
      const nonSpacePos = findFirstContentChar(line.text.slice(cursor.character));
      const nextPos = nonSpacePos === undefined
        ? line.range.end.character
        : cursor.character + nonSpacePos;
      const nextNonSpace = new vscode.Position(cursor.line, nextPos);
      rangesToDelete.push(new vscode.Range(cursor, nextNonSpace));
      cursor = nextNonSpace;

      if (cursor.isEqual(line.range.end)) {
        newSelections.push(new vscode.Selection(cursor, cursor));
        continue;
      }
    }

    /*
     * if the cursor is at the end of the line
     * and the next line exists,
     * then jump to the beginning of the next line.
     */
    if (cursor.isEqual(line.range.end) && document.lineCount > cursor.line + 1) {
      const nextLineStart = new vscode.Position(cursor.line + 1, 0);
      newSelections.push(new vscode.Selection(nextLineStart, nextLineStart));
      continue;
    }

    const wordEndPos = findWordEndPosition(cursor);
    if (wordEndPos === undefined) {
      newSelections.push(selection);
      continue;
    }
    const wordEnd = new vscode.Position(cursor.line, wordEndPos);

    rangesToDelete.push(new vscode.Range(cursor, wordEnd));
    newSelections.push(new vscode.Selection(wordEnd, wordEnd));
  }

  return { newSelections, rangesToDelete };
}

function searchBackward(): {
  newSelections: vscode.Selection[];
  rangesToDelete: vscode.Range[];
} {
  const document = vscode.window.activeTextEditor!.document;
  const selections = vscode.window.activeTextEditor!.selections;

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    let cursor = selection.start;
    const line = document.lineAt(cursor.line);

    if (cursor.character === 0 && cursor.line === 0) {
      newSelections.push(new vscode.Selection(cursor, cursor));
      continue;
    }

    /*
     * if the cursor is not at the beginning of the line,
     * and the character before is whitespace,
     * then mark range(last non-whitespace + 1, cursor) for deletion
     * and move cursor to (last non-whitespace + 1) before it,
     * then continue the process of moving backward.
     */
    if (
      cursor.character !== 0 && isWhiteSpaceOrAsciiSymbol(line.text[cursor.character - 1])
    ) {
      const nonSpacePos = findLastContentChar(
        line.text.slice(0, cursor.character),
      );
      const whitespaceStart = new vscode.Position(cursor.line, nonSpacePos === undefined ? 0 : nonSpacePos + 1);
      rangesToDelete.push(new vscode.Range(whitespaceStart, cursor));
      cursor = whitespaceStart;

      if (cursor.character === 0) {
        newSelections.push(new vscode.Selection(cursor, cursor));
        continue;
      }
    }

    /*
     * if the cursor is at the beginning of the line,
     * and the previous line exists,
     * jump to the end of the previous line.
     */
    if (cursor.character === 0 && cursor.line > 0) {
      const prevLineEnd = document.lineAt(cursor.line - 1).range.end;
      newSelections.push(new vscode.Selection(prevLineEnd, prevLineEnd));
      continue;
    }

    const wordStartPos = findWordStartPosition(cursor);
    if (wordStartPos === undefined) {
      newSelections.push(selection);
      continue;
    }
    const wordStart = new vscode.Position(cursor.line, wordStartPos);

    rangesToDelete.push(new vscode.Range(wordStart, cursor));
    newSelections.push(new vscode.Selection(wordStart, wordStart));
  }

  return { newSelections, rangesToDelete };
}

/**
 * 查找字符串中第一个“内容字符”（非空格、非ASCII符号）的索引。
 * @param text 要搜索的字符串。
 * @returns 第一个内容字符的索引，如果不存在则返回 undefined。
 */
function findFirstContentChar(text: string): number | undefined {
  const result = text.search(/[^\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/);
  return result === -1 ? undefined : result;
}

/**
 * 查找字符串中最后一个“内容字符”（非空格、非ASCII符号）的索引。
 * @param text 要搜索的字符串。
 * @returns 最后一个内容字符的索引，如果不存在则返回 undefined。
 */
function findLastContentChar(text: string): number | undefined {
  const match = text.match(/([^\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E])[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]*$/);
  return match?.index;
}

/**
 * 检查单个字符是否是“空白字符”或“ASCII符号”。
 * @param c 要检查的单个字符。
 */
function isWhiteSpaceOrAsciiSymbol(c: string): boolean {
  return /^[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]$/.test(c);
}

/**
 * 从字符串开头跳过所有空格和ASCII符号，找到第一个单词（由字母、数字、下划线组成），
 * 并返回该单词结束后的位置索引。如果字符串以CJK字符开头，则匹配失败。
 * @param text 要搜索的字符串。
 */
function findEndOfFirstNonCJKWord(text: string): number | undefined {
  const match = text.match(/^([\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]*\w+(?<![\u4e00-\u9fff]))\b/);
  if (match === null) {
    return undefined;
  }
  return match[1].length;
}

/**
 * 从字符串末尾跳过所有空格和ASCII符号，找到最后一个单词（由字母、数字、下划线组成），
 * 并返回该单词开始前的位置索引。
 * @param text 要搜索的字符串。
 */
function findStartOfLastNonCJKWord(text: string): number | undefined {
  const match = text.match(/\b\w+(?<![\u4e00-\u9fff])[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]*$/);
  if (match === null) {
    return undefined;
  }
  return text.length - match[0].length;
}

function findWordStartPosition(cursor: vscode.Position): number | undefined {
  const line = vscode.window.activeTextEditor!.document.lineAt(cursor.line);

  const wordStartPos = findStartOfLastNonCJKWord(line.text.slice(0, cursor.character));

  // non CJK context
  if (wordStartPos !== undefined) {
    return wordStartPos;
  }

  /*
   * in CJK context
   * jump to the beginning of the word
   * and mark range(the beginning of the word, cursor) for deletion
   */
  const tokens = parseSentence(line.text);
  const target = tokens.find((token) => {
    return token.start < cursor.character && token.end >= cursor.character;
  });
  return target?.start;
}

function findWordEndPosition(cursor: vscode.Position): number | undefined {
  const line = vscode.window.activeTextEditor!.document.lineAt(cursor.line);

  const wordEndPos = findEndOfFirstNonCJKWord(line.text.slice(cursor.character));

  // non-CJK context
  if (wordEndPos !== undefined) {
    return cursor.character + wordEndPos;
  }

  /*
   * in CJK-context
   * jump to the end of the word
   * and mark range(cursor, end of the word + 1) for deletion.
   */
  const tokens = parseSentence(line.text);
  const target = tokens.find((token) => {
    return token.start <= cursor.character && token.end > cursor.character;
  });
  return target?.end;
}