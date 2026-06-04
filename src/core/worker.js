import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import { parseCode } from './parser.js';
import { extractSemantics } from './extractor.js';
import { pipeline } from '@xenova/transformers';

let embedderPipeline = null;

async function getEmbedder() {
  if (!embedderPipeline) {
    embedderPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedderPipeline;
}

parentPort.on('message', async (message) => {
  const { taskId, filePath } = message;
  try {
    const sourceCode = await fs.readFile(filePath, 'utf8');
    const ast = await parseCode(sourceCode);
    const chunks = extractSemantics(ast.rootNode, sourceCode);

    if (chunks.length > 0) {
      const embedder = await getEmbedder();
      for (const chunk of chunks) {
        const output = await embedder(chunk.text, { pooling: 'mean', normalize: true });
        chunk.embedding = Array.from(output.data);
      }
    }

    parentPort.postMessage({ taskId, payload: { success: true, filePath, chunks } });
  } catch (error) {
    parentPort.postMessage({ taskId, payload: { success: false, filePath, error: error.message } });
  }
});
