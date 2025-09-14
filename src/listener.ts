import * as vscode from "vscode";
import { findWordEndPosition, findWordStartPosition } from "./utils";

let lastClickTimestamp = 0;
let prevEditor: vscode.TextEditor | undefined;
let prevSelection: vscode.Selection | undefined;
let timer: NodeJS.Timeout | undefined;

export async function doubleClickOnTextListener(e: vscode.TextEditorSelectionChangeEvent) {
    const config = vscode.workspace.getConfiguration('jieba');
    const enableOnDoubleClick = config.get('enableOnDoubleClick', false);
    if (!enableOnDoubleClick) {
        return;
    }
    const clicksInterval = config.get('clicksInterval', 500);
    const triggerDelay = config.get('triggerDelay', 150);

    // 方法来自： https://github.com/antfu/vscode-smart-clicks/blob/main/src/index.ts
    // MIT License
    // Copyright (c) 2021 Anthony Fu https://github.com/antfu
    // 解释：
    // vscode中，如果两次点击的光标位置完全相同，编辑器识别出这是一个“双击”手势，于是执行默认的双击操作——选中光标所在的整个单词（以设置中的 editor.wordSeparators 为界）。
    // 因此，在第一次鼠标点击后保存当前光标位置，在第二次点击触发vscode自带的选中操作后，重新执行自定义的选中操作即可。

    clearTimeout(timer);

    // 1. 只处理鼠标点击
    if (e.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
        lastClickTimestamp = 0;
        return;
    }

    const selection = e.selections[0];

    // 2. 判断是否是有效的连续点击
    if (!(
        prevEditor !== e.textEditor                  // 编辑器已切换
        || !prevSelection                           // 没有上一次的选区
        || !prevSelection.isEmpty                   // 上一次不是光标，而是一个范围选择
        || e.selections.length !== 1                // 当前是多光标模式
        || selection.start.line !== prevSelection.start.line // 点击的不是同一行
        || Date.now() - lastClickTimestamp > clicksInterval // 两次点击间隔太长
    )) {
        // 当前的prevSelection作为参数传入
        timer = setTimeout((prevSelection) => {
            // 捕获当前的start
            try {
                const start = prevSelection!.start;
                const lineNum = start.line;
                const lineText = vscode.window.activeTextEditor!.document.lineAt(lineNum).text;

                const wordStartPos = findWordStartPosition(start.character + 1, lineText);
                if (wordStartPos === undefined) {
                    return;
                }
                const wordStart = new vscode.Position(lineNum, wordStartPos);

                const wordEndPos = findWordEndPosition(start.character, lineText);
                if (wordEndPos === undefined) {
                    return;
                }
                const wordEnd = new vscode.Position(lineNum, wordEndPos);

                e.textEditor.selections = [new vscode.Selection(wordStart, wordEnd)];

            } finally {
                lastClickTimestamp = 0;
            }
        }, triggerDelay, prevSelection);
    }
    // 3. 无论如何，都更新状态以备下次使用
    prevEditor = e.textEditor;
    prevSelection = selection;
    lastClickTimestamp = Date.now();
}