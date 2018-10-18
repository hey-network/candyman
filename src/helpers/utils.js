const Web3 = require('web3');

const ERRORS = {
  already_subscribed: 'Error on broadcastTxCommit: failed to subscribe to tx: already subscribed',
  already_in_cache: 'Error on broadcastTxCommit: Tx already exists in cache',
};

const asciiToHex = string => Web3.utils.asciiToHex(string);

const toBigNumber = number => Web3.utils.toBN(number);

const isAddress = address => Web3.utils.isAddress(address);

module.exports = {
  ERRORS,
  asciiToHex,
  toBigNumber,
  isAddress,
};
