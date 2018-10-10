const { describe, it } = require('mocha');
const { expect } = require('chai');
const nock = require('nock');
const { handleMessage } = require("../src/messageHandler");

const { ROSSIGNOL_GETTER_ENDPOINT } = process.env;

describe('handleMessage()', () => {
  const fromAddress = '0x324866ffcabd24346911b1272a1eac252a462a32';
  const fromPrivateKey = 'PWXJeeVGmttsB4nbyYcIjeOYyyIqCUG/J1cErKcXR1X7igJQE1tyOssdQZu9QKMJLI4PlfNWts6OsdPN2GC77Q==';
  const toAddress = '0x35440595db89302123f6115a2dcf2aa826a0163a';
  const action = 'receive_like';
  const message = {
    content: `${fromAddress} ${toAddress} ${action}`,
  };

  it('when provided with a correct message, should post a reward transaction to the KarmaStore smart contract', async () => {
    nock(ROSSIGNOL_GETTER_ENDPOINT)
      .get('')
      .query({
        address: fromAddress,
      })
      .reply(200, {
        data: { private_key: fromPrivateKey },
      });

    const result = await handleMessage(message);
    // We use .to.eql instead of .to.be.equal as it allows for objects comparison
    expect(result).to.eql('lol');
    // This is an assertion that will fail if any of the nock mocks declared
    // above has not been called in the course of the spec.
    nock.isDone();
  });
});
