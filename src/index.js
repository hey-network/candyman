const { logger } = require('./helpers/logger');
const { handleMessage } = require('./messageHandler');

exports.handler = async (event, context, callback) => {
  const { body } = event.Records[0];
  logger.info(`Received message: ${body}`);
  const message = JSON.parse(body);
  try {
    await handleMessage(message);
    // By default if Lambda terminates gracefully, SQS deletes the message.
    // Note that callback is of the form (err, res), so if we pass null
    // as first argument it is considered a success.
    logger.info('Successfully processed message');
    callback(null, 'message processed');
  } catch(err) {
    if (['InvalidMessageError', 'InsufficientKarmaError'].includes(err.name)) {
      logger.error(`Caught error ${err.name}: ${err.toString()}`);
      // Delete the message since it is invalid.
      callback(null, 'message deleted');
    } else {
      // Fail so the message gets re-enqueued, by passing a non-null first
      // argument in the callback.
      logger.error(`Caught error ${err.name}: ${err.toString()}`);
      callback('message reenqueued');
    }
  }
};
