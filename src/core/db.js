import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DBManager {
  constructor(targetDir) {
    this.targetDir = targetDir;
    this.contextualizerDir = path.join(targetDir, '.contextualizer');
    this.dbPath = path.join(this.contextualizerDir, 'metadata.db');
    this.db = null;
  }

  init() {
    if (!fs.existsSync(this.contextualizerDir)) {
      fs.mkdirSync(this.contextualizerDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filepath TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        last_indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        node_type TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_files_filepath ON files(filepath);
      CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
    `);
  }

  saveFileChunks(filepath, hash, chunksArr) {
    const transaction = this.db.transaction((fp, hsh, chunks) => {
      const insertFile = this.db.prepare(`
        INSERT INTO files (filepath, hash, last_indexed_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(filepath) DO UPDATE SET
          hash = excluded.hash,
          last_indexed_at = CURRENT_TIMESTAMP
      `);
      
      insertFile.run(fp, hsh);
      
      const fileRow = this.db.prepare('SELECT id FROM files WHERE filepath = ?').get(fp);
      const fileId = fileRow.id;

      this.db.prepare('DELETE FROM chunks WHERE file_id = ?').run(fileId);

      const insertChunk = this.db.prepare(`
        INSERT INTO chunks (file_id, node_type, start_line, end_line, content)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        insertChunk.run(fileId, chunk.type, chunk.startLine, chunk.endLine, chunk.text);
      }
    });

    transaction(filepath, hash, chunksArr);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
