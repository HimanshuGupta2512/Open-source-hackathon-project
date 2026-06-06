import path from 'path';

let parserInstance = null;

export async function parseCode(sourceCode) {
  if (!parserInstance) {
    // Dynamically import and unwrap the module safely
    const tsModule = await import('web-tree-sitter');
    const Parser = tsModule.default || tsModule.Parser || tsModule;

    // Initialize the parser
    await Parser.init();
    parserInstance = new Parser();

    // Ensure absolute pathing to the WASM file
    const wasmPath = path.join(process.cwd(), 'tree-sitter-javascript.wasm');
    const Lang = await Parser.Language.load(wasmPath);
    parserInstance.setLanguage(Lang);
  }
  return parserInstance.parse(sourceCode);
}
