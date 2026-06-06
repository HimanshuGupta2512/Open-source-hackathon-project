import { pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';
import path from 'path';
import { cosineSimilarity } from '../src/utils/math.js';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  const query = 'connect to the database';
  const targetDir = './';
  
  console.log(`[Benchmark] Loading local embedding model...`);
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });

  console.log(`[Benchmark] Vectorizing mock query...`);
  const output = await embedder(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data);

  console.log(`[Benchmark] Opening SQLite database...`);
  const dbPath = path.join(path.resolve(targetDir), '.contextualizer', 'metadata.db');
  const db = new Database(dbPath, { readonly: true });

  const rows = db.prepare(`
    SELECT chunks.content, chunks.start_line, chunks.end_line, chunks.embedding, files.filepath
    FROM chunks
    JOIN files ON chunks.file_id = files.id
  `).all();

  console.log(`[Benchmark] Running 1,000 consecutive scans...`);
  const latencies = [];
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const results = [];
    for (const row of rows) {
      if (!row.embedding) continue;
      const chunkEmbedding = JSON.parse(row.embedding);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      results.push({ score, filepath: row.filepath });
    }
    results.sort((a, b) => b.score - a.score);
    const top5 = results.slice(0, 5);
    
    const end = performance.now();
    latencies.push(end - start);
  }

  db.close();

  latencies.sort((a, b) => a - b);
  
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p90 = latencies[Math.floor(latencies.length * 0.90)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log(`\n--- Latency Benchmark Results ---`);
  console.log(`Average: ${avg.toFixed(2)} ms`);
  console.log(`p50 (Median): ${p50.toFixed(2)} ms`);
  console.log(`p90: ${p90.toFixed(2)} ms`);
  console.log(`p95: ${p95.toFixed(2)} ms`);
  console.log(`---------------------------------`);
}

runBenchmark().catch(console.error);
