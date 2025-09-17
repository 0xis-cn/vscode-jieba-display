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

function searchForward(moveAnchor: boolean = true): {
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
    const lineOf = (pos: vscode.Position) => document.lineAt(pos.line);

    if (newActive.isEqual(lineOf(newActive).range.end) && document.lineCount === newActive.line + 1) {
      newSelections.push(createNewSelection(selection, newActive));
      continue;
    }

    /*
     * if the cursor is at the end of the line
     * then jump to the beginning of next contentful line.
     */
    if (newActive.isEqual(lineOf(newActive).range.end) && document.lineCount > newActive.line + 1) {
      let nextContentfulLine = newActive.line + 1;
      while (document.lineCount > nextContentfulLine + 1 && document.lineAt(nextContentfulLine).isEmptyOrWhitespace) {
        nextContentfulLine++;
      }
      newActive = new vscode.Position(nextContentfulLine, 0);
    }

    /*
     * if the cursor is not at the end of the line
     * and the character after is whitespace,
     * then mark range(cursor, next non-whitespace) for deletion
     * and move the cursor to the next non-whitespace character,
     * then continue the process of moving forward.
     */
    if (
      newActive.character !== lineOf(newActive).range.end.character &&
      isWhiteSpaceOrAsciiSymbol(lineOf(newActive).text[newActive.character])
    ) {
      const nonSpacePos = findFirstContentChar(lineOf(newActive).text.slice(newActive.character));
      const nextPos = nonSpacePos === undefined
        ? lineOf(newActive).range.end.character
        : newActive.character + nonSpacePos;
      const nextNonSpace = new vscode.Position(newActive.line, nextPos);
      rangesToDelete.push(new vscode.Range(newActive, nextNonSpace));
      newActive = nextNonSpace;

      if (newActive.isEqual(lineOf(newActive).range.end)) {
        newSelections.push(createNewSelection(selection, newActive));
        continue;
      }
    }

    const wordEndPos = findWordEndPosition(newActive.character, lineOf(newActive).text);
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

function searchBackward(moveAnchor: boolean = true): {
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
    const lineOf = (pos: vscode.Position) => document.lineAt(pos.line);

    if (newActive.character === 0 && newActive.line === 0) {
      newSelections.push(createNewSelection(selection, newActive));
      continue;
    }

    /*
     * if the cursor is at the beginning of the line,
     * jump to the end of last contentful line.
     */
    if (newActive.character === 0 && newActive.line > 0) {
      let lastContentfulLine = newActive.line - 1;
      while (lastContentfulLine > 0 && document.lineAt(lastContentfulLine).isEmptyOrWhitespace) {
        lastContentfulLine--;
      }
      newActive = document.lineAt(lastContentfulLine).range.end;
    }

    /*
     * if the cursor is not at the beginning of the line,
     * and the character before is whitespace,
     * then mark range(last non-whitespace + 1, cursor) for deletion
     * and move cursor to (last non-whitespace + 1) before it,
     * then continue the process of moving backward.
     */
    if (
      newActive.character !== 0 && isWhiteSpaceOrAsciiSymbol(lineOf(newActive).text[newActive.character - 1])
    ) {
      const nonSpacePos = findLastContentChar(
        lineOf(newActive).text.slice(0, newActive.character),
      );
      const whitespaceStart = new vscode.Position(newActive.line, nonSpacePos === undefined ? 0 : nonSpacePos + 1);
      rangesToDelete.push(new vscode.Range(whitespaceStart, newActive));
      newActive = whitespaceStart;

      if (newActive.character === 0) {
        newSelections.push(createNewSelection(selection, newActive));
        continue;
      }
    }

    const wordStartPos = findWordStartPosition(newActive.character, lineOf(newActive).text);
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
