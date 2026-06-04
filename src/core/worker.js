import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import { parseCode } from './parser.js';
import { extractSemantics } from './extractor.js';

parentPort.on('message', async (message) => {
  const { taskId, filePath } = message;
  try {
    const sourceCode = await fs.readFile(filePath, 'utf8');
    const ast = await parseCode(sourceCode);
    const chunks = extractSemantics(ast.rootNode, sourceCode);
    parentPort.postMessage({ taskId, payload: { success: true, filePath, chunks } });
  } catch (error) {
    parentPort.postMessage({ taskId, payload: { success: false, filePath, error: error.message } });
  }
});
