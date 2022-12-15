// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ICCMPGateway.sol";

struct DepositAndCallArgs {
    uint256 toChainId;

    // Can be Native Token Address
    address tokenAddress;
    
    address receiver;

    uint256 amount;

    // Emitted Directly, used for analytics purposes off chain
    string tag;
    
    // Executed on the destination chain after the tokens have been transferred 'receiver'
    ICCMPGateway.CCMPMessagePayload[] payloads;

    // Contains information on how much gas fee to be paid to the CCMPGateway. Fetched from an off chain api call to the relayer.
    ICCMPGateway.GasFeePaymentArgs gasFeePaymentArgs;

    // wormhole/hyperlane/axelar 
    string adaptorName;

    // Adaptor specfic arguments. For ex, consistency level in case of Wormhole
    bytes routerArgs;

    // Array of optional arguments. Currently only one such argument is defined: min amount to receive on the destination chain
    bytes[] hyphenArgs;
}

struct SendFundsToUserFromCCMPArgs {
    // Numeric represention of the token symbol. Used to get the token address on the destination chain.
    uint256 tokenSymbol;

    // Amount of tokens transferred (multiplied by decimals on source chain).
    uint256 sourceChainAmount;

    // Decimals of the token on the source chain, used while converting to amount on the destination chain.
    uint256 sourceChainDecimals;

    // Address to send the tokens to
    address payable receiver;

    // Array of optional arguments. Currently only one such argument is defined: min amount to receive on the destination chain
    bytes[] hyphenArgs;
}
