import axios from 'axios';
import logger from './logger';

const { ROSSIGNOL_GETTER_ENDPOINT, ROSSIGNOL_GETTER_API_KEY } = process.env;

const buildURL = address => `${ROSSIGNOL_GETTER_ENDPOINT}?address=${address}`;

const config = {
  method: 'GET',
  headers: {
    'X-Api-Key': ROSSIGNOL_GETTER_API_KEY,
  },
};

class AddressNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.name = 'AddressNotFoundError';
  }
}

async function getPrivateKey(address) {
  try {
    logger.debug(`Rossignol request initiated for ${address}`);
    const response = await axios.get(buildURL(address), config);
    logger.debug(`Rossignol request for ${address} had response status ${response.status}`);
    return response.data.data.private_key;
  } catch (err) {
    if (err.message.toString().includes(404)) {
      throw new AddressNotFoundError('FROM address does not exist in Rossignol DB');
    } else {
      throw err;
    }
  }
}

export default getPrivateKey;
