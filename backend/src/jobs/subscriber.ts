import IORedis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../sockets/socket.js';

let subscriber: IORedis | null = null;

export const initializeSubscriber = () => {
    if (subscriber) return;

    subscriber = new IORedis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
    });

    subscriber.on('connect', () => {
        logger.info('Redis Subscriber connected');
    });

    subscriber.subscribe('socket:emit', (err) => {
        if (err) {
            logger.error({ err }, 'Failed to subscribe to socket:emit channel');
        } else {
            logger.info('Subscribed to socket:emit channel');
        }
    });

    subscriber.on('message', (channel, message) => {
        if (channel === 'socket:emit') {
            try {
                const payload = JSON.parse(message);
                const { room, event, data } = payload;

                const io = getIO();
                if (room) {
                    io.to(room).emit(event, data);
                } else {
                    io.emit(event, data);
                }

                logger.debug({ room, event }, 'Re-broadcasted event from Redis');
            } catch (error) {
                logger.error({ error, message }, 'Error processing Redis message');
            }
        }
    });
};
