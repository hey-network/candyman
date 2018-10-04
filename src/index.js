import amqp from 'amqplib/callback_api';
import getPrivateKey from './helpers/rossignol';
import KarmaStoreManager from './contracts/karmaStoreManager';
import logger from './helpers/logger';
import InvalidMessageError from './helpers/errors';
import { isAddress } from './helpers/utils';

const { QUEUE_ENDPOINT } = process.env;

function extractMessageParams(msg) {
  const message = msg.content.toString();

  const [from, to, action] = message.split(' ');

  if (!isAddress(from)) throw new InvalidMessageError('Invalid FROM address');
  if (!isAddress(to)) throw new InvalidMessageError('Invalid TO address');
  if (from === to) throw new InvalidMessageError('Identical FROM and TO address');

  logger.debug(`User rewarding: ${from}`);
  logger.debug(`User rewarded: ${to}`);
  logger.debug(`Action: ${action}`);

  return { from, to, action };
}

async function getKarmaStoreManager(from) {
  const privateKey = await getPrivateKey(from);
  return KarmaStoreManager.createAsync(privateKey);
}

async function processRequest({ from, to, action }) {
  const karmaStore = await getKarmaStoreManager(from);
  const { transactionHash } = await karmaStore.rewardAsync(to, action);
  logger.info(`Reward transaction for address ${to} at tx ${transactionHash}`);
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
});
