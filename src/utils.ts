import { parseSentence } from "./parse";

/**
 * 查找字符串中第一个“内容字符”（非空格、非ASCII符号）的索引。
 * @param text 要搜索的字符串。
 * @returns 第一个内容字符的索引，如果不存在则返回 undefined。
 */
export function findFirstContentChar(text: string): number | undefined {
  const result = text.search(/[^\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/);
  return result === -1 ? undefined : result;
}

/**
 * 查找字符串中最后一个“内容字符”（非空格、非ASCII符号）的索引。
 * @param text 要搜索的字符串。
 * @returns 最后一个内容字符的索引，如果不存在则返回 undefined。
 */
export function findLastContentChar(text: string): number | undefined {
  const match = text.match(/([^\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E])[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]*$/);
  return match?.index;
}

/**
 * 检查单个字符是否是“空白字符”或“ASCII符号”。
 * @param c 要检查的单个字符。
 */
export function isWhiteSpaceOrAsciiSymbol(c: string): boolean {
  return /^[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]$/.test(c);
}

/**
 * 从字符串开头跳过所有空格和ASCII符号，找到第一个单词（由字母、数字、下划线组成），
 * 并返回该单词结束后的位置索引。如果字符串以CJK字符开头，则匹配失败。
 * @param text 要搜索的字符串。
 */
export function findEndOfFirstNonCJKWord(text: string): number | undefined {
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
export function findStartOfLastNonCJKWord(text: string): number | undefined {
  const match = text.match(/\b\w+(?<![\u4e00-\u9fff])[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]*$/);
  if (match === null) {
    return undefined;
  }
  return text.length - match[0].length;
}

export function findWordStartPosition(charPos: number, lineText: string): number | undefined {
  const wordStartPos = findStartOfLastNonCJKWord(lineText.slice(0, charPos));

  // non CJK context
  if (wordStartPos !== undefined) {
    return wordStartPos;
  }

  /*
   * in CJK context
   * jump to the beginning of the word
   * and mark range(the beginning of the word, cursor) for deletion
   */
  const tokens = parseSentence(lineText);
  const target = tokens.find((token) => {
    return token.start < charPos && token.end >= charPos;
  });
  return target?.start;
}

export function findWordEndPosition(charPos: number, lineText: string): number | undefined {
  const wordEndPos = findEndOfFirstNonCJKWord(lineText.slice(charPos));

  // non-CJK context
  if (wordEndPos !== undefined) {
    return charPos + wordEndPos;
  }

  /*
   * in CJK-context
   * jump to the end of the word
   * and mark range(cursor, end of the word + 1) for deletion.
   */
  const tokens = parseSentence(lineText);
  const target = tokens.find((token) => {
    return token.start <= charPos && token.end > charPos;
  });
  return target?.end;
}