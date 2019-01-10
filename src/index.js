const { logger } = require('./helpers/logger');
const { handleMessage } = require('./messageHandler');

const DELETION_TRIGGERS = ['SyntaxError', 'InvalidMessageError', 'InsufficientKarmaError'];

exports.handler = async (event) => {

  const { messageId, body } = event.Records[0];
  logger.info(`[RECEIVED][${messageId}] body: ${body}`);

  try {
    const message = JSON.parse(body);
    const { transactionHash, blockNumber } = await handleMessage(message);
    // By default if Lambda terminates gracefully, SQS deletes the message.
    // Note that callback is of the form (err, res), so if we pass null
    // as first argument it is considered a success.
    logger.info(`[PROCESSED][${messageId}] broadcast at Tx ${transactionHash}, block #${blockNumber}`);
    return { transactionHash, blockNumber };
  } catch (err) {
    if (DELETION_TRIGGERS.includes(err.name)) {
      logger.error(`[DELETED][${messageId}] caught error ${err.toString()}`);
      // Delete the message since it is invalid.
      return {};
    }
    // Fail so the message gets re-enqueued, by passing a non-null first
    // argument in the callback.
    logger.error(`[REENQUEUED][${messageId}] caught error ${err.toString()}`);
    throw err;
  }
};
