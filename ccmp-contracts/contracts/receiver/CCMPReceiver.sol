// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./CCMPReceiverBase.sol";

/// @title CCMPRecevier
/// @author ankur@biconomy.io
/// @notice This contract is inherited by contracts that need to verify 
///         the source of the message (source chain id, address) while 
///         receiving messages on the destination chain.
abstract contract CCMPReceiver is CCMPReceiverBase {
    constructor(address _ccmpExecutor, ILiquidityPool _liquidityPool) {
        _setCCMPExecutor(_ccmpExecutor);
        _setLiquidityPool(_liquidityPool);
    }
}
