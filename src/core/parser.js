import Parser from 'web-tree-sitter';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let parserInstance = null;

export async function parseCode(sourceCode) {
  if (!parserInstance) {
    await Parser.init();
    parserInstance = new Parser();
    const wasmPath = path.join(__dirname, '../../tree-sitter-javascript.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parserInstance.setLanguage(lang);
  }
  return parserInstance.parse(sourceCode);
}
