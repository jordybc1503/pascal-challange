import { redisConnection } from './redis.js';
import { logger } from '../utils/logger.js';

export const publishEvent = async (channel: string, message: any) => {
    try {
        const payload = JSON.stringify(message);
        await redisConnection.publish(channel, payload);
        logger.debug({ channel }, 'Published event to Redis');
    } catch (error) {
        logger.error({ error, channel }, 'Failed to publish event to Redis');
    }
};
