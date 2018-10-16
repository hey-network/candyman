import Web3 from 'web3';
import logger from '../helpers/logger';
import { asciiToHex } from '../helpers/utils';

const {
  createJSONRPCClient,
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  CryptoUtils,
  LoomProvider,
} = require('loom-js');

const { SIDECHAIN_ENDPOINT, SIDECHAIN_KARMA_CONTRACT_ADDRESS } = process.env;
const ABI = require('./KarmaStore.json').abi;

const ACTIONS_WHITELIST = [
  'receive_like',
  'receive_follower',
  'invite_user',
];

export function actionWhitelisted(action) {
  return ACTIONS_WHITELIST.includes(action);
}

export class KarmaStoreManager {
  static async createAsync(b64PrivateKey) {
    const privateKey = CryptoUtils.B64ToUint8Array(b64PrivateKey);
    const publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey);


    const client = new Client(
      'default',
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
    return this.contract.methods.getReward(asciiToHex(action)).call({ from: this.from });
  }

  async getKarmaAsync(address) {
    return this.contract.methods.getKarma(address).call({ from: this.from });
  }

  async getIncrementalKarmaAsync(address) {
    return this.contract.methods.getIncrementalKarma(address).call({ from: this.from });
  }

  async getIncrementedUsersCountAsync() {
    return this.contract.methods.getIncrementedUsersCount().call({ from: this.from });
  }

  async rewardAsync(to, action) {
    return this.contract.methods.reward(to, asciiToHex(action)).send({ from: this.from });
  }
}
