import * as vscode from "vscode";

interface Line { number: number, length: number }

type Mode = "backward" | "forward"

export class Text {
  #lines: Line[];
  #textString: string;
  #mode: Mode;

  private constructor(lines: Line[], textString: string, mode: Mode) {
    this.#lines = lines;
    this.#textString = textString;
    this.#mode = mode;
  }

  static fromPosition(pos: vscode.Position, mode: Mode) {
    const document = vscode.window.activeTextEditor!.document;
    const lines: Line[] = [];
    if (mode === "backward") {
      let lineBefore = pos.line - 1;
      // empty lines
      while (lineBefore > 0 && document.lineAt(lineBefore).isEmptyOrWhitespace) {
        lines.push({ number: lineBefore, length: document.lineAt(lineBefore).range.end.character });
        lineBefore--;
      }
      if (lineBefore >= 0) {
        // the last contentful line before
        lines.push({ number: lineBefore, length: document.lineAt(lineBefore).range.end.character });
      }
      lines.reverse();
    }
    // current line
    lines.push({ number: pos.line, length: document.lineAt(pos.line).range.end.character });
    if (mode === "forward") {
      let lineBelow = pos.line + 1;
      // empty lines
      while (lineBelow < document.lineCount && document.lineAt(lineBelow).isEmptyOrWhitespace) {
        lines.push({ number: lineBelow, length: document.lineAt(lineBelow).range.end.character });
        lineBelow++;
      }
      if (document.lineCount > lineBelow) {
        // the following line
        lines.push({ number: lineBelow, length: document.lineAt(lineBelow).range.end.character });
      }
    }
    const textString = lines.map((l) => document.lineAt(l.number).text).join("");
    const text = new Text(lines, textString, mode);
    return { text, curIndex: text.getIndex(pos) };
  }

  getIndex(pos: vscode.Position) {
    let index = 0;
    for (const { number: lineNumber, length } of this.#lines) {
      if (lineNumber < pos.line) {
        index += length;
      } else if (lineNumber === pos.line) {
        index += pos.character;
        return index;
      }
    }
    throw new Error("Text.getIndex: Position out of range");
  }

  getString() {
    return this.#textString;
  }

  getPosition(index: number) {
    let lineCharactor = index;
    for (const { number: lineNumber, length } of this.#lines) {
      if (lineCharactor > length) {
        lineCharactor -= length;
      } else if (lineCharactor < length) {
        return new vscode.Position(lineNumber, lineCharactor);
      } else if (lineCharactor === length) {
        if (this.#mode === "backward") {
          return new vscode.Position(lineNumber, lineCharactor);
        }
        lineCharactor -= length;
      }
    }
    return new vscode.Position(this.#lines.at(-1)!.number, this.#lines.at(-1)!.length);
  }
}
