import Web3 from 'web3'
import { asciiToHex, ERRORS } from '../helpers/utils'

const {
  NonceTxMiddleware,
  SignedTxMiddleware,
  Client,
  LocalAddress,
  CryptoUtils,
  LoomProvider
} = require('loom-js/dist')

const SIDECHAIN_ENDPOINT = process.env.SIDECHAIN_ENDPOINT
const ADDRESS = process.env.KARMA_CONTRACT_ADDRESS
const ABI = require('./KarmaStore.json').abi

export default class KarmaStoreManager {
  static async createAsync(b64PrivateKey) {
    const privateKey = CryptoUtils.B64ToUint8Array(b64PrivateKey)
    const publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)

    const client = new Client(
      'default',
      `${SIDECHAIN_ENDPOINT}/websocket`,
      `${SIDECHAIN_ENDPOINT}/queryws`
    )

    // required middleware
    client.txMiddleware = [
      new NonceTxMiddleware(publicKey, client),
      new SignedTxMiddleware(privateKey)
    ]

    const from = LocalAddress.fromPublicKey(publicKey).toString()
    const web3 = new Web3(new LoomProvider(client, privateKey))

    const networkId = await web3.eth.net.getId()

    client.on('error', msg => {
      console.error('Error on connect to client', msg)
      console.warn('Please verify if loom command is running')
    })

    const contract = new web3.eth.Contract(
      ABI,
      ADDRESS,
      { from }
    )

    return new KarmaStoreManager(client, contract, web3, from)
  }

  constructor(client, contract, web3, from) {
    this._client = client
    this._contract = contract
    this._web3 = web3
    this._from = from
  }

  getContractAddress() {
    return this._contract.options.address
  }

  async getRewardAsync (action) {
    return await this._contract.methods.getReward(asciiToHex(action)).call({ from: this._from })
  }

  async getKarmaAsync (address) {
    return await this._contract.methods.getKarma(address).call({ from: this._from })
  }

  async getIncrementalKarmaAsync (address) {
    return await this._contract.methods.getIncrementalKarma(address).call({ from: this._from })
  }

  async getIncrementedUsersCountAsync () {
    return await this._contract.methods.getIncrementedUsersCount().call({ from: this._from })
  }

  async reward (to, action) {
    try {
      await this._contract.methods.reward(to, asciiToHex(action)).send({ from: this._from })
    } catch (err) {
      if (err.toString().includes(404)) {
        console.log('\x1b[31m', '⛔   Reward transaction FAILED and CANCELLED: Address does not exist in Rossignol DB')
      } else {
        let message
        if (err.toString().includes(502)) {
          message = 'Rossignol 502 server error, check Lambda CloudWatch logs'
        } else if (err.toString().includes(ERRORS.already_in_cache) || err.toString().includes(ERRORS.already_subscribed)) {
          message = 'Too many similar simultaneous transactions'
        }
        console.log('\x1b[31m', '⛔   Reward transaction FAILED and BOUNCED: ' + message)
        throw err
      }
    }
  }
}
