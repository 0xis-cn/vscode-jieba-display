import * as vscode from "vscode";
import {
  findLastContentChar, findWordStartPosition, findWordEndPosition, isWhiteSpaceOrAsciiSymbol, findFirstContentChar,
} from "./utils";
import { Text } from "./text";

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
  const selections = vscode.window.activeTextEditor!.selections;

  const createNewSelection = (oldSelection: vscode.Selection, newActive: vscode.Position) => {
    return new vscode.Selection(moveAnchor ? newActive : oldSelection.anchor, newActive);
  };

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    const { text, curIndex } = Text.fromPosition(selection.active, "forward");
    let newActiveIndex = curIndex;

    /*
     * if the cursor's character is whitespace,
     * then mark range(cursor, next non-whitespace) for deletion
     * and move the cursor to the next non-whitespace character,
     * then continue the process of moving forward.
     */
    if (isWhiteSpaceOrAsciiSymbol(text.getString()[newActiveIndex])) {
      const nonSpaceIndex = findFirstContentChar(text.getString().slice(newActiveIndex));
      const nextNonSpaceIndex = nonSpaceIndex === undefined
        ? text.getString().length
        : newActiveIndex + nonSpaceIndex;
      rangesToDelete.push(
        new vscode.Range(text.getPosition(newActiveIndex), text.getPosition(nextNonSpaceIndex))
      );
      newActiveIndex = nextNonSpaceIndex;

      if (newActiveIndex === text.getString().length) {
        newSelections.push(createNewSelection(selection, text.getPosition(newActiveIndex)));
        continue;
      }
    }

    const wordEndIndex = findWordEndPosition(newActiveIndex, text.getString());
    if (wordEndIndex === undefined) {
      newSelections.push(createNewSelection(selection, text.getPosition(text.getString().length)));
      continue;
    }
    const wordEnd = text.getPosition(wordEndIndex);

    rangesToDelete.push(new vscode.Range(text.getPosition(newActiveIndex), wordEnd));
    newSelections.push(createNewSelection(selection, wordEnd));
  }

  return { newSelections, rangesToDelete };
}

function searchBackward(moveAnchor: boolean = true): {
  newSelections: vscode.Selection[];
  rangesToDelete: vscode.Range[];
} {
  const selections = vscode.window.activeTextEditor!.selections;

  const createNewSelection = (oldSelection: vscode.Selection, newActive: vscode.Position) => {
    return new vscode.Selection(moveAnchor ? newActive : oldSelection.anchor, newActive);
  };

  const newSelections: vscode.Selection[] = [];
  const rangesToDelete: vscode.Range[] = [];

  for (const selection of selections) {
    const { text, curIndex } = Text.fromPosition(selection.active, "backward");
    let newActiveIndex = curIndex;

    /*
     * if the cursor is not at the beginning of the line,
     * and the character before is whitespace,
     * then mark range(last non-whitespace + 1, cursor) for deletion
     * and move cursor to (last non-whitespace + 1) before it,
     * then continue the process of moving backward.
     */
    if (newActiveIndex > 0 && isWhiteSpaceOrAsciiSymbol(text.getString()[newActiveIndex - 1])) {
      const nonSpaceIndex = findLastContentChar(
        text.getString().slice(0, newActiveIndex),
      );
      const whitespaceStart = nonSpaceIndex === undefined ? 0 : nonSpaceIndex + 1;
      rangesToDelete.push(new vscode.Range(text.getPosition(whitespaceStart), text.getPosition(newActiveIndex)));
      newActiveIndex = whitespaceStart;

      if (newActiveIndex === 0) {
        newSelections.push(createNewSelection(selection, text.getPosition(newActiveIndex)));
        continue;
      }
    }

    const wordStartIndex = findWordStartPosition(newActiveIndex, text.getString());
    if (wordStartIndex === undefined) {
      newSelections.push(createNewSelection(selection, text.getPosition(0)));
      continue;
    }
    const wordStart = text.getPosition(wordStartIndex);

    rangesToDelete.push(new vscode.Range(wordStart, text.getPosition(newActiveIndex)));
    newSelections.push(createNewSelection(selection, wordStart));
  }

  return { newSelections, rangesToDelete };
}
