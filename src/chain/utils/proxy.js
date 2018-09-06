import Web3 from 'web3'
import rossignol from './rossignol'
import { createJSONRPCClient, Client, CryptoUtils, LocalAddress, LoomProvider } from 'loom-js'

export const ERRORS = {
  already_subscribed: 'Error on broadcastTxCommit: failed to subscribe to tx: already subscribed',
  already_in_cache: 'Error on broadcastTxCommit: Tx already exists in cache'
}

const ENDPOINT = process.env.SIDECHAIN_ENDPOINT

const writeUrl = `${ENDPOINT}/rpc`
const readUrl = `${ENDPOINT}/query`

const writer = createJSONRPCClient({ protocols: [{ url: writeUrl }] })
const reader = createJSONRPCClient({ protocols: [{ url: readUrl }] })
const client = new Client('default', writer, reader)

const defaultPrivateKey = CryptoUtils.generatePrivateKey()
const defaultPublicKey = CryptoUtils.publicKeyFromPrivateKey(defaultPrivateKey)
const defaultFrom = LocalAddress.fromPublicKey(defaultPublicKey).toString()

export class Contract {
  constructor(abi, address) {
    this.abi = abi
    this.address = address
    this.defaultFrom = defaultFrom
  }

  async getInstance (from = defaultFrom) {
    const privateKey = (( from === defaultFrom ) ? defaultPrivateKey : (await rossignol.getPrivateKey(from)))
    const web3 = new Web3(new LoomProvider(client, privateKey))
    return new web3.eth.Contract(this.abi, this.address)
  }
}

export const toBytes = (string) => {
  return Web3.utils.asciiToHex(string)
}

export const toBigNumber = (number) => {
  return Web3.utils.toBN(number)
}
