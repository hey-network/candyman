# CandyMan

CandyMan is a serverless Nodejs app that watches an AWS SQS queue in order to create transactions on the KarmaStore smart contract. It connects to Rossignol to retrieve private keys and sign the transactions.

## Overview
This application consumes messages from an AWS SQS queue, and performs blockchain sidechain transactions accordingly. Its primary business role is to reward users for actions performed on the Hey network. For example, if Alice receives a like from Bob on the Hey network, the following message is broadcast to the queue:

```
{
    "action": "like",
    "model_id": "efi90dDJ99879dzJD8d2DKNedz976k3k2198ID",
    "from": "?publicaddress",
    "to": "?publicaddress",
    "recorded_at": "2018-10-15 14:23 UTC"
}
```

When Candyman sees this, it will fetch Bob's private key from the Rossignol service, then performs a rewarding transaction on the sidechain on behalf of Bob. Candyman solely interacts with the Karma Store smart contract.

## Deployment
CandyMan is a Nodejs application running on AWS Lambda with a `node 8.10` runtime.

Note that the app depends on `web3.js`, and this module uses natively compiled C libraries for cryptography (e.g. scrypt). These libraries must be compiled for the target machine on which they will run. Since Lambdas run on Linux, you need to use Docker to emulate this OS if you have a Mac machine. That is, before pushing the `node_modules` folder to the Lambda, run the following command: `npm run installTarget`. This will spin a docker instance and do all the heavy work for you.

You can then simply run `npm run deploy:staging`.

## ENV configuration
For the environment variables, you need the following `.env` config file (note that the karma smart contract address can easily be changed after you've deployed it on your chain instance):

```
SIDECHAIN_ENDPOINT=xxx
KARMA_CONTRACT_ADDRESS=xxx
ROSSIGNOL_GETTER_ENDPOINT=xxx
ROSSIGNOL_GETTER_API_KEY=xxx
```

## Testing
When running the tests locally, you first need to install the `node_modules` for your own machine. Then you can simply run `npm t` and enjoy.

## Various
Note that due to instabilities within the `web3.js` module, some noisy packages have to be installed along with the core ones we use (e.g. `websocket`).
