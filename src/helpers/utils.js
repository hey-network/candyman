import Web3 from 'web3';

export const ERRORS = {
  already_subscribed: 'Error on broadcastTxCommit: failed to subscribe to tx: already subscribed',
  already_in_cache: 'Error on broadcastTxCommit: Tx already exists in cache',
};

export const asciiToHex = string => Web3.utils.asciiToHex(string);

export const toBigNumber = number => Web3.utils.toBN(number);
