import { Command } from 'commander';
import os from 'os';

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
    .action((dir, options) => {
      const defaultWorkers = Math.min(4, Math.max(1, os.cpus().length - 1));
      const workers = options.workers || defaultWorkers;
      console.log(`[CLI] Initializing indexing for directory: ${dir}`);
      console.log(`[CLI] Worker threads allocated: ${workers}`);
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
