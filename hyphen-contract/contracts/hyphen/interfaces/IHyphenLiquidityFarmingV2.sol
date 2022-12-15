// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

interface IHyphenLiquidityFarmingV2 {
    function changePauser(address newPauser) external;

    function deposit(uint256 _nftId, address _to) external;

    function extractRewards(
        uint256 _nftId,
        address[] memory _rewardTokens,
        address _to
    ) external;

    function getNftIdsStaked(address _user) external view returns (uint256[] memory nftIds);

    function getRewardRatePerSecond(address _baseToken, address _rewardToken) external view returns (uint256);

    function getRewardTokens(address _baseToken) external view returns (address[] memory);

    function getStakedNftIndex(address _staker, uint256 _nftId) external view returns (uint256);

    function getUpdatedAccTokenPerShare(address _baseToken, address _rewardToken) external view returns (uint256);

    function initialize(
        address _trustedForwarder,
        address _pauser,
        address _liquidityProviders,
        address _lpToken
    ) external;

    function isPauser(address pauser) external view returns (bool);

    function isTrustedForwarder(address forwarder) external view returns (bool);

    function liquidityProviders() external view returns (address);

    function lpToken() external view returns (address);

    function nftIdsStaked(address, uint256) external view returns (uint256);

    function nftInfo(uint256) external view returns (address staker, bool isStaked);

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4);

    function owner() external view returns (address);

    function pause() external;

    function paused() external view returns (bool);

    function pendingToken(uint256 _nftId, address _rewardToken) external view returns (uint256);

    function poolInfo(address, address) external view returns (uint256 accTokenPerShare, uint256 lastRewardTime);

    function reclaimTokens(
        address _token,
        uint256 _amount,
        address _to
    ) external;

    function renounceOwnership() external;

    function renouncePauser() external;

    function rewardRateLog(
        address,
        address,
        uint256
    ) external view returns (uint256 rewardsPerSecond, uint256 timestamp);

    function setRewardPerSecond(
        address _baseToken,
        address _rewardToken,
        uint256 _rewardPerSecond
    ) external;

    function setTrustedForwarder(address _tf) external;

    function totalSharesStaked(address) external view returns (uint256);

    function transferOwnership(address newOwner) external;

    function unpause() external;

    function updateLiquidityProvider(address _liquidityProviders) external;

    function withdraw(uint256 _nftId, address _to) external;

    function withdrawAtIndex(
        uint256 _nftId,
        address _to,
        uint256 _index
    ) external;
}
