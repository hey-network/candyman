import axios from 'axios';
import logger from './logger';
import InvalidMessageError from './errors';

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
    logger.debug(`Rossignol request initiated for ${address}`);
    const response = await axios.get(buildURL(address), config);
    logger.debug(`Rossignol request for ${address} had response status ${response.status}`);
    return response.data.data.private_key;
  } catch (err) {
    if (err.message.toString().includes(404)) {
      throw new InvalidMessageError('FROM address does not exist in Rossignol DB');
    } else {
      throw err;
    }
  }
}
