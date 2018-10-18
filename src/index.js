const { logger } = require('./helpers/logger');
const { handleMessage } = require('./messageHandler');

exports.handler = async (event) => {
  const { body } = event.Records[0];
  logger.info(`Received message: ${body}`);
  const message = JSON.parse(body);
  await handleMessage(message);
  return {};
  // event.Records.forEach((record) => {

      // .then(() => {
      //   logger.info(`Success handling message`);
      //   // By default if Lambda terminates gracefully, SQS deletes the message.
      //   // Note that callback is of the form (err, res), so if we pass null
      //   // as first argument it is considered a success.
      //   callback(null, 'success');
      // })
      // .catch((err) => {
      //   if (err.name === 'InvalidMessageError') {
      //     logger.error(err.toString());
      //     // Delete the message since it is invalid.
      //     callback(null, err.toString());
      //   } else {
      //     // Fail so the message gets re-enqueued, by passing a non-null first
      //     // argument in the callback.
      //     logger.error(err.toString());
      //     callback(err.toString());
      //   }
      // });
  // });
};
