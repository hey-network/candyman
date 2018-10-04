import amqp from 'amqplib/callback_api';
import getPrivateKey from './helpers/rossignol';
import KarmaStoreManager from './contracts/karmaStoreManager';

const { QUEUE_ENDPOINT } = process.env;

async function getKarmaStoreManager(from) {
  const privateKey = await getPrivateKey(from);
  return KarmaStoreManager.createAsync(privateKey);
}

function extractMessageParams(msg) {
  const message = msg.content.toString();

  const [from, to, action] = message.split(' ');

  console.log('\x1b[32m', '💌   Received a new message!');
  console.log('\x1b[34m', '💁‍♂️   User rewarding (FROM):', from);
  console.log('\x1b[35m', '🙋‍♀️   User rewarded (TO):', to);
  console.log('\x1b[36m', '💎   Action:', action);

  return { from, to, action };
}

async function processRequest({ from, to, action }) {
  const karmaStore = await getKarmaStoreManager(from);
  await karmaStore.reward(to, action);
  const newBalance = await karmaStore.getIncrementalKarma(to);

  console.log('\x1b[33m', '💰   The rewarded user karma balance is now:', newBalance);
  console.log('\x1b[0m', '\n');
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

    console.log('\x1b[32m', '💡   Waiting for messages...To exit press CTRL+C');
    console.log('\x1b[0m', '\n');

    channel.consume(queue, async (msg) => {
      try {
        await handleMessage(msg);
        channel.ack(msg);
      } catch (err) {
        console.log(err.toString());
        channel.nack(msg);
      }
    }, { noAck: false });
  });
});
