const { logger } = require('./helpers/logger');
const { getPrivateKey } = require('./helpers/rossignol');
const { actionWhitelisted, KarmaStoreManager } = require('./contracts/karmaStoreManager');
const { isAddress } = require('./helpers/utils');

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
    from, to, action, model_id: model,
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

async function processMessage({
  from, to, action, model,
}) {
  const karmaStore = await getKarmaStoreManager(from);
  const { transactionHash, blockNumber } = await karmaStore.rewardAsync(to, action, model);
  logger.info(`Reward transaction for address ${to} at tx ${transactionHash}`);
  return { transactionHash, blockNumber };
}

async function handleMessage(msg) {
  const message = parseMessage(msg);
  return processMessage(message);
}

module.exports = {
  handleMessage,
};
