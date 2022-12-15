// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@biconomy/ccmp-contracts/contracts/receiver/CCMPReceiver.sol";

contract SampleContract is CCMPReceiver {
    event Message(string message, address sender, uint256 chainId);

    constructor(address _ccmpExecutor, ILiquidityPool _liquidityPool) CCMPReceiver(_ccmpExecutor, _liquidityPool) {}

    function emitEvent(string calldata message) external {
        (address sender, uint256 chainId) = _hyphenMsgOrigin();
        emit Message(message, sender, chainId);
    }
}
