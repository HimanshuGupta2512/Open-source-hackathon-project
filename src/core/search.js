import { pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';
import path from 'path';
import { cosineSimilarity } from '../utils/math.js';

let embedderPipeline = null;

async function getEmbedder() {
  if (!embedderPipeline) {
    embedderPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedderPipeline;
}

export async function executeSearch(queryText, targetDir, options = {}) {
  const embedder = await getEmbedder();
  const output = await embedder(queryText, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data);

  const dbPath = path.join(path.resolve(targetDir), '.contextualizer', 'metadata.db');
  const db = new Database(dbPath, { readonly: true });

  const rows = db.prepare(`
    SELECT chunks.content, chunks.start_line, chunks.end_line, chunks.embedding, files.filepath
    FROM chunks
    JOIN files ON chunks.file_id = files.id
  `).all();

  const results = [];

  for (const row of rows) {
    if (!row.embedding) continue;
    const chunkEmbedding = JSON.parse(row.embedding);
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    results.push({
      score,
      filepath: row.filepath,
      startLine: row.start_line,
      endLine: row.end_line,
      content: row.content,
    });
  }

  db.close();

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}
