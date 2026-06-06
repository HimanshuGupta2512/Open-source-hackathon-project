import path from 'path';

let parserInstance = null;

export async function parseCode(sourceCode) {
  if (!parserInstance) {
    // Dynamically import and unwrap the module safely
    const tsModule = await import('web-tree-sitter');
    const Parser = tsModule.Parser || tsModule.default || tsModule;
    // Fallback supports both new API (named export) and old API (static property)
    const Language = tsModule.Language || Parser.Language; 

    // Initialize the parser
    await Parser.init();
    parserInstance = new Parser();

    // Ensure absolute pathing to the WASM file
    const wasmPath = path.join(process.cwd(), 'tree-sitter-javascript.wasm');
    const Lang = await Language.load(wasmPath);
    parserInstance.setLanguage(Lang);
  }
  return parserInstance.parse(sourceCode);
}
