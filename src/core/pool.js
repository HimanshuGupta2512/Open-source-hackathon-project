import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';

export class WorkerPool extends EventEmitter {
  constructor(workerCount, workerScript) {
    super();
    this.workerCount = workerCount;
    this.workerScript = workerScript;
    this.workers = [];
    this.freeWorkers = [];
    this.taskQueue = [];
    this.taskCallbacks = new Map();
    this.taskIdCounter = 0;

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(this.workerScript);
      
      worker.on('message', (result) => {
        const { taskId, payload } = result;
        const callback = this.taskCallbacks.get(taskId);
        if (callback) {
          if (payload.success) {
            callback.resolve(payload);
          } else {
            callback.reject(new Error(payload.error));
          }
          this.taskCallbacks.delete(taskId);
        }
        
        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue.shift();
          this.assignTask(worker, nextTask);
        } else {
          this.freeWorkers.push(worker);
        }
      });

      worker.on('error', (err) => {
        console.error(`Worker error:`, err);
      });

      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  assignTask(worker, task) {
    const taskId = this.taskIdCounter++;
    this.taskCallbacks.set(taskId, { resolve: task.resolve, reject: task.reject });
    worker.postMessage({ taskId, filePath: task.filePath });
  }

  runTask(filePath) {
    return new Promise((resolve, reject) => {
      const task = { filePath, resolve, reject };
      if (this.freeWorkers.length > 0) {
        const worker = this.freeWorkers.pop();
        this.assignTask(worker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  destroy() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
