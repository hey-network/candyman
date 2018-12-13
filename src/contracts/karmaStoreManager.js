const Web3 = require('web3');
const {
  createJSONRPCClient,
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  CryptoUtils,
  LoomProvider,
} = require('loom-js');
const { logger } = require('../helpers/logger');
const { asciiToHex } = require('../helpers/utils');

const {
  SIDECHAIN_NETWORK,
  SIDECHAIN_ENDPOINT,
  SIDECHAIN_KARMA_CONTRACT_ADDRESS,
} = process.env;
const ABI = require('./KarmaStore.json').abi;

const ACTIONS_WHITELIST = [
  'receive_like',
  'receive_follower',
  'invite_user',
];

class InsufficientKarmaError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
    this.name = 'InsufficientKarmaError';
  }
}

function actionWhitelisted(action) {
  return ACTIONS_WHITELIST.includes(action);
}

class KarmaStoreManager {
  static async createAsync(b64PrivateKey) {
    const privateKey = CryptoUtils.B64ToUint8Array(b64PrivateKey);
    const publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey);

    const client = new Client(
      SIDECHAIN_NETWORK,
      createJSONRPCClient({ protocols: [{ url: `${SIDECHAIN_ENDPOINT}/rpc` }] }),
      createJSONRPCClient({ protocols: [{ url: `${SIDECHAIN_ENDPOINT}/query` }] }),
    );

    // required middleware
    client.txMiddleware = [
      new NonceTxMiddleware(publicKey, client),
      new SignedTxMiddleware(privateKey),
    ];

    const from = LocalAddress.fromPublicKey(publicKey).toString();
    const web3 = new Web3(new LoomProvider(client, privateKey));

    client.on('error', (msg) => {
      logger.error('Error on connect to client', msg);
      logger.error('Please verify if loom command is running');
    });

    const contract = new web3.eth.Contract(
      ABI,
      SIDECHAIN_KARMA_CONTRACT_ADDRESS,
      { from },
    );

    return new KarmaStoreManager(client, contract, web3, from);
  }

  constructor(client, contract, web3, from) {
    this.client = client;
    this.contract = contract;
    this.web3 = web3;
    this.from = from;
  }

  getContractAddress() {
    return this.contract.options.address;
  }

  async getRewardAsync(action) {
    return this.contract.methods
      .getReward(asciiToHex(action))
      .call({ from: this.from });
  }

  async getKarmaAsync(address) {
    return this.contract.methods
      .getKarma(address)
      .call({ from: this.from });
  }

  async getIncrementalKarmaAsync(address) {
    return this.contract.methods
      .getIncrementalKarma(address)
      .call({ from: this.from });
  }

  async getIncrementedUsersCountAsync() {
    return this.contract.methods
      .getIncrementedUsersCount()
      .call({ from: this.from });
  }

  async rewardAsync(to, action, modelId) {
    try {
      // We use return on await here because we want to catch the error from
      // here, not from the calling function.
      return await this.contract.methods
        .reward(to, asciiToHex(action), asciiToHex(modelId))
        .send({ from: this.from });
    } catch (err) {
      if (err.toString().includes('origin has no karma')) {
        throw new InsufficientKarmaError('sending address has no karma');
      } else {
        throw err;
      }
    }
  }
}

module.exports = {
  actionWhitelisted,
  KarmaStoreManager,
};
