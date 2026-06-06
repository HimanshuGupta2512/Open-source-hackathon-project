import { Parser } from 'web-tree-sitter';
import path from 'path';

let parserInstance = null;

export async function parseCode(sourceCode) {
  if (!parserInstance) {
    await Parser.init();
    parserInstance = new Parser();
    const Lang = await Parser.Language.load(path.join(process.cwd(), 'tree-sitter-javascript.wasm'));
    parserInstance.setLanguage(Lang);
  }
  return parserInstance.parse(sourceCode);
}
