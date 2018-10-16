const { describe, it } = require('mocha');
const { expect } = require('chai');
const nock = require('nock');
const { handleMessage } = require('../src/messageHandler');

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
 # Note ultimately that what we are actually faking here are just the underlying
 * calls from Loom to the Tendermint core, which is used to store the Blockchain
 * verified data. In the end you can think of Tendermint as an augmented
 * key/value store ;)
 */
describe('handleMessage()', () => {
  const from = '0x324866ffcabd24346911b1272a1eac252a462a32';
  const to = '0x35440595db89302123f6115a2dcf2aa826a0163a';
  const action = 'receive_like';
  const model_id = '12345';

  const txHashBytes = 'c56a2a5aa860f68c172bb92ff4413e0beb89982c011a370ce3b66a54031acc83';
  const txHash = `0x${txHashBytes}`;
  const b64TxHash = Buffer.from(txHashBytes, 'hex').toString('base64');

  const message = {
    from, to, action, model_id,
  };

  it('when provided with a correct message, should post a reward transaction to the KarmaStore smart contract', async () => {
    // PRIVATE KEY RETRIEVAL
    nock(ROSSIGNOL_GETTER_ENDPOINT)
      .get('')
      .query({
        address: from,
      })
      .reply(200, {
        success: true,
        message: 'Address account data successfully retrieved from Rossignol DB',
        data: {
          private_key: 'PWXJeeVGmttsB4nbyYcIjeOYyyIqCUG/J1cErKcXR1X7igJQE1tyOssdQZu9QKMJLI4PlfNWts6OsdPN2GC77Q==',
          public_key: '+4oCUBNbcjrLHUGbvUCjCSyOD5XzVrbOjrHTzdhgu+0=',
          address: '0x324866ffcabd24346911b1272a1eac252a462a32',
        },
      });
    // CLIENT SETUP
    nock(SIDECHAIN_ENDPOINT)
      .post('/query', {
        jsonrpc: '2.0',
        method: 'nonce',
        params: {
          key: 'FB8A0250135B723ACB1D419BBD40A3092C8E0F95F356B6CE8EB1D3CDD860BBED',
        },
        id: '1',
      })
      .reply(200, {
        jsonrpc: '2.0',
        id: '1',
        result: '0',
      });
    // REWARD TRANSACTION SENDING
    // https://tendermint.readthedocs.io/en/v0.10.4/rpc.html#jsonrpc-http
    nock(SIDECHAIN_ENDPOINT)
      .post('/rpc', {
        jsonrpc: '2.0',
        method: 'broadcast_tx_commit',
        // The params object is basically a signed and protobuf-marshalled version
        // of the following Eth transaction payload. Note that the 'to' field is
        // the Karma Store smart contract address. All of this is directional.
        // { from: '0x324866ffcabd24346911b1272a1eac252a462a32',
        //   data:
        //    '0xfb4101c000000000000000000000000035440595db89302123f6115a2dcf2aa826a0163a726563656976655f6c696b650000000000000000000000000000000000000000',
        //   gasPrice: undefined,
        //   gas: undefined,
        //   to: '0x9635629f2a2f976bd18ce51b83481ca406f55a03' }
        params: ['CrYBCrEBCAISrAEKHwoHZGVmYXVsdBIUljVinyovl2vRjOUbg0gcpAb1WgMSHwoHZGVmYXVsdBIUMkhm/8q9JDRpEbEnKh6sJSpGKjIaaAgBEmT8M/HVAAAAAAAAAAAAAAAANUQFlduJMCEj9hFaLc8qqCagFjpyZWNlaXZlX2xpa2UAAAAAAAAAAAAAAAAAAAAAAAAAADEyMzQ1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAESQC95WSkY5o88HS3/f+H2VgqU4DNpwApq23C2qmgdxgTgAxzXGbuVOGCI41L430vmJBQVxiCpuOHptz2+9zTBCwsaIPuKAlATW3I6yx1Bm71Aowksjg+V81a2zo6x083YYLvt'],
        id:
        '1',
      })
      .reply(200, {
        jsonrpc: '2.0',
        id: '1',
        result: {
          check_tx: {
            fee: {},
          },
          deliver_tx: {
            data: b64TxHash,
            fee: {},
          },
          hash: '2319BD22D1DB7E215E549A2F02BA645F0A3C18CA',
          height: '253',
        },
      });
    // GET TRANSACTION RECEIPT HASH
    nock(SIDECHAIN_ENDPOINT)
      .post('/query', {
        jsonrpc: '2.0',
        method: 'evmtxreceipt',
        params: {
        // Note that this hash is the one retrieved from deliver_tx above
          txHash: b64TxHash,
        },
        id: '2',
      })
      .reply(200, {
        jsonrpc: '2.0',
        id: '2',
        // Also a protobuf-marshalled result, decoded by Loom in serializeBinaryToWriter
        result: 'CAESFOHn1joGGi9I+n9/hJO3XEUO13C1GP0BMhSWNWKfKi+Xa9GM5RuDSBykBvVaA0gBUiDFaipaqGD2jBcruS/0QT4L64mYLAEaNwzjtmpUAxrMg1ofCgdkZWZhdWx0EhQySGb/yr0kNGkRsScqHqwlKkYqMg==',
      });

    const result = await handleMessage(message);
    expect(result).to.be.equal(txHash);
    // This is an assertion that will fail if any of the nock mocks declared
    // above has not been called in the course of the spec.
    nock.isDone();
  });
});
