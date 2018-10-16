#!/usr/bin/env node
import amqp from 'amqp';
import logger from './helpers/logger';
import { handleMessage } from './messageHandler';

//  ██████╗ ██████╗ ███╗   ██╗███████╗██╗   ██╗███╗   ███╗███████╗██████╗
// ██╔════╝██╔═══██╗████╗  ██║██╔════╝██║   ██║████╗ ████║██╔════╝██╔══██╗
// ██║     ██║   ██║██╔██╗ ██║███████╗██║   ██║██╔████╔██║█████╗  ██████╔╝
// ██║     ██║   ██║██║╚██╗██║╚════██║██║   ██║██║╚██╔╝██║██╔══╝  ██╔══██╗
// ╚██████╗╚██████╔╝██║ ╚████║███████║╚██████╔╝██║ ╚═╝ ██║███████╗██║  ██║
//  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝

//                   __ _
//   ___ ___  _ __  / _(_) __ _
//  / __/ _ \| '_ \| |_| |/ _` |
// | (_| (_) | | | |  _| | (_| |
//  \___\___/|_| |_|_| |_|\__, |
//                        |___/

const PRFX = '_';
const EXCHANGE_NAME = `${PRFX}exchange`;
const QUEUE_NAME = `${PRFX}main_queue`;
const MAIN_ROUTE = `${PRFX}main_route`;
const CONNECTION_CONF = {
  host: process.env.QUEUE_HOST,
  port: process.env.QUEUE_PORT,
  login: process.env.QUEUE_LOGIN,
  password: process.env.QUEUE_PASSWORD,
  connectionTimeout: 10000,
  authMechanism: 'PLAIN',
  vhost: '/',
  noDelay: true,
  ssl: {
    enabled: false,
  },
};

// Local references to connection, the exchange, the queue and the consumer tag
let _connection;
let _consumerTag;
let _messageProcessed = false;

//  _       _ _
// (_)_ __ (_) |_
// | | '_ \| | __|
// | | | | | | |_
// |_|_| |_|_|\__|

function __init() {
  _connection.exchange(EXCHANGE_NAME, {
    type: 'direct',
    durable: true,
    confirm: true,
    autoDelete: false,
    mandatory: true,
  }, (exchange) => {
    logger.info(`Exchange ${EXCHANGE_NAME} ready`);
    _connection.queue(QUEUE_NAME, {
      durable: true,
      autoDelete: false,
    }, (queue) => {
      // Bind to the exchange
      queue.bind(EXCHANGE_NAME, MAIN_ROUTE);

      // Subscribe to the queue
      queue.subscribe({
        ack: true,
        prefetchCount: 1,
      }, (message) => {
        //  _ __ ___   ___  ___ ___  __ _  __ _  ___
        // | '_ ` _ \ / _ \/ __/ __|/ _` |/ _` |/ _ \
        // | | | | | |  __/\__ \__ \ (_| | (_| |  __/
        // |_| |_| |_|\___||___/___/\__,_|\__, |\___|
        //   ___ __ _| |_ ___| |__   ___ _|___/
        //  / __/ _` | __/ __| '_ \ / _ \ '__|
        // | (_| (_| | || (__| | | |  __/ |
        //  \___\__,_|\__\___|_| |_|\___|_|
        logger.info(`Received message: ${JSON.stringify(message)}`);
        handleMessage(message)
          .then(() => {
            _messageProcessed = true;
            // Do not reject and do not requeue since we processed the message
            queue.shift(false, false);
          })
          .catch((err) => {
            if (err.name === 'InvalidMessageError') {
              logger.error(err.toString());
              // Reject and do not requeue since the message is invalid
              queue.shift(true, false);
            } else {
              logger.error(err.toString());
              // Reject and do requeue since the message is valid but
              // we somehow could not handle it
              queue.shift(true, true);
            }
          });
      })
      // this is not necessary, except if you need to unsubscribe (let's say
      // during a server maintenance for instance)
        .addCallback((res) => {
          logger.info(`Queue ${QUEUE_NAME} successfully bond to exchange ${EXCHANGE_NAME}.`);
          // Hold on to the consumer tag so we can unsubscribe later
          _consumerTag = res.consumerTag;
        });
    });
  });
}

//                                  _   _
//   ___ ___  _ __  _ __   ___  ___| |_(_) ___  _ __
//  / __/ _ \| '_ \| '_ \ / _ \/ __| __| |/ _ \| '_ \
// | (_| (_) | | | | | | |  __/ (__| |_| | (_) | | | |
//  \___\___/|_| |_|_| |_|\___|\___|\__|_|\___/|_| |_|

_connection = amqp.createConnection(CONNECTION_CONF);

// server connection error
_connection.on('error', (err) => {
  logger.error(err.toString());
});

_connection.on('ready', __init);
