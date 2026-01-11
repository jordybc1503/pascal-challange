
import { aiQueue } from '../jobs/queue.js';
import { logger } from '../utils/logger.js';
import { redisConnection } from '../jobs/redis.js';

async function clear() {
    console.log('🧹 Clearing Queue...');
    await aiQueue.obliterate({ force: true });
    console.log('✅ Queue obliterated.');
    process.exit(0);
}

clear();
