import { Command } from 'commander';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { getFileHash } from './utils/hash.js';
import { walkDirectory } from './utils/walker.js';
import { CacheManager } from './core/cache.js';
import { WorkerPool } from './core/pool.js';
import { DBManager } from './core/db.js';

export function createCli() {
  const program = new Command();

  program
    .name('contextualizer')
    .description('Local semantic search engine for codebases')
    .version('1.0.0');

  program
    .command('index')
    .description('Index a codebase directory')
    .argument('<dir>', 'Directory path to index')
    .option('-w, --workers <count>', 'Number of worker threads', (val) => parseInt(val, 10))
    .action(async (dir, options) => {
      const startTime = Date.now();
      const defaultWorkers = Math.min(4, Math.max(1, os.cpus().length - 1));
      const workers = options.workers || defaultWorkers;
      const targetDir = path.resolve(dir);
      
      console.log(`[CLI] Initializing indexing for directory: ${targetDir}`);
      console.log(`[CLI] Worker threads allocated: ${workers}`);

      const cacheManager = new CacheManager(targetDir);
      await cacheManager.load();

      const workerScriptUrl = new URL('./core/worker.js', import.meta.url);
      const pool = new WorkerPool(workers, workerScriptUrl);

      const dbManager = new DBManager(targetDir);
      dbManager.init();

      const files = await walkDirectory(targetDir);
      
      let newOrModified = 0;
      let unchanged = 0;
      let totalChunks = 0;

      const tasks = [];

      for (let i = 0; i < files.length; i += workers) {
        const batch = files.slice(i, i + workers);
        await Promise.all(batch.map(async (file) => {
          const hash = await getFileHash(file);
          const relativePath = path.relative(targetDir, file);
          if (cacheManager.isUnchanged(relativePath, hash)) {
            unchanged++;
          } else {
            cacheManager.update(relativePath, hash);
            newOrModified++;
            
            if (/\.(js|mjs|cjs)$/.test(file)) {
              tasks.push(
                pool.runTask(file).then(result => {
                  return { relativePath, hash, chunks: result.chunks };
                })
              );
            }
          }
        }));
      }

      try {
        const results = await Promise.all(tasks);
        for (const result of results) {
          totalChunks += result.chunks.length;
          dbManager.saveFileChunks(result.relativePath, result.hash, result.chunks);
        }
      } catch (err) {
        console.error('[CLI] Error during semantic extraction:', err);
      } finally {
        pool.destroy();
        dbManager.close();
      }

      await cacheManager.save();

      const durationMs = Date.now() - startTime;
      const durationSec = (durationMs / 1000).toFixed(2);

      console.log(`[CLI] Total files found: ${files.length}`);
      console.log(`[CLI] Number of new/modified files: ${newOrModified}`);
      console.log(`[CLI] Number of unchanged files (skipped): ${unchanged}`);
      console.log(`[CLI] Total semantic chunks extracted: ${totalChunks}`);
      console.log(`[CLI] Total execution time: ${durationSec}s`);
    });

  program
    .command('status')
    .description('Check cache drift and indexing status without writing updates')
    .argument('<dir>', 'Directory path to check')
    .action((dir) => {
      console.log(`[CLI] Checking indexing status for directory: ${dir}`);
    });

  program
    .command('search')
    .description('Search indexed code using natural language queries')
    .argument('<query>', 'Natural language search query')
    .argument('<dir>', 'Directory path of the indexed codebase')
    .option('--json', 'Output results in raw JSON format', false)
    .action((query, dir, options) => {
      console.log(`[CLI] Executing semantic search in: ${dir}`);
      console.log(`[CLI] Query: "${query}"`);
      console.log(`[CLI] JSON Output Mode: ${options.json}`);
    });

  return program;
}
