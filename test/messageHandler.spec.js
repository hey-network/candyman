const { describe, it } = require('mocha');
const { expect } = require('chai');
const nock = require('nock');
const { handleMessage } = require("../src/messageHandler");

const {
  ROSSIGNOL_GETTER_ENDPOINT,
  SIDECHAIN_ENDPOINT,
} = process.env;

/**
 * Makes heavy use of nock to avoid having to run an actual Loom instance.
 * Note that all calls have been recorded using nock.recorder.rec() initially,
 * then replaying these requests.
 * The requests to Loom are actually Tendermint protocol requests, using
 * Protobuf as the data format protocol.
 * Where request/response parameters were clearly understood, their value has
 * been programmatically calculated (e.g. base64 encoding of the txHash).
 */
describe('handleMessage()', () => {
  const fromAddress = '0x324866ffcabd24346911b1272a1eac252a462a32';
  const toAddress = '0x35440595db89302123f6115a2dcf2aa826a0163a';
  const action = 'receive_like';

  const txHashBytes = 'c56a2a5aa860f68c172bb92ff4413e0beb89982c011a370ce3b66a54031acc83';
  const txHash = '0x' + txHashBytes;
  const b64TxHash = Buffer.from(txHashBytes, 'hex').toString('base64');

  const message = {
    content: `${fromAddress} ${toAddress} ${action}`,
  };

  it('when provided with a correct message, should post a reward transaction to the KarmaStore smart contract', async () => {
    // PRIVATE KEY RETRIEVAL
    nock(ROSSIGNOL_GETTER_ENDPOINT)
    .get('')
    .query({
      "address": fromAddress
    })
    .reply(200, {
      "success": true,
      "message": "Address account data successfully retrieved from Rossignol DB",
      "data": {
        "private_key":"PWXJeeVGmttsB4nbyYcIjeOYyyIqCUG/J1cErKcXR1X7igJQE1tyOssdQZu9QKMJLI4PlfNWts6OsdPN2GC77Q==",
        "public_key":"+4oCUBNbcjrLHUGbvUCjCSyOD5XzVrbOjrHTzdhgu+0=",
        "address":"0x324866ffcabd24346911b1272a1eac252a462a32"
      }
    });
    // CLIENT SETUP
    nock(SIDECHAIN_ENDPOINT)
    .post('/query', {
      "jsonrpc": "2.0",
      "method": "nonce",
      "params": {
        "key": "FB8A0250135B723ACB1D419BBD40A3092C8E0F95F356B6CE8EB1D3CDD860BBED"
      },
      "id":"1"
    })
    .reply(200, {
      "jsonrpc":"2.0",
      "id":"1",
      "result":"0"
    });
    // REWARD TRANSACTION SENDING
    nock(SIDECHAIN_ENDPOINT)
      .post('/rpc', {
        "jsonrpc": "2.0",
        "method": "broadcast_tx_commit",
        "params": ["CpYBCpEBCAISjAEKHwoHZGVmYXVsdBIUljVinyovl2vRjOUbg0gcpAb1WgMSHwoHZGVmYXVsdBIUMkhm/8q9JDRpEbEnKh6sJSpGKjIaSAgBEkT7QQHAAAAAAAAAAAAAAAAANUQFlduJMCEj9hFaLc8qqCagFjpyZWNlaXZlX2xpa2UAAAAAAAAAAAAAAAAAAAAAAAAAABABEkDBl9svx4U3VJm6f6XtTuTozitNeST8jdDhe4fuFvqQ4lu0yrdIivwsYmFss6x5WZXOxnV9oglvRQVQh3gKBO8BGiD7igJQE1tyOssdQZu9QKMJLI4PlfNWts6OsdPN2GC77Q=="],
        "id":
        "1"
      })
      .reply(200, {
        "jsonrpc": "2.0",
        "id": "1",
        "result": {
          "check_tx": {
            "fee": {}
          },
          "deliver_tx":{
            "data": b64TxHash,
            "fee": {}
          },
          "hash": "2319BD22D1DB7E215E549A2F02BA645F0A3C18CA",
          "height": "253"
        }
      });
    // GET TRANSACTION RECEIPT HASH
    nock(SIDECHAIN_ENDPOINT)
    .post('/query', {
      "jsonrpc": "2.0",
      "method": "evmtxreceipt",
      "params": {
        // Note that this hash is the one retrieved from deliver_tx above
        "txHash": b64TxHash
      },
      "id": "2"
    })
    .reply(200, {
      "jsonrpc": "2.0",
      "id": "2",
      "result": "CAESFOHn1joGGi9I+n9/hJO3XEUO13C1GP0BMhSWNWKfKi+Xa9GM5RuDSBykBvVaA0gBUiDFaipaqGD2jBcruS/0QT4L64mYLAEaNwzjtmpUAxrMg1ofCgdkZWZhdWx0EhQySGb/yr0kNGkRsScqHqwlKkYqMg=="
    });

    const result = await handleMessage(message);
    // We use .to.eql instead of .to.be.equal as it allows for objects comparison
    expect(result).to.eql(txHash);
    // This is an assertion that will fail if any of the nock mocks declared
    // above has not been called in the course of the spec.
    nock.isDone();
  });
});
