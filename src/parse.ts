import { tokenize, Token } from "@stevenlin/jieba-wasm";
import QuickLRU from 'quick-lru';

const cache = new QuickLRU<String, Token[]>({ maxSize: 25 });

export function parseSentence(sentence: string): Token[] {
  if (cache.has(sentence)) {
    return cache.get(sentence)!;
  }
  const tokens = tokenize(sentence, "default", true);
  cache.set(sentence, tokens);
  return tokens;
}