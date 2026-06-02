import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';

const ALWAYS_IGNORE = ['node_modules', '.git', '.contextualizer'];

export async function walkDirectory(dirPath) {
  const ig = ignore().add(ALWAYS_IGNORE);

  try {
    const gitignorePath = path.join(dirPath, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    const promises = entries.map(async (entry) => {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dirPath, fullPath);
      const posixPath = relativePath.split(path.sep).join('/');

      const checkPath = entry.isDirectory() ? `${posixPath}/` : posixPath;

      if (ig.ignores(posixPath) || (entry.isDirectory() && ig.ignores(checkPath))) {
        return;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    });

    await Promise.all(promises);
  }

  await walk(dirPath);
  return results;
}
