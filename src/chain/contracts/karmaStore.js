import { Contract, toBytes, ERRORS } from '../utils/proxy'
import { abi } from './KarmaStore.json'

const ADDRESS = process.env.KARMA_CONTRACT_ADDRESS

export class KarmaStore {
  /*
     ██████╗ ██████╗ ███╗   ██╗███████╗████████╗██████╗ ██╗   ██╗ ██████╗████████╗ ██████╗ ██████╗
    ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
    ██║     ██║   ██║██╔██╗ ██║███████╗   ██║   ██████╔╝██║   ██║██║        ██║   ██║   ██║██████╔╝
    ██║     ██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══██╗██║   ██║██║        ██║   ██║   ██║██╔══██╗
    ╚██████╗╚██████╔╝██║ ╚████║███████║   ██║   ██║  ██║╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║
     ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
  */
  constructor (address = ADDRESS) {
    this.address = address
    this.contract = new Contract(abi, address)
  }
  /*
     ██████╗ ███████╗████████╗████████╗███████╗██████╗ ███████╗
    ██╔════╝ ██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝
    ██║ ████╗█████╗     ██║      ██║   █████╗  ██████╔╝███████╗
    ██║   ██║██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗╚════██║
    ╚██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║███████║
     ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
  */
  async getReward (params) {
    return (await this.contract.getInstance()).methods.getReward(toBytes(params.action)).call({ from: this.contract.defaultFrom })
  }
  async getKarma (params) {
    return (await this.contract.getInstance()).methods.getKarma(params.address).call({ from: this.contract.defaultFrom })
  }
  async getIncrementalKarma (params) {
    return (await this.contract.getInstance()).methods.getIncrementalKarma(params.address).call({ from: this.contract.defaultFrom })
  }
  async getIncrementedUsersCount (params) {
    return (await this.contract.getInstance()).methods.getIncrementedUsersCount().call({ from: this.contract.defaultFrom })
  }
  /*
     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
    ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
    ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
    ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
    ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
  */
  async reward (params) {
    try {
      (await this.contract.getInstance(params.from)).methods.reward(params.to, toBytes(params.action)).send({ from: params.from })
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
