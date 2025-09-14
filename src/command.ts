import * as vscode from "vscode";
import {
  findLastContentChar, findWordStartPosition, findWordEndPosition, isWhiteSpaceOrAsciiSymbol, findFirstContentChar,
} from "./utils";

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
    const lineNum = start.line;
    const lineText = vscode.window.activeTextEditor!.document.lineAt(lineNum).text;

    const wordStartPos = findWordStartPosition(start.character + 1, lineText);
    if (wordStartPos === undefined) {
      return selection;
    }
    const wordStart = new vscode.Position(lineNum, wordStartPos);

    const wordEndPos = findWordEndPosition(start.character, lineText);
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

    const wordEndPos = findWordEndPosition(cursor.character, line.text);
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

    const wordStartPos = findWordStartPosition(cursor.character, line.text);
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