import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const Parser = require('web-tree-sitter');

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
