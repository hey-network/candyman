import axios from 'axios'

const ENDPOINT = process.env.ROSSIGNOL_GETTER_ENDPOINT
const API_KEY = process.env.ROSSIGNOL_GETTER_API_KEY

const buildURL = (address) => `${ENDPOINT}?address=${address}`

const config = {
  method: 'GET',
  headers: {
    'X-Api-Key': API_KEY
  }
}

export const getPrivateKey = async (address) => {
  try {
    const response = await axios.get(buildURL(address), config)
    return response.data.private_key
  } catch (err) {
    throw err
  }
}
