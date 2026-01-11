
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../jobs/redis.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const QUEUE_NAME = process.env.BULLMQ_QUEUE_NAME || 'ai-analysis';

async function diagnose() {
    console.log('🔍 Starting Queue Diagnosis...');
    console.log('--------------------------------');

    const queue = new Queue(QUEUE_NAME, { connection: redisConnection });

    // 1. Check Redis Connection
    try {
        const ping = await redisConnection.ping();
        console.log('✅ Redis Connection:', ping);
    } catch (e) {
        console.error('❌ Redis Connection Failed:', e);
        process.exit(1);
    }

    // 2. Check Queue Counts
    const counts = await queue.getJobCounts();
    console.log('📊 Current Queue Counts:', counts);

    // 3. Add a Test Job
    console.log('📤 Adding a TEST job...');
    const job = await queue.add('AI_TEST_JOB', { test: true, timestamp: Date.now() });
    console.log('✅ Job Added with ID:', job.id);

    // 4. Create a temporary worker to consume it
    console.log('👷 Starting temporary worker to consume test job...');
    const worker = new Worker(QUEUE_NAME, async (job) => {
        console.log('📥 Worker received job:', job.name, job.id);
        return { processed: true };
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        console.log('✅ Test Job Completed:', job.id);
        process.exit(0);
    });

    worker.on('failed', (job, err) => {
        console.error('❌ Test Job Failed:', err);
        process.exit(1);
    });

    // Timeout if not processed
    setTimeout(() => {
        console.error('⏰ Timeout awaiting job processing. Is another worker stealing it?');
        // process.exit(1);
    }, 5000);
}

diagnose();
