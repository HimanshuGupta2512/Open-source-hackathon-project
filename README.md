# Codebase Contextualizer CLI

A high-performance, completely local semantic search engine for your codebase. 

Traditional AI coding assistants send your proprietary code to cloud APIs. This tool takes a different approach: it uses local AST parsing and on-device machine learning to semantically index your repository, allowing you to search your code using natural language with zero data leaving your machine.

## 🚀 Key Features
* **100% Local Processing:** Uses `@xenova/transformers` to generate vector embeddings directly on your CPU. No API keys, no cloud data leaks.
* **AST-Aware Extraction:** Leverages `web-tree-sitter` (WASM) to intelligently chunk code by functions, classes, and methods, rather than arbitrary line breaks.
* **Multi-Threaded Indexing:** Utilizes native Node.js `worker_threads` to process heavy parsing and vector math concurrently.
* **High-Speed Storage:** Embeddings and metadata are persisted locally using `better-sqlite3` configured with Write-Ahead Logging (WAL) for lightning-fast concurrent transactions.
* **Smart Caching:** Avoids redundant processing by hashing files and only re-indexing what has changed.

## 🛠️ Prerequisites
* **Node.js:** Version 18.0.0 or higher.
* **Git:** For cloning the repository.

## 📦 Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/HimanshuGupta2512/Open-source-hackathon-project.git
cd codebase-contextualizer-cli
```

2. **Install dependencies:**
```bash
npm install
```

3. **Link the CLI (Optional but recommended):**
This allows you to run the tool globally across any project on your machine.
```bash
npm link
```

## 💻 Usage

If you linked the package, you can use the `contextualizer` command. Otherwise, use `node index.js`.

**1. Index a directory:**
Run this in the root of any codebase to build the local vector database.
```bash
contextualizer index .
```
*(Optional: specify worker threads with `-w <count>`)*

**2. Search your code:**
Use natural language to find specific logic.
```bash
contextualizer search "how is the database connection handled?" .
```

**3. Output raw JSON for pipeline integration:**
```bash
contextualizer search "authentication logic" . --json
```

**4. Check indexing status:**
See cache drift without writing updates.
```bash
contextualizer status .
```

## 🏗️ System Architecture
1. **CLI Router:** Parses commands via `commander`.
2. **Cache Manager:** Streams SHA-256 hashes to detect modified files.
3. **Worker Pool:** Dispatches files to background threads.
4. **Parser & Extractor:** WASM-powered Tree-sitter builds an AST and extracts semantic chunks via Breadth-First Search.
5. **Embedding Pipeline:** `all-MiniLM-L6-v2` converts chunks into Float32Arrays.
6. **Storage Engine:** SQLite bulk-inserts metadata and JSON-stringified vectors.
7. **Search Engine:** Calculates high-dimensional cosine similarity for top-K matching.
