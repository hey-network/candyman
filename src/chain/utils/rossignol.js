import rp from 'request-promise-native'

const ENDPOINT = process.env.ROSSIGNOL_GETTER_ENDPOINT
const API_KEY  = process.env.ROSSIGNOL_GETTER_API_KEY

const OPTIONS = {
  method: 'GET',
  headers: {
    'X-Api-Key': API_KEY
  }
}

const rossignol = {
  async getPrivateKey (address) {
    try {
      const response = await rp(`${ENDPOINT}?address=${address}`, OPTIONS)
      const rawKey = JSON.parse(response).data.private_key
      return new Uint8Array(rawKey)
    } catch (err) {
      throw err
    }
  }
}

export default rossignol
