import amqp from 'amqplib/callback_api'
import { getPrivateKey } from './helpers/rossignol'
import { KarmaStoreManager } from './contracts/karmaStoreManager'

async function getKarmaStoreManager (from) {
  const privateKey = await getPrivateKey(from)
  return await KarmaStoreManager.createAsync(privateKey)
}

async function processRequest (from, to, action) {
  const karmaStore = await getKarmaStoreManager(from)
  await karmaStore.reward(to, action)
  const newBalance = await karmaStore.getIncrementalKarma(to)

  console.log('\x1b[33m', '💰   The rewarded user karma balance is now:', newBalance)
  console.log('\x1b[0m', '\n')
}

function extractMessageParams (msg) {
  const message = msg.content.toString()
  const data = message.split(' ')

  const from   = data[0]
  const to     = data[1]
  const action = data[2]

  console.log('\x1b[32m', '💌   Received a new message!')
  console.log('\x1b[34m', '💁‍♂️   User rewarding (FROM):', from)
  console.log('\x1b[35m', '🙋‍♀️   User rewarded (TO):', to)
  console.log('\x1b[36m', '💎   Action:', action)

  return { from, to, action }
}

const QUEUE_ENDPOINT = process.env.QUEUE_ENDPOINT

amqp.connect(QUEUE_ENDPOINT, function(err, conn) {
  conn.createChannel(function(err, ch) {
    const q = process.env.QUEUE_NAME

    ch.assertQueue(q, { durable: true })
    ch.prefetch(1)

    console.log('\x1b[32m', '💡   Waiting for messages...To exit press CTRL+C')
    console.log('\x1b[0m', '\n')

    ch.consume(q, async function(msg) {
      const { from, to, action } = extractMessageParams(msg)
      try {
        await processRequest(from, to, action)
        ch.ack(msg)
      } catch (err) {
        console.log(err.toString())
        ch.nack(msg)
      }
    }, { noAck: false })
  })
})
