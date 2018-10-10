import logger from './helpers/logger';
import { getPrivateKey } from './helpers/rossignol';
import { actionWhitelisted, KarmaStoreManager } from './contracts/karmaStoreManager';
import { isAddress } from './helpers/utils';

const PARAMS_COUNT = 3;
const PARAMS_SEPARATOR = ' ';

class InvalidMessageError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = 'InvalidMessageError';
  }
}

function parseMessage(msg) {
  const payload = msg.content.toString();
  const payloadParams = payload.split(PARAMS_SEPARATOR);

  if (payloadParams.length !== PARAMS_COUNT) throw new InvalidMessageError('Message must be of the form "FROM TO ACTION" separated by spaces');

  const [from, to, action] = payloadParams;

  if (!isAddress(from)) throw new InvalidMessageError('Invalid FROM address');
  if (!isAddress(to)) throw new InvalidMessageError('Invalid TO address');
  if (from === to) throw new InvalidMessageError('Identical FROM and TO address');
  if (!actionWhitelisted(action)) throw new InvalidMessageError('ACTION not included in whitelist');

  logger.debug(`User rewarding: ${from}`);
  logger.debug(`User rewarded: ${to}`);
  logger.debug(`Action: ${action}`);

  return { from, to, action };
}

async function getKarmaStoreManager(from) {
  const privateKey = await getPrivateKey(from);
  return KarmaStoreManager.createAsync(privateKey);
}

async function processMessage({ from, to, action }) {
  const karmaStore = await getKarmaStoreManager(from);
  const { transactionHash } = await karmaStore.rewardAsync(to, action);
  logger.info(`Reward transaction for address ${to} at tx ${transactionHash}`);
  return transactionHash;
}

module.exports = {
  handleMessage: async function(msg) {
    const message = parseMessage(msg);
    return await processMessage(message);
  }
}
