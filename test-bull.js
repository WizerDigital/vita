import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
const redis = new Redis({ maxRetriesPerRequest: null });
const queue = new Queue('test', { connection: redis });
const worker = new Worker('test', async job => {
  await new Promise(r => setTimeout(r, 2000));
}, { connection: redis });

async function run() {
  await queue.add('test', {}, { jobId: 'job_1', delay: 100 });
  await new Promise(r => setTimeout(r, 150)); // let it start
  const job = await queue.getJob('job_1');
  if (job) {
    console.log('Job state:', await job.getState());
    try {
      await job.remove();
      console.log('Removed successfully');
    } catch(e) {
      console.log('Remove error:', e.message);
    }
  } else {
    console.log('Job not found');
  }
  process.exit(0);
}
run();
