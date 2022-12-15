// SPDX-License-Identifier: MIT
import "../structures/DepositAndCall.sol";

pragma solidity ^0.8.0;

interface ILiquidityPool {
    function depositErc20(
        uint256 toChainId,
        address tokenAddress,
        address receiver,
        uint256 amount,
        string memory tag
    ) external;

    function depositNative(
        address receiver,
        uint256 toChainId,
        string memory tag
    ) external payable;

    function gasFeeAccumulated(address, address) external view returns (uint256);

    function gasFeeAccumulatedByToken(address) external view returns (uint256);

    function getCurrentLiquidity(address tokenAddress) external view returns (uint256 currentLiquidity);

    function getRewardAmount(uint256 amount, address tokenAddress) external view returns (uint256 rewardAmount);

    function getTransferFee(address tokenAddress, uint256 amount) external view returns (uint256 fee);

    function incentivePool(address) external view returns (uint256);

    function processedHash(bytes32) external view returns (bool);

    function transfer(address _tokenAddress, address receiver, uint256 _tokenAmount) external;

    function withdrawErc20GasFee(address tokenAddress) external;

    function withdrawNativeGasFee() external;

    function depositAndCall(DepositAndCallArgs calldata args) external payable;
}
