import amqp from 'amqplib/callback_api';
import logger from './helpers/logger';
import { handleMessage } from './messageHandler';

const { QUEUE_ENDPOINT } = process.env;

amqp.connect(QUEUE_ENDPOINT, (connErr, connection) => {
  if (connErr) {
    logger.error(`Could not connect to queue: ${connErr.message}`);
  } else {
    connection.createChannel((channErr, channel) => {
      const queue = process.env.QUEUE_NAME;

      channel.assertQueue(queue, { durable: true });
      channel.prefetch(1);

      logger.info(`Listening for messages on queue ${queue} from ${QUEUE_ENDPOINT}`);

      channel.consume(queue, async (msg) => {
        try {
          logger.info(`Received message: ${msg.content.toString()}`);
          await handleMessage(msg);
          channel.ack(msg);
        } catch (err) {
          if (err.name === 'InvalidMessageError') {
            logger.error(err.toString());
            channel.ack(msg);
          } else {
            logger.error(err.toString());
            channel.nack(msg);
          }
        }
      }, { noAck: false });
    });
  }
});
