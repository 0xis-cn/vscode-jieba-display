import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import {
  backwardKillWord,
  backwardSelectWord,
  backwardWord,
  forwardSelectWord,
  forwardWord,
  killWord,
} from "../../command";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Basic test", basicTest);
  test("English test", englishTest);
  test("Javascript expression test", jsExpTest);
  test("Selection test", selectionTest);
});

const chnText = "“自由软件”尊重用户的自由，并且尊重整个社区。";

const engText =
  "“Free software” means software that respects users' freedom and community. ";

const jsExpText = `(value === 0 && text === "sample text") || 
value === 1 ||
text.length > 100`;

const chnText2 = `自由软件的定义
四项基本自由
自由软件 可以 是商业软件
澄清自由和非自由的边界
按照自己意愿运行程序的自由
学习源代码并做出修改的自由
按照自己意愿分发软件的自由：基本要求
Copyleft
打包和发行的详细规则
出口条列
法律考虑
基于合同的许可证`;

async function basicTest() {
  const doc = await vscode.workspace.openTextDocument();
  await vscode.window.showTextDocument(doc);
  const editor = vscode.window.activeTextEditor;
  assert.ok(editor !== undefined);

  const startPos = new vscode.Position(0, 0);
  await editor.edit((edit) => {
    edit.insert(startPos, chnText);
  });
  editor.selection = new vscode.Selection(startPos, startPos);

  for (let i = 0; i < 3; i++) {
    forwardWord();
  }
  // 光标在"尊"字上
  assert.strictEqual(editor.selection.start.character, 6);

  for (let i = 0; i < 3; i++) {
    forwardWord();
  }
  // 光标在“自”字上
  assert.strictEqual(editor.selection.start.character, 11);

  await killWord();
  assert.strictEqual(editor.selection.start.character, 11);
  assert.strictEqual(
    editor.document.getText(
      new vscode.Range(new vscode.Position(0, 11), new vscode.Position(0, 14)),
    ),
    "，并且",
  );

  for (let i = 0; i < 3; i++) {
    backwardWord();
  }
  for (let i = 0; i < 3; i++) {
    await backwardKillWord();
  }
  assert.ok(editor.selection.start.isEqual(new vscode.Position(0, 0)));
}

async function englishTest() {
  const doc = await vscode.workspace.openTextDocument();
  await vscode.window.showTextDocument(doc);
  const editor = vscode.window.activeTextEditor;
  assert.ok(editor !== undefined);

  const startPos = new vscode.Position(0, 0);
  await editor.edit((edit) => {
    edit.insert(startPos, engText);
  });
  editor.selection = new vscode.Selection(startPos, startPos);

  for (let i = 0; i < 20; i++) {
    forwardWord();
  }

  assert.strictEqual(
    editor.selection.start.isEqual(editor.document.lineAt(0).range.end),
    true,
  );

  await killWord();

  for (let i = 0; i < 5; i++) {
    backwardWord();
  }
  for (let i = 0; i < 20; i++) {
    await backwardKillWord();
  }

  assert.strictEqual(
    editor.selection.start.isEqual(editor.document.lineAt(0).range.start),
    true,
  );
}

async function jsExpTest() {
  const doc = await vscode.workspace.openTextDocument();
  await vscode.window.showTextDocument(doc);
  const editor = vscode.window.activeTextEditor;
  assert.ok(editor !== undefined);

  const startPos = new vscode.Position(0, 0);
  await editor.edit((edit) => {
    edit.insert(startPos, jsExpText);
  });
  editor.selection = new vscode.Selection(startPos, startPos);

  for (let i = 0; i < 5; i++) {
    forwardWord();
  }

  // 在`"sample text"`后面的`"`上
  assert.strictEqual(
    editor.selection.start.isEqual(new vscode.Position(0, 37)),
    true,
  );

  for (let i = 0; i < 3; i++) {
    backwardWord();
  }

  // 在`text ===`开头的`t`上
  assert.strictEqual(
    editor.selection.start.isEqual(new vscode.Position(0, 16)),
    true,
  );

  for (let i = 0; i < 50; i++) {
    forwardWord();
  }

  assert.strictEqual(
    editor.selection.start.isEqual(editor.document.lineAt(2).range.end),
    true,
  );

  for (let i = 0; i < 50; i++) {
    backwardWord();
  }

  assert.strictEqual(
    editor.selection.start.isEqual(editor.document.lineAt(0).range.start),
    true,
  );
}

async function selectionTest() {
  const doc = await vscode.workspace.openTextDocument();
  await vscode.window.showTextDocument(doc);
  const editor = vscode.window.activeTextEditor;
  assert.ok(editor !== undefined);

  const startPos = new vscode.Position(0, 0);
  await editor.edit((edit) => {
    edit.insert(startPos, chnText2);
  });
  const endPos = editor.document.lineAt(editor.document.lineCount - 1).range.end;
  editor.selection = new vscode.Selection(startPos, startPos);

  for (let i = 0; i < 100; i++) {
    forwardSelectWord();
  }

  assert.strictEqual(
    editor.selection.isEqual(new vscode.Selection(startPos, endPos)),
    true,
  );

  for (let i = 0; i < 100; i++) {
    backwardSelectWord();
  }

  assert.strictEqual(
    editor.selection.isEqual(new vscode.Selection(startPos, startPos)),
    true,
  );
}