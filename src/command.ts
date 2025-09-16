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

export function forwardSelectWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { newSelections } = searchForward(false);
  editor.selections = newSelections;
}

export function backwardSelectWord() {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { newSelections } = searchBackward(false);
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

function searchForward(moveAnchor = true): {
  newSelections: vscode.Selection[];
  rangesToDelete: vscode.Range[];
} {
  const document = vscode.window.activeTextEditor!.document;
  const selections = vscode.window.activeTextEditor!.selections;

  const createNewSelection = (oldSelection: vscode.Selection, newActive: vscode.Position) => {
    return new vscode.Selection(moveAnchor ? newActive : oldSelection.anchor, newActive);
  };

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    let newActive = selection.active;
    const line = document.lineAt(newActive.line);

    if (newActive.isEqual(line.range.end) && document.lineCount === newActive.line + 1) {
      newSelections.push(createNewSelection(selection, newActive));
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
      newActive.character !== line.range.end.character &&
      isWhiteSpaceOrAsciiSymbol(line.text[newActive.character])
    ) {
      const nonSpacePos = findFirstContentChar(line.text.slice(newActive.character));
      const nextPos = nonSpacePos === undefined
        ? line.range.end.character
        : newActive.character + nonSpacePos;
      const nextNonSpace = new vscode.Position(newActive.line, nextPos);
      rangesToDelete.push(new vscode.Range(newActive, nextNonSpace));
      newActive = nextNonSpace;

      if (newActive.isEqual(line.range.end)) {
        newSelections.push(createNewSelection(selection, newActive));
        continue;
      }
    }

    /*
     * if the cursor is at the end of the line
     * and the next line exists,
     * then jump to the beginning of the next line.
     */
    if (newActive.isEqual(line.range.end) && document.lineCount > newActive.line + 1) {
      const nextLineStart = new vscode.Position(newActive.line + 1, 0);
      newSelections.push(createNewSelection(selection, nextLineStart));
      continue;
    }

    const wordEndPos = findWordEndPosition(newActive.character, line.text);
    if (wordEndPos === undefined) {
      newSelections.push(selection);
      continue;
    }
    const wordEnd = new vscode.Position(newActive.line, wordEndPos);

    rangesToDelete.push(new vscode.Range(newActive, wordEnd));
    newSelections.push(createNewSelection(selection, wordEnd));
  }

  return { newSelections, rangesToDelete };
}

function searchBackward(moveAnchor = true, thickCursor = true): {
  newSelections: vscode.Selection[];
  rangesToDelete: vscode.Range[];
} {
  const document = vscode.window.activeTextEditor!.document;
  const selections = vscode.window.activeTextEditor!.selections;

  const createNewSelection = (oldSelection: vscode.Selection, newActive: vscode.Position) => {
    if (moveAnchor) {
      return new vscode.Selection(newActive, newActive);
    } else if (thickCursor && oldSelection.active > oldSelection.anchor && newActive <= oldSelection.anchor) {
      // vim visual 模式下刚刚按下v选中单个字符，例如第a行第b个字符，此时 selection=[a:b -> a:b+1)|，光标覆盖该字符
      // 此时后退选择，需要将 anchor 往右移动一位，以确保 selection 仍覆盖字符 [a:b]，与 vim 原生行为一致
      return new vscode.Selection(oldSelection.anchor.translate(0, 1), newActive);
    } else {
      return new vscode.Selection(oldSelection.anchor, newActive);
    }
  };

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    let newActive = selection.active;
    const line = document.lineAt(newActive.line);

    if (newActive.character === 0 && newActive.line === 0) {
      newSelections.push(createNewSelection(selection, newActive));
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
      newActive.character !== 0 && isWhiteSpaceOrAsciiSymbol(line.text[newActive.character - 1])
    ) {
      const nonSpacePos = findLastContentChar(
        line.text.slice(0, newActive.character),
      );
      const whitespaceStart = new vscode.Position(newActive.line, nonSpacePos === undefined ? 0 : nonSpacePos + 1);
      rangesToDelete.push(new vscode.Range(whitespaceStart, newActive));
      newActive = whitespaceStart;

      if (newActive.character === 0) {
        newSelections.push(createNewSelection(selection, newActive));
        continue;
      }
    }

    /*
     * if the cursor is at the beginning of the line,
     * and the previous line exists,
     * jump to the end of the previous line.
     */
    if (newActive.character === 0 && newActive.line > 0) {
      const prevLineEnd = document.lineAt(newActive.line - 1).range.end;
      newSelections.push(createNewSelection(selection, prevLineEnd));
      continue;
    }

    const wordStartPos = findWordStartPosition(newActive.character, line.text);
    if (wordStartPos === undefined) {
      newSelections.push(selection);
      continue;
    }
    const wordStart = new vscode.Position(newActive.line, wordStartPos);

    rangesToDelete.push(new vscode.Range(wordStart, newActive));
    newSelections.push(createNewSelection(selection, wordStart));
  }

  return { newSelections, rangesToDelete };
}