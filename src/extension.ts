import * as vscode from "vscode";
import {
  backwardKillWord,
  backwardWord,
  backwardSelectWord,
  forwardWord,
  forwardSelectWord,
  killWord,
  selectWord,
} from "./command";
import { doubleClickOnTextListener } from "./listener";
import { initializeSegmenter, highlightPosTagsInEditor } from "./parse";

export async function activate(context: vscode.ExtensionContext) {

  // 插件激活时，首次读取配置并初始化分词器
  await initializeSegmenter();
  // 监听配置更改。当用户切换分词器设置时，重新初始化。
  const disposableConfigListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('jieba.segmenter') || event.affectsConfiguration('jieba.intlSegmenterLocales')) {
      await initializeSegmenter();
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("jieba.forwardWord", forwardWord),
    vscode.commands.registerCommand("jieba.backwardWord", backwardWord),
    vscode.commands.registerCommand("jieba.forwardSelectWord", forwardSelectWord),
    vscode.commands.registerCommand("jieba.backwardSelectWord", backwardSelectWord),
    vscode.commands.registerCommand("jieba.killWord", killWord),
    vscode.commands.registerCommand("jieba.backwardKillWord", backwardKillWord),
    vscode.commands.registerCommand("jieba.selectWord", selectWord),
    vscode.commands.registerCommand("jieba.highlightPosTag", highlightPosTagsInEditor),
    vscode.window.onDidChangeTextEditorSelection(doubleClickOnTextListener),
    disposableConfigListener,
  );
}

// This method is called when your extension is deactivated
export function deactivate() { }
