# Biconomy contest details
- Total Prize Pool: Sum of below awards
  - HM awards: $80,750 USDC
  - QA report awards: $8,500 USDC 
  - Gas report awards: $4,250 USDC
  - Judge + presort awards: $17,000 USDC
  - Scout awards: $500 USDC
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2022-12-biconomy-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts December 20, 2022 20:00 UTC
- Ends January 05, 2023 20:00 UTC

## C4udit / Publicly Known Issues

The C4audit output for the contest can be found [here](add link to report) within an hour of contest opening.

*Note for C4 wardens: Anything included in the C4udit output is considered a publicly known issue and is ineligible for awards.*

1. User are able to specify arbitrary `gasFeePaymentArgs` and can bypass fee payment: An off-chain check is performed by Biconomy's relayers to verify if enough gas fee has been paid before processing the transaction on the destination chain. Insufficient fee payment would result in the user's funds being locked on the source chain liquidity pool which dis-incentivises users from paying insufficient gas fee.

# Overview
## Introduction

Hyphen started as a liquidity bridge to solve the user pain point of moving assets from one chain to another. Solutions for the same existed in the past, but they were slow and inefficient. Hyphen is faster and relatively cheaper than the other solutions out there for the retail audience. Still, Hyphen as a whole is only solving the liquidity availability problem for dApps and users alike. Navigating the multi-chain world is still as complex for users as before.

Even after the liquidity movement, the user has to interact with the dApp smart contract for which they would need the native token for gas, and they would need to approve the dApp contract to allow them to use the funds and do any other action on the dApp. All of this is a UX nightmare, the users shouldn’t have to perform a million steps to onboard to a dApp, be it on any chain.

This is where Bridge & Call comes in as a holistic solution that can provide fast and cheap liquidity movement along with the ease of 1 click multi-chain transactions for the end users. The users don’t even have to think about destination chain gas tokens or smart contract approvals.  From liquidity layer to cross-chain simplification, Bridge & Call is the go-to solution for developers to thrive in the multi-chain world.

## Architecture

Bridge & Call enables transmitting a payload from the source chain to the destination chain. This payload consists of all the operations that need to be performed at the destination chain and the order in which those needs to be performed. The validity of the payload is ensured via external General Message Passing solutions. There are a lot of General Message Passing protocols out there, and they range from semi-centralized (Wormhole) to decentralized (Axelar), and all of them have their own caveats, capabilities, and trust assumptions. We didn’t want to tie ourselves to any of them and decided to create an aggregator layer (the CCMP layer) that could interact with any of these protocols. We currently provide integration with Wormhole and Hyperlane (with Axelar planned in the future) and can add any other protocol in the future if the need arises. The developers are free to choose any of them and can also change the protocol per call based on security and trust assumption needs.

![Architecture](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/09b1baa4-20e1-4147-8f98-271a8fd510e4/Diagram.drawio.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20221215%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20221215T103003Z&X-Amz-Expires=86400&X-Amz-Signature=ed1c73e0269f92698c71f21032c1ad0c9d61ddb8545c7280cf8b77f1762cc971&X-Amz-SignedHeaders=host&response-content-disposition=filename%3D%22Diagram.drawio.svg%22&x-id=GetObject)
any other protocol in the future if the need arises. The developers are free to choose any of them and can also change the protocol per call based on security and trust assumption needs.

The architecture as shown in the diagram above consists of both on-chain and off-chain components 

### On-Chain:

1. **CCMPGateway:** Smart contract responsible for 
    1. Receive cross-chain message transfer calls and route them through a configurable protocol (Wormhole, Axelar, Hyperlane …) on the source chain. 
    2. receiving, validating, and executing cross-chain message calls on the destination chain.
2. **ProtocolAdapter:** Adapter Contracts for each supported underlying message transport protocol (Wormhole, Axelar, Hyperlane…). Responsible for 
    1. receiving messages from CCMPGateway and routing them to the destination chain using the underlying protocol.
    2. expose functions for validating a message (and its signature) on the destination chain.
3. **Hyphen Liquidity Pool:** Our liquidity pool contracts, which internally talk to the CCMPGateway, are responsible for exposing the `depositAndCall` functionality.
4. **Executor:** Post verification, the CCMP Gateway forwards the messages to the Executor contracts, which executes the contents of the message on the exit chain. This implies for all contracts specified in the payload array, the Executor contract will be the `msg.sender` when the specified payload is executed.

### Off-Chain:

1. **Indexer**: Indexes all the supported blockchains and exposes API for cross-chain messages
2. **Relayer**: For Executing the fetched messages on the destination chain.
## Message Structure

A message sent through CCMP has the following format: 

```
{
  "hash": "0x0d306eaae20471889d5c06df139f4b47fce53e09da1ed4f603652bf46cab5fc3",
  "sender": "0x07d2d1690d13f5fd9f9d51a96cee211f6a845ac5",
  "sourceGateway": "0x53b309ff259e568309a19810e3bf1647b6922afd",
  "sourceAdaptor": "0x8c6ed76011b7d5ddcf8da88687c4b5a7a4b79165",
  "sourceChainId": "43113",
  "destinationGateway": "0x5db92fdac16d027a3fef6f438540b5818b6f66d5",
  "destinationChainId": "80001",
  "nonce": "14670593685062419975296469450205822900502679",
  "routerAdaptor": "wormhole",
  "gasFeePaymentArgs": {
    "feeTokenAddress": "0xc74db45a7d3416249763c151c6324ceb6b3217fd",
    "feeAmount": "10000000",
    "relayer": "0x0000000000000000000000000000000000000001"
  },
  "payload": [
    {
      "to": "0xb831f0848a055b146a0b13d54cffa6c1fe201b83",
      "_calldata": "0xfb7b8791000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000005f5e1000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000a759c8db00dadbe0599e3a38b19b5c0e12e43bbe00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "to": "0xa759c8db00dadbe0599e3a38b19b5c0e12e43bbe",
      "_calldata": "0x9c2bf952000000000000000000000000eabc4b91d9375796aa4f69cc764a4ab509080a5800000000000000000000000048e2577e5f781cbb3374912a31b1aa39c9e11d39000000000000000000000000fd210117f5b9d98eb710295e30fff77df2d80002000000000000000000000000f97859fb869329933b40f36a86e7e44f334ed16a000000000000000000000000da861c9dccff6d1fef7cae71b5b538af25063404"
    }
  ]
}
```

### Fields:

1. hash: A unique identifier of the CCMP Message, useful for tracking status and paying gas-fee.
2. sender: Address of the contract interacting with the CCMP Gateway to send messages.
3. sourceGateway: Address of the gateway on the source chain.
4. sourceAdaptor: Address of the protocol adaptor on the source chain.
5. sourceChainId: EVM Chain ID of the source chain.
6. destinationGateway: Address of the gateway on the destination chain.
7. nonce: Used to prevent message replay.
8. routerAdaptor: The underlying protocol to use for sending messages. Possible values: “**wormhole**”, “**axelar**”, “**hyperlane**”.
9. gasFeePaymentArgs: A structure describing the gas fee to be paid for verifying and executing the transaction on the destination chain. The gas fee required can be estimated on the chain by calling a relayer API.
10. payload: An array of messages to be executed on the destination chain.


# Scope

## CCMP (ccmp-contracts)

| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
| contracts/structures/CrossChainMessage.sol | 67 | Definitions for Cross Chain Message Structure |
| contracts/structures/Constants.sol | 6  | Defines constants like NATIVE token address
| contracts/structures/Wormhole.sol | 33 | Definitions for interacting with wormhole protocol contracts |
| contracts/security/Pausable.sol | 71 | Abstract contract for implementing pausibility | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| contracts/CCMPExecutor.sol | 33 | Handles CCMP Message Execution | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| contracts/libraries/LibDiamond.sol | 317 | Library for implementing the Diamond Pattern for CCMPGateway
| contracts/adaptors/WormholeAdaptor.sol | 159 | Protocol Adapter for sending and receiving messages via Wormhole Protocol | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| contracts/adaptors/HyperlaneAdaptor.sol | 183 |Protocol Adapter for sending and receiving messages via Hyperlane Protocol| [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| contracts/adaptors/AxelarAdaptor.sol | 186 |Protocol Adapter for sending and receiving messages via Axelar GMP Protocol| [`@openzeppelin/*`](https://openzeppelin.com/contracts/) [`@abacus-network/core/*`](https://github.com/hyperlane-xyz/hyperlane-monorepo/tree/main/solidity/contracts)|
| contracts/adaptors/base/CCMPAdaptorBase.sol | 38 | Abstract Contract for implementing protocol adaptors| [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| contracts/receiver/CCMPReceiverBase.sol | 30 | Abstract contract for implementing CCMPReceiver{Upgradeable/Non Upgradeable}
| contracts/receiver/CCMPReceiverUpgradeable.sol | 16 | Abstract Contract exposing functionality for source verification for a message on the destination chain during execution.
| contracts/receiver/CCMPReceiver.sol | 8  | Abstract Contract exposing functionality for source verification for a message on the destination chain during execution.
| contracts/gateway/facets/DiamondCutFacet.sol | 26 | Facet implenting standard Diamond Cut functionality
| contracts/gateway/facets/DiamondInit.sol | 38 | Facet for initializing the Diamond during deployment
| contracts/gateway/facets/CCMPReceiveMessageFacet.sol | 113 | Facet for processing messages on the destination chain
| contracts/gateway/facets/DiamondLoupeFacet.sol | 182 | Facet implenting standard Diamond Loupe functionality
| contracts/gateway/facets/CCMPSendMessageFacet.sol | 126 | Facet for processing messages on the source chain
| contracts/gateway/facets/CCMPConfigurationFacet.sol | 79 | Facet for setting configuration state like owner etc
| contracts/gateway/Diamond.sol | 69 | The Diamond Proxy Contract, an instance of this is used as CCMPGateway
| contracts/interfaces/IWormhole.sol | 25 |
| contracts/interfaces/IDiamondCut.sol | 20 |
| contracts/interfaces/ICCMPRouterAdaptor.sol | 15 |
| contracts/interfaces/ICCMPGateway.sol | 136 |
| contracts/interfaces/ICCMPExecutor.sol | 7  |
| contracts/interfaces/IAxelarGateway.sol | 133 |
| contracts/interfaces/IDiamondLoupe.sol | 40 |
| contracts/interfaces/IDiamond.sol | 20 |
| contracts/interfaces/IERC165.sol | 11 |
| contracts/interfaces/IERC173.sol | 8 |

## Hyphen (hyphen-contract)
| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
| contracts/hyphen/LiquidityPool.sol | 817 | Liquidity Pool exposes Deposit and Call functionality | [`@openzeppelin/*`](https://openzeppelin.com/contracts/), ccmp-contracts |
| contracts/hyphen/token/TokenManager.sol | 187 | Manages configuration for tokens supported in Hyphen | [`@openzeppelin/*`](https://openzeppelin.com/contracts/)
| contracts/hyphen/structures/DepositAndCall.sol | 22 | Defintions for DepositAndCall functions
| contracts/hyphen/interfaces/ITokenManager.sol | 29 |
| contracts/hyphen/interfaces/ICCMPGateway.sol | 20 |
| contracts/hyphen/interfaces/ILiquidityPool.sol | 28 |

## Out of scope

Any files not listed above should be considered out of scope and assumed to be bug free.

## Scoping Details 
```
- If you have a public code repo, please share it here:  https://github.com/bcnmy/hyphen-contract, https://github.com/bcnmy/ccmp-contracts
- How many contracts are in scope?:   36
- Total SLoC for these contracts?:  3295
- How many external imports are there?:  9
- How many separate interfaces and struct definitions are there for the contracts within scope?:  13 interfaces, 8 structs
- Does most of your code generally use composition or inheritance?:   Both are used, there is a “is-a” relationship b/w all protocol adapters CCMPAdaptorBase, while there is a “has-a” relationship b/w CCMPGateway and CCMPAdaptors.
- How many external calls?:   3
- What is the overall line coverage percentage provided by your tests?:  75
- Is there a need to understand a separate part of the codebase / get context in order to audit this part of the protocol?:   true
- Please describe required context:  The audit covers CCMP Core as well as usage of CCMP by Hyphen Liquidity Pool contracts in it's deposit and call functionality. Therefore, understand how both codebases work with each other is important. It is also important to understand how Wormhole, Axelar and Hyperlane's contracts work to ensure that all the necessary checks have been performed. 
- Does it use an oracle?:  false
- Does the token conform to the ERC20 standard?:  NO
- Are there any novel or unique curve logic or mathematical models?: NA
- Does it use a timelock function?:  NO
- Is it an NFT?: NO
- Does it have an AMM?: NO  
- Is it a fork of a popular project?:  false 
- Does it use rollups?:   false
- Is it multi-chain?:  true
- Does it use a side-chain?: false
```

# Tests
Clone the repository: `git clone git@github.com:code-423n4/2022-12-biconomy.git`

## CCMP Contracts
```
# Setup
cd ccmp-contracts
yarn

# Environment
# The only required key for local testing is the METADEPLOYER_PRIVATE_KEY, set it to an arbitrary private key
cp .env.example .env 

# Compile the contracts
yarn compile

# Run the tests
yarn test

# Run coverage
yarn coverage
```

## Hyphen Contracts
```
# Setup
cd hyphen-contract
yarn

# Environment
cp .env.example .env 

# Compile the contracts
yarn compile

# Run the tests
yarn test

# Run coverage
yarn coverage
```