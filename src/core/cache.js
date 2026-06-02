import fs from 'fs/promises';
import path from 'path';

export class CacheManager {
  constructor(targetDir) {
    this.targetDir = targetDir;
    this.contextualizerDir = path.join(targetDir, '.contextualizer');
    this.cacheFile = path.join(this.contextualizerDir, 'cache.json');
    this.cache = {};
  }

  async load() {
    try {
      await fs.mkdir(this.contextualizerDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }

    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      this.cache = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.cache = {};
      } else {
        throw error;
      }
    }
  }

  isUnchanged(filePath, hash) {
    return this.cache[filePath] === hash;
  }

  update(filePath, hash) {
    this.cache[filePath] = hash;
  }

  async save() {
    await fs.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
  }
}
