const { logger } = require('./helpers/logger');
const { handleMessage } = require('./messageHandler');

exports.handler = async (event) => {
  const { body } = event.Records[0];
  logger.info(`Received message: ${body}`);
  const message = JSON.parse(body);
  try {
    const txHash = await handleMessage(message);
    // By default if Lambda terminates gracefully, SQS deletes the message.
    // Note that callback is of the form (err, res), so if we pass null
    // as first argument it is considered a success.
    logger.info(`Message processed: broadcast at Tx ${txHash}`);
    return { txHash };
  } catch (err) {
    if (['InvalidMessageError', 'InsufficientKarmaError'].includes(err.name)) {
      logger.error(`Message deleted: caught error ${err.toString()}`);
      // Delete the message since it is invalid.
      return {};
    }
    // Fail so the message gets re-enqueued, by passing a non-null first
    // argument in the callback.
    logger.error(`Message sent back to queue: caught error ${err.toString()}`);
    throw err;
  }
};
