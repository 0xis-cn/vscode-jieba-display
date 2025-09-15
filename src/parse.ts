import { tokenize } from "@stevenlin/jieba-wasm";

export function parseSentence(sentence: string) {
  return tokenize(sentence, "default", true);
}