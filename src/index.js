import amqp from 'amqplib/callback_api';
import getPrivateKey from './helpers/rossignol';
import KarmaStoreManager from './contracts/karmaStoreManager';
import logger from './helpers/logger';
import { isAddress } from './helpers/utils';

const { QUEUE_ENDPOINT } = process.env;

async function getKarmaStoreManager(from) {
  const privateKey = await getPrivateKey(from);
  return KarmaStoreManager.createAsync(privateKey);
}

function extractMessageParams(msg) {
  const message = msg.content.toString();

  const [from, to, action] = message.split(' ');

  if (!isAddress(from)) throw new Error('Invalid FROM address');
  if (!isAddress(to)) throw new Error('Invalid TO address');
  if (from === to) throw new Error('Identical FROM and TO address');

  logger.debug(`User rewarding: ${from}`);
  logger.debug(`User rewarded: ${to}`);
  logger.debug(`Action: ${action}`);

  return { from, to, action };
}

async function processRequest({ from, to, action }) {
  const karmaStore = await getKarmaStoreManager(from);
  await karmaStore.rewardAsync(to, action);
  const balance = await karmaStore.getIncrementalKarmaAsync(to);

  logger.info(`Rewarded user karma balance is now: ${balance}`);
}

async function handleMessage(msg) {
  const params = extractMessageParams(msg);
  await processRequest(params);
}

amqp.connect(QUEUE_ENDPOINT, (connErr, connection) => {
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
        logger.error(err.toString());
        channel.nack(msg);
      }
    }, { noAck: false });
  });
});
