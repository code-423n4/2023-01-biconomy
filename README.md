# Biconomy contest details

- Total Prize Pool: $60,500 USDC
  - HM awards: $42,500 USDC
  - QA report awards: $5000 USDC
  - Gas report awards: $2500 USDC
  - Judge + presort awards: $10,000 USDC
  - Scout awards: $500 USDC
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2023-01-biconomy-bridge-and-call-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts January 04, 2023 20:00 UTC
- Ends January 09, 2023 20:00 UTC

## C4udit / Publicly Known Issues

The C4audit output for the contest can be found [here](add link to report) within an hour of contest opening.

*Note for C4 wardens: Anything included in the C4udit output is considered a publicly known issue and is ineligible for awards.*

# Biconomy Smart Account (Smart Contract Wallet) Overview

Biconomy Smart Account is a smart contract wallet that builds on core concepts of Gnosis / Argent safes and implements an interface to support calls from [account abstraction](https://eips.ethereum.org/EIPS/eip-4337) Entry Point contract. We took all the the good parts of existing smart contract wallets.

These smart wallets have a single owner (1/1 Multisig) and are designed in such a way that it is

- Cheap to deploy copies of a base wallet
- Wallet addresses are counterfactual in nature (you can know the address in advance and users will have the same address across all EVM chains)
- Deployment cost can be sponsored (gasless transactions by a relayer)
- Modules can be used to extend the functionality of the smart contract wallet. Concepts like multi-sig, session keys, etc also can be implemented using the MultiSig Module, SessionKey Module & so on.

## Smart Contracts

All the contracts in this section are to be reviewed. Any contracts not in this list are to be ignored for this contest.

#### BaseSmartAccount.sol (51 sloc)

Abstract contract that implements EIP4337 IWallet interface
defines set of methods (compatible with EIP and Biconomy SDK) that all Smart Wallets must implement

#### Proxy.sol (26 sloc)

EIP1167 Proxy

#### SmartAccountFactory.sol (38 sloc)

Contract responsible for deploying smart wallets aka accounts using create2 and create
Has a method to compute counter factual wallet of the address before deploying

```solidity
function deployCounterFactualWallet(address _owner, address _entryPoint, address _handler, uint _index) public returns(address proxy)
```

`salt` consists of `_owner` and `_index`. `_entryPoint` and `_handler` are required to init the wallet.
(contest bonus : showcase any potential front running in wallet deployment)

#### SmartAccount.sol (332 sloc)

Base implementation contract for smart wallet
reference 1 : <https://docs.gnosis-safe.io/contracts>
reference 2 : <https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/samples/SimpleWallet.sol>
notes:

1) reverting methods are used for gas estimations
2) transactions happen via EOA signature by calling execTransaction or validateUserOp and execFromEntryPoint via entry point
3) currently 1-1 multisig
4) ECDSA used for signature verification. contract signatures are supported using EIP1271 (we encourage wardens to test integration of smart contract wallet for providing signature on protocols like opensea)

#### EntryPoint.sol (344 sloc)

EIP4337 Entry Point contract (<https://blog.openzeppelin.com/eth-foundation-account-abstraction-audit/>)

#### StakeManager.sol (76 sloc)

Stake Manager for wallet and paymaster deposits / stakes
<https://blog.openzeppelin.com/eth-foundation-account-abstraction-audit/>

#### Executor.sol (25 sloc)

helper contract to make calls and delegatecalls to dapp contracts

#### FallbackManager.sol (34 sloc)

Fallback manager manages a fallback handler to fallback to (delegate call) when a method is not found in wallet implementation contract

#### ModuleManager.sol (75 sloc)

Gnosis Safe module manager

#### DefaultCallbackHandler.sol (50 sloc)

Manages hooks to react to receiving tokens

#### MultiSend.sol (35 sloc)

Allows to batch multiple transactions into one. Relayer -> Smart Wallet - > MultiSend -> Dapp contract / contracts

#### MultiSendCallOnly.sol (30 sloc)

MultiSend functionality but reverts if a transaction tries to do delegatecall

#### VerifyingSingletonPaymaster.sol (74 sloc)

A paymaster that uses external service to decide whether to pay for the UserOp. The paymaster trusts an external signer to sign the transaction. The calling user must pass the UserOp to that external signer first, which performs whatever off-chain verification before signing the UserOp. Singleton Paymaster is Biconomy Paymaster which can be used by all the Dapps and manages gas accounting for their corresponding paymasterId.

#### PaymasterHelpers.sol (29 sloc)

Library useful for decoding paymaster data and context

## Architecture

<https://github.com/eth-infinitism/account-abstraction/tree/develop/eip/assets/eip-4337>

public document for Biconomy SDK that uses these smart contract wallets and account abstraction EIP4337
<https://www.notion.so/biconomy/Biconomy-SDK-adf0c6cedb08436097bf099b8f46aac7>

Transactional level methods are either called on EntryPoint.sol -> handleOps() or on SmartAccount.sol (delegated through Proxy.sol) -> execTransaction()

# Scope

## SCW (wallet-contracts)

These contracts uses EIP1167 minimal proxy (`Proxy.sol`) to deploy a clone of implementation contract (`SmartAccount.sol`)
The factory contract that is responsible for deploying a smart contract wallet is SmartAccountFactory.sol which has methods to getCounterFactualWalletAddress and deploy wallet (using CREATE2)

SmartAccount follows the IAccount interface proposed by EIP4337 <https://eips.ethereum.org/EIPS/eip-4337>

| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
contracts/smart-contract-wallet/aa-4337/interfaces/IAccount.sol | 5
contracts/smart-contract-wallet/BaseSmartAccount.sol | 51
contracts/smart-contract-wallet/Proxy.sol | 26
contracts/smart-contract-wallet/SmartAccount.sol | 332
contracts/smart-contract-wallet/common/Singleton.sol | 15
contracts/smart-contract-wallet/interfaces/IERC165.sol | 4
contracts/smart-contract-wallet/base/ModuleManager.sol | 75
contracts/smart-contract-wallet/base/FallbackManager.sol | 33
contracts/smart-contract-wallet/common/SignatureDecoder.sol | 19
contracts/smart-contract-wallet/common/SecuredTokenTransfer.sol | 23
contracts/smart-contract-wallet/interfaces/ISignatureValidator.sol | 7
contracts/smart-contract-wallet/SmartAccountFactory.sol | 38
contracts/smart-contract-wallet/base/Executor.sol | 25
contracts/smart-contract-wallet/handler/DefaultCallbackHandler.sol | 50
contracts/smart-contract-wallet/interfaces/ERC1155TokenReceiver.sol | 17
contracts/smart-contract-wallet/interfaces/ERC721TokenReceiver.sol | 9
contracts/smart-contract-wallet/interfaces/ERC777TokensRecipient.sol | 11
contracts/smart-contract-wallet/interfaces/IERC1271Wallet.sol | 15
contracts/smart-contract-wallet/libs/LibAddress.sol | 9
contracts/smart-contract-wallet/libs/Math.sol | 208

**Account abstraction EntryPoint and StakeManager contracts and interfaces**

Relevant missing test cases in this repo can be found here : <https://github.com/eth-infinitism/account-abstraction/tree/develop/test>

| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
contracts/smart-contract-wallet/aa-4337/core/EntryPoint.sol | 344
contracts/smart-contract-wallet/aa-4337/core/SenderCreator.sol | 16
contracts/smart-contract-wallet/aa-4337/core/StakeManager.sol | 76
contracts/smart-contract-wallet/aa-4337/interfaces/IPaymaster.sol | 12
contracts/smart-contract-wallet/aa-4337/interfaces/IAggregatedAccount.sol | 7
contracts/smart-contract-wallet/aa-4337/interfaces/IEntryPoint.sol | 34
contracts/smart-contract-wallet/aa-4337/utils/Exec.sol | 51
contracts/smart-contract-wallet/aa-4337/interfaces/IStakeManager.sol | 44
contracts/smart-contract-wallet/aa-4337/interfaces/UserOperation.sol | 48
contracts/smart-contract-wallet/aa-4337/interfaces/IAggregator.sol | 8

**Account abstraction BasePaymaster and Biconomy Singleton Paymaster**

(Paymaster is a special contract that acts as a Gas Tank to sponsor the user operations, that pre deposits native token gas on the EntryPoint contract (which in turn refunds the relayer/bundler). Biconomy uses a specific paymaster implementation called VerifyingPaymaster where an off-chain signature is passed to be verified for gas sponsorship within the contract)

| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
contracts/smart-contract-wallet/paymasters/BasePaymaster.sol | 44
contracts/smart-contract-wallet/paymasters/PaymasterHelpers.sol | 29
contracts/smart-contract-wallet/paymasters/verifying/singleton/VerifyingSingletonPaymaster.sol | 71

**Helpers/ utils**

| Contract | SLoC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
contracts/smart-contract-wallet/common/Enum.sol | 4
contracts/smart-contract-wallet/libs/MultiSend.sol | 35
contracts/smart-contract-wallet/libs/MultiSendCallOnly.sol | 30

## Out of scope

Any files not listed above should be considered out of scope and assumed to be bug free.

## Scoping Details

```
- If you have a public code repo, please share it here:  https://github.com/bcnmy/scw-contracts/tree/master-c4-readys
- How many contracts are in scope?:   36
- Total SLoC for these contracts?:  1825
- How many external imports are there?:  1
- How many separate interfaces and struct definitions are there for the contracts within scope?:  8 interfaces, 11 structs
- Does most of your code generally use composition or inheritance?:   Yes
- What is the overall line coverage percentage provided by your tests?:  41
- Is there a need to understand a separate part of the codebase / get context in order to audit this part of the protocol?:   false
- Please describe required context:   
- Does it use an oracle?:  false
- Does the token conform to the ERC20 standard?:  Yes
- Are there any novel or unique curve logic or mathematical models?: NA
- Does it use a timelock function?:  N/A
- Is it an NFT?: NO
- Does it have an AMM?: NO  
- Is it a fork of a popular project?:  True; added account abstraction interface on gnosis safe base wallet. execTransaction uses batchId. wallet factory has create2 support
- Does it use rollups?:   false
- Is it multi-chain?:  true
- Does it use a side-chain?: false
```

# Tests

Clone the repository: `git clone git@github.com:code-423n4/2023-01-biconomy.git`

## SCW Contracts

Pre-requisite:

- Create a `scw-contracts/.secret` file and enter your mnemonic. `walletUtils.js` picks mnemonic from here and creates accounts for hardhat tasks
- Try the setup instructions below

```
# Setup
cd scw-contracts
yarn

# Environment
# Do add the RPC URLs and Block explorer API keys for running scripts to deploy on test networks
cp .env.example .env 

# Compile the contracts
npx hardhat compile

# Run the tests
npx hardhat test

# Run coverage
npx hardhat coverage
```
