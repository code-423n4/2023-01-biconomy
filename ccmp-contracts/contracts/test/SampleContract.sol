// SPDX-License-Identifier: MIT
import "../receiver/CCMPReceiver.sol";

pragma solidity 0.8.16;

contract SampleContract is CCMPReceiver {
    event SampleEvent(string);
    event SampleEventExtended(string, uint256, address);

    constructor(
        address ccmpExecutor,
        ILiquidityPool hyphenLiquidityPool
    ) CCMPReceiver(ccmpExecutor, hyphenLiquidityPool) {}

    function emitEvent(string calldata data) external {
        emit SampleEvent(data);
    }

    function emitWithValidation(string calldata data) external {
        (address sourceChainSender, uint256 sourceChainId) = _ccmpMsgOrigin();
        emit SampleEventExtended(data, sourceChainId, sourceChainSender);
    }

    function getCCMPExecutor() external view returns (address) {
        return _ccmpExecutor;
    }

    function getHyphenLiquidityPool() external view returns (address) {
        return address(_liquidityPool);
    }
}
