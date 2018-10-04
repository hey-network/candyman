import axios from 'axios';

const { ROSSIGNOL_GETTER_ENDPOINT, ROSSIGNOL_GETTER_API_KEY } = process.env;

const buildURL = address => `${ROSSIGNOL_GETTER_ENDPOINT}?address=${address}`;

const config = {
  method: 'GET',
  headers: {
    'X-Api-Key': ROSSIGNOL_GETTER_API_KEY,
  },
};

export default async function getPrivateKey(address) {
  try {
    const response = await axios.get(buildURL(address), config);
    return response.data.private_key;
  } catch (err) {
    throw err;
  }
}
