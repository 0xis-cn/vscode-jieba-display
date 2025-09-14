import * as vscode from "vscode";
import {
  backwardKillWord,
  backwardWord,
  forwardWord,
  killWord,
  selectWord,
} from "./command";
import { doubleClickOnTextListener } from "./listener";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("jieba.forwardWord", forwardWord),
    vscode.commands.registerCommand("jieba.backwardWord", backwardWord),
    vscode.commands.registerCommand("jieba.killWord", killWord),
    vscode.commands.registerCommand("jieba.backwardKillWord", backwardKillWord),
    vscode.commands.registerCommand("jieba.selectWord", selectWord),
    vscode.window.onDidChangeTextEditorSelection(doubleClickOnTextListener),
  );
}

// This method is called when your extension is deactivated
export function deactivate() { }
