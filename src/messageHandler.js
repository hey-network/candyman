import logger from './helpers/logger';
import getPrivateKey from './helpers/rossignol';
import { actionWhitelisted, KarmaStoreManager } from './contracts/karmaStoreManager';
import { isAddress } from './helpers/utils';

class InvalidMessageError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = 'InvalidMessageError';
  }
}

function parseMessage(msg) {
  if (!msg) throw new InvalidMessageError('Cannot parse null message');

  const {
    from, to, action, model,
  } = msg;

  if (!from) throw new InvalidMessageError('Missing \'from\' value');
  if (!isAddress(from)) throw new InvalidMessageError('Invalid \'from\' value');
  if (!to) throw new InvalidMessageError('Missing \'to\' value');
  if (!isAddress(to)) throw new InvalidMessageError('Invalid \'to\' value');
  if (from === to) throw new InvalidMessageError('Identical \'from\' and \'to\' values');
  if (!action) throw new InvalidMessageError('Missing \'action\' value');
  if (!actionWhitelisted(action)) throw new InvalidMessageError('Invalid \'action\', not included in whitelist');
  if (!model) throw new InvalidMessageError('Missing \'model\' value');

  logger.debug(`User rewarding: ${from}`);
  logger.debug(`User rewarded: ${to}`);
  logger.debug(`Action: ${action}`);
  logger.debug(`Model: ${model}`);

  return {
    from, to, action, model,
  };
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

async function handleMessage(msg) {
  const message = parseMessage(msg);
  return processMessage(message);
}

exports.handleMessage = handleMessage;
