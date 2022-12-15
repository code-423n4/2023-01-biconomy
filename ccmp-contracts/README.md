# Biconomy Cross Chain Messaging Protocol (CCMP)

This repository contains the smart contracts for Biconomy's CCM Protocol.

# Introduction

CCMP faciliates cross-chain transfer of messages via Biconomy's network of decentralized relayers.

With CCMP, smart contracts deployed on one chain are able to execute arbitrary logic on another chain.
# Usage

### Sending Messages

To send a "message" to another chain, smart contracts will interact with the `CCMPGateway` contract, specifically call the `sendMessage` function as follows:

```
/// @param _destinationChainId The chain id of the destination chain.
/// @param _adaptorName The name of the router adaptor to use. Currently "axelar", "wormhole" and "abacus" are supported.
/// @param _gasFeePaymentArgs Contains details for the fee quoted by the relayer
/// @param _routerArgs Contains abi encoded router specific arguments. For ex, CONSISTENCY_LEVEL when sending message via wormhole.
/// @return sent The hash of the message sent.
function sendMessage(
    uint256 _destinationChainId,
    string calldata _adaptorName,
    CCMPMessagePayload[] calldata _payloads,
    GasFeePaymentArgs calldata _gasFeePaymentArgs,
    bytes calldata _routerArgs
) external payable;
```

The `_payloads` argument is an array of the following form:

```
[
    {
        // Address of contract on the destination chain
        address to;

        // Calldata to execute on 'to'
        bytes _calldata; 
    },
    {
        address to;
        bytes _calldata;
    },
    {
        address to;
        bytes _calldata;
    }...
]
```
The `_gasFeePaymentArgs` argument specified the exected gas fee to be paid to confirm the transaction on the destination chain. This can be fetched by calling and API Exposed by the Biconomy SDK.

### Receiving Messages
Inherit `contracts/receiver/CCMPReceiver.sol` in the contract receiving the messages (`to` from the payload array). The function `_ccmpMessageOrigin()` will return the chainId of the source chain and the address of the sender contract. 


# Overview

Scenario: A smart contract `0xCONTRACT` on ethereum wants to send a cross-chain message to `0xCONTRACT` on Polygon.

## Source Chain

1. `0xCONTRACT` on ethereum prepares the required `payload` to be executed om polygon (calldata), selects an underlying protcol supported by CCMP and calls `0xCCMPGateway.sendMessage`. The fee required to execute the message on the exit chain is assumed to be negotiated previously b/w the sender and relayer and the required payment mode is sent as `gasFeePaymentArgs` along with the actual tokens are sent with the same call.
1. `0xCCMPGateway` will do some validations and pass on the message to `0xCCMPExecutor`.
1. `0xCCMPExecutor` verifies the fee payment and does some accounting so that fee can be claimed later by the executor. In case there are any token transfer via Hyphen involved,`0xExecutor` will perform the token deposits into existing `Hyphen` Liquidity Pools as well.
1. `0xCCMPGatway` calls the underlying protocol's adapter which sends the message to the exit chain.

## Intermediate Off-Chain Steps

1. In case the underlying protocol requires a fee payment for the message to be sent to the destination chain, the relayer will pay the fee to the underlying protocol on the user's behalf. This fee is assumed to be accounted for in the original fee negotiation b/w the user and the relayer.
1. The relayer the waits for the message to be confirmed on the destination chain by the underlying protocol.
1. Once the message is confirmed, the relayer calls `0xCCMPGateway` on the destination chain.

## Destination Chain

1. `0xCCMPGateway` calls the underlying adapter to verify the message with the underlying protocol.
1. The message is passed on `0xCCMPExecutor`, which executes the contract calls and Hyphen Token Transfers included in the original payload.
