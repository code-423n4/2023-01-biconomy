// $$\       $$\                     $$\       $$\ $$\   $$\                     $$$$$$$$\                               $$\
// $$ |      \__|                    \__|      $$ |\__|  $$ |                    $$  _____|                              \__|
// $$ |      $$\  $$$$$$\  $$\   $$\ $$\  $$$$$$$ |$$\ $$$$$$\   $$\   $$\       $$ |   $$$$$$\   $$$$$$\  $$$$$$\$$$$\  $$\ $$$$$$$\   $$$$$$\
// $$ |      $$ |$$  __$$\ $$ |  $$ |$$ |$$  __$$ |$$ |\_$$  _|  $$ |  $$ |      $$$$$\ \____$$\ $$  __$$\ $$  _$$  _$$\ $$ |$$  __$$\ $$  __$$\
// $$ |      $$ |$$ /  $$ |$$ |  $$ |$$ |$$ /  $$ |$$ |  $$ |    $$ |  $$ |      $$  __|$$$$$$$ |$$ |  \__|$$ / $$ / $$ |$$ |$$ |  $$ |$$ /  $$ |
// $$ |      $$ |$$ |  $$ |$$ |  $$ |$$ |$$ |  $$ |$$ |  $$ |$$\ $$ |  $$ |      $$ |  $$  __$$ |$$ |      $$ | $$ | $$ |$$ |$$ |  $$ |$$ |  $$ |
// $$$$$$$$\ $$ |\$$$$$$$ |\$$$$$$  |$$ |\$$$$$$$ |$$ |  \$$$$  |\$$$$$$$ |      $$ |  \$$$$$$$ |$$ |      $$ | $$ | $$ |$$ |$$ |  $$ |\$$$$$$$ |
// \________|\__| \____$$ | \______/ \__| \_______|\__|   \____/  \____$$ |      \__|   \_______|\__|      \__| \__| \__|\__|\__|  \__| \____$$ |
//                     $$ |                                      $$\   $$ |                                                            $$\   $$ |
//                     $$ |                                      \$$$$$$  |                                                            \$$$$$$  |
//                     \__|                                       \______/                                                              \______/
//
// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/interfaces/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./metatx/ERC2771ContextUpgradeable.sol";

import "../security/Pausable.sol";
import "./interfaces/ILPToken.sol";
import "./interfaces/ILiquidityProviders.sol";

contract HyphenLiquidityFarmingV2 is
    Initializable,
    ERC2771ContextUpgradeable,
    OwnableUpgradeable,
    Pausable,
    ReentrancyGuardUpgradeable,
    IERC721ReceiverUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSet for EnumerableSet.AddressSet;

    ILPToken public lpToken;
    ILiquidityProviders public liquidityProviders;

    struct RewardInfo {
        uint256 rewardDebt;
        uint256 unpaidRewards;
    }

    struct NFTInfo {
        address payable staker;
        bool isStaked;
        // Reward Token -> Reward Info
        mapping(address => RewardInfo) rewardInfo;
    }

    struct PoolInfo {
        uint256 accTokenPerShare;
        uint256 lastRewardTime;
    }

    struct RewardsPerSecondEntry {
        uint256 rewardsPerSecond;
        uint256 timestamp;
    }

    /// @notice Mapping to track the rewarder pool. baseToken -> rewardToken -> poolInfo
    mapping(address => mapping(address => PoolInfo)) public poolInfo;

    /// @notice Info of each NFT that is staked.
    mapping(uint256 => NFTInfo) public nftInfo;

    // Reward Tokens. Base Token -> Array of Reward Tokens
    mapping(address => EnumerableSet.AddressSet) internal rewardTokens;

    /// @notice Staker => NFTs staked
    mapping(address => uint256[]) public nftIdsStaked;

    /// @notice Base Token => Total Shares Staked
    mapping(address => uint256) public totalSharesStaked;

    /// @notice Token => Reward Rate Updation history. baseToken -> rewardToken -> rewardsPerSecondEntry
    mapping(address => mapping(address => RewardsPerSecondEntry[])) public rewardRateLog;

    uint256 private constant ACC_TOKEN_PRECISION = 1e12;
    address internal constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    event LogDeposit(address indexed user, address indexed baseToken, uint256 nftId);
    event LogWithdraw(address indexed user, address baseToken, uint256 nftId, address indexed to);
    event LogOnReward(
        address indexed user,
        address indexed baseToken,
        address indexed rewardToken,
        uint256 amount,
        address to
    );
    event LogUpdatePool(address indexed baseToken, uint256 lastRewardTime, uint256 lpSupply, uint256 accToken1PerShare);
    event LogRewardPerSecond(address indexed baseToken, address indexed rewardToken, uint256 indexed rewardPerSecond);
    event LogNativeReceived(address indexed sender, uint256 value);
    event LiquidityProviderUpdated(address indexed liquidityProviders);

    function initialize(
        address _trustedForwarder,
        address _pauser,
        ILiquidityProviders _liquidityProviders,
        ILPToken _lpToken
    ) public initializer {
        __ERC2771Context_init(_trustedForwarder);
        __Ownable_init();
        __Pausable_init(_pauser);
        __ReentrancyGuard_init();
        liquidityProviders = _liquidityProviders;
        lpToken = _lpToken;
    }

    function setTrustedForwarder(address _tf) external onlyOwner {
        _setTrustedForwarder(_tf);
    }

    /// @notice Sets the sushi per second to be distributed. Can only be called by the owner.
    /// @param _rewardPerSecond The amount of Sushi to be distributed per second.
    function setRewardPerSecond(
        address _baseToken,
        address _rewardToken,
        uint256 _rewardPerSecond
    ) external onlyOwner {
        require(_rewardPerSecond <= 10**40, "ERR__REWARD_PER_SECOND_TOO_HIGH");
        require(_baseToken != address(0), "ERR__BASE_TOKEN_IS_ZERO");
        require(_rewardToken != address(0), "ERR_REWARD_TOKEN_IS_ZERO");

        if (!rewardTokens[_baseToken].contains(_rewardToken)) {
            rewardTokens[_baseToken].add(_rewardToken);
        }
        rewardRateLog[_baseToken][_rewardToken].push(RewardsPerSecondEntry(_rewardPerSecond, block.timestamp));

        emit LogRewardPerSecond(_baseToken, _rewardToken, _rewardPerSecond);
    }

    function getRewardTokens(address _baseToken) external view returns (address[] memory) {
        uint256 length = rewardTokens[_baseToken].length();
        address[] memory tokens = new address[](length);
        unchecked {
            for (uint256 i = 0; i < length; ++i) {
                tokens[i] = rewardTokens[_baseToken].at(i);
            }
        }
        return tokens;
    }

    function updateLiquidityProvider(ILiquidityProviders _liquidityProviders) external onlyOwner {
        require(address(_liquidityProviders) != address(0), "ERR__LIQUIDITY_PROVIDER_IS_ZERO");
        liquidityProviders = _liquidityProviders;
        emit LiquidityProviderUpdated(address(liquidityProviders));
    }

    function _sendErc20AndGetSentAmount(
        IERC20Upgradeable _token,
        uint256 _amount,
        address _to
    ) private returns (uint256) {
        uint256 beforeBalance = _token.balanceOf(address(this));
        _token.safeTransfer(_to, _amount);
        return beforeBalance - _token.balanceOf(address(this));
    }

    /// @notice Update the reward state of a nft, and if possible send reward funds to _to.
    /// @param _nftId NFT ID that is being locked
    /// @param _rewardToken Reward Token to be used for the reward
    /// @param _to Address to which rewards will be credited.
    function _sendRewardsForNft(
        uint256 _nftId,
        address _rewardToken,
        address payable _to
    ) internal {
        NFTInfo storage nft = nftInfo[_nftId];
        require(nft.isStaked, "ERR__NFT_NOT_STAKED");

        (address baseToken, , uint256 amount) = lpToken.tokenMetadata(_nftId);
        amount /= liquidityProviders.BASE_DIVISOR();

        require(rewardTokens[baseToken].contains(_rewardToken), "ERR__REWARD_TOKEN_NOT_SUPPORTED");

        PoolInfo memory pool = _updateRewardTokenParameters(baseToken, _rewardToken);
        uint256 pending;
        uint256 amountSent;
        RewardInfo storage rewardInfo = nft.rewardInfo[_rewardToken];

        if (amount > 0) {
            pending =
                ((amount * pool.accTokenPerShare) / ACC_TOKEN_PRECISION) -
                rewardInfo.rewardDebt +
                rewardInfo.unpaidRewards;
            if (_rewardToken == NATIVE) {
                uint256 balance = address(this).balance;
                if (pending > balance) {
                    unchecked {
                        rewardInfo.unpaidRewards = pending - balance;
                    }
                    (bool success, ) = _to.call{value: balance}("");
                    require(success, "ERR__NATIVE_TRANSFER_FAILED");
                    amountSent = balance;
                } else {
                    rewardInfo.unpaidRewards = 0;
                    (bool success, ) = _to.call{value: pending}("");
                    require(success, "ERR__NATIVE_TRANSFER_FAILED");
                    amountSent = pending;
                }
            } else {
                IERC20Upgradeable rewardToken = IERC20Upgradeable(_rewardToken);
                uint256 balance = rewardToken.balanceOf(address(this));
                if (pending > balance) {
                    unchecked {
                        rewardInfo.unpaidRewards = pending - balance;
                    }
                    amountSent = _sendErc20AndGetSentAmount(rewardToken, balance, _to);
                } else {
                    rewardInfo.unpaidRewards = 0;
                    amountSent = _sendErc20AndGetSentAmount(rewardToken, pending, _to);
                }
            }
        }

        rewardInfo.rewardDebt = (amount * pool.accTokenPerShare) / ACC_TOKEN_PRECISION;

        emit LogOnReward(_msgSender(), baseToken, _rewardToken, amountSent, _to);
    }

    /// @notice Allows owner to reclaim/withdraw any tokens (including reward tokens) held by this contract
    /// @param _token Token to reclaim, use 0x00 for Ethereum
    /// @param _amount Amount of tokens to reclaim
    /// @param _to Receiver of the tokens, first of his name, rightful heir to the lost tokens,
    /// reightful owner of the extra tokens, and ether, protector of mistaken transfers, mother of token reclaimers,
    /// the Khaleesi of the Great Token Sea, the Unburnt, the Breaker of blockchains.
    function reclaimTokens(
        address _token,
        uint256 _amount,
        address payable _to
    ) external onlyOwner {
        require(_to != address(0), "ERR__TO_IS_ZERO");
        require(_amount != 0, "ERR__AMOUNT_IS_ZERO");
        if (_token == NATIVE) {
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "ERR__NATIVE_TRANSFER_FAILED");
        } else {
            IERC20Upgradeable(_token).safeTransfer(_to, _amount);
        }
    }

    /// @notice Deposit LP tokens
    /// @param _nftId LP token nftId to deposit.
    function deposit(uint256 _nftId, address payable _to) external whenNotPaused nonReentrant {
        address msgSender = _msgSender();

        require(_to != address(0), "ERR__TO_IS_ZERO");
        require(
            lpToken.isApprovedForAll(msgSender, address(this)) || lpToken.getApproved(_nftId) == address(this),
            "ERR__NOT_APPROVED"
        );

        NFTInfo storage nft = nftInfo[_nftId];

        require(!nft.isStaked, "ERR__NFT_ALREADY_STAKED");
        nft.isStaked = true;
        nft.staker = _to;

        (address baseToken, , uint256 amount) = lpToken.tokenMetadata(_nftId);
        amount /= liquidityProviders.BASE_DIVISOR();

        lpToken.safeTransferFrom(msgSender, address(this), _nftId);

        uint256 totalRewardTokens = rewardTokens[baseToken].length();
        require(totalRewardTokens != 0, "ERR__POOL_NOT_INITIALIZED");

        for (uint256 i = 0; i < totalRewardTokens; ) {
            address rewardToken = rewardTokens[baseToken].at(i);
            PoolInfo memory pool = _updateRewardTokenParameters(baseToken, rewardToken);
            nft.rewardInfo[rewardToken].rewardDebt = (amount * pool.accTokenPerShare) / ACC_TOKEN_PRECISION;
            unchecked {
                ++i;
            }
        }

        nftIdsStaked[_to].push(_nftId);
        totalSharesStaked[baseToken] += amount;

        emit LogDeposit(msgSender, baseToken, _nftId);
    }

    function getStakedNftIndex(address _staker, uint256 _nftId) public view returns (uint256) {
        uint256 nftsStakedLength = nftIdsStaked[_staker].length;
        uint256 index;
        unchecked {
            for (index = 0; index < nftsStakedLength; ++index) {
                if (nftIdsStaked[_staker][index] == _nftId) {
                    return index;
                }
            }
        }
        revert("ERR__NFT_NOT_STAKED");
    }

    function _withdraw(
        uint256 _nftId,
        address payable _to,
        uint256 _index
    ) private {
        address msgSender = _msgSender();

        require(nftIdsStaked[msgSender][_index] == _nftId, "ERR__NOT_OWNER");
        require(nftInfo[_nftId].staker == msgSender, "ERR__NOT_OWNER");

        nftIdsStaked[msgSender][_index] = nftIdsStaked[msgSender][nftIdsStaked[msgSender].length - 1];
        nftIdsStaked[msgSender].pop();

        (address baseToken, , uint256 amount) = lpToken.tokenMetadata(_nftId);
        uint256 totalRewardTokens = rewardTokens[baseToken].length();

        for (uint256 i = 0; i < totalRewardTokens; ) {
            address rewardToken = rewardTokens[baseToken].at(i);
            _sendRewardsForNft(_nftId, rewardToken, _to);
            require(nftInfo[_nftId].rewardInfo[rewardToken].unpaidRewards == 0, "ERR__UNPAID_REWARDS_EXIST");
            unchecked {
                ++i;
            }
        }
        delete nftInfo[_nftId];

        amount /= liquidityProviders.BASE_DIVISOR();
        totalSharesStaked[baseToken] -= amount;

        lpToken.safeTransferFrom(address(this), msgSender, _nftId);

        emit LogWithdraw(msgSender, baseToken, _nftId, _to);
    }

    function withdrawAtIndex(
        uint256 _nftId,
        address payable _to,
        uint256 _index
    ) external whenNotPaused nonReentrant {
        _withdraw(_nftId, _to, _index);
    }

    /// @notice Withdraw LP tokens
    /// @param _nftId LP token nftId to withdraw.
    /// @param _to The receiver of `amount` withdraw benefit.
    function withdraw(uint256 _nftId, address payable _to) external whenNotPaused nonReentrant {
        uint256 index = getStakedNftIndex(_msgSender(), _nftId);
        _withdraw(_nftId, _to, index);
    }

    /// @notice Extract all rewards without withdrawing LP tokens
    /// @param _nftId LP token nftId for which rewards are to be withdrawn
    /// @param _to The receiver of withdraw benefit.
    function extractRewards(
        uint256 _nftId,
        address[] calldata _rewardTokens,
        address payable _to
    ) external whenNotPaused nonReentrant {
        require(nftInfo[_nftId].staker == _msgSender(), "ERR__NOT_OWNER");

        uint256 length = _rewardTokens.length;
        require(length > 0, "ERR__NO_REWARD_TOKENS");

        for (uint256 i = 0; i < length; ) {
            address rewardToken = _rewardTokens[i];
            _sendRewardsForNft(_nftId, rewardToken, _to);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Calculates an up to date value of accTokenPerShare
    /// @notice An updated value of accTokenPerShare is comitted to storage every time a new NFT is deposited, withdrawn or rewards are extracted
    function getUpdatedAccTokenPerShare(address _baseToken, address _rewardToken) public view returns (uint256) {
        PoolInfo memory pool = poolInfo[_baseToken][_rewardToken];
        RewardsPerSecondEntry[] memory logs = rewardRateLog[_baseToken][_rewardToken];
        require(logs.length > 0, "ERR__NO_REWARD_RATE_LOGS");

        uint256 accumulator = 0;
        uint256 lastUpdatedTime = pool.lastRewardTime;
        uint256 counter = block.timestamp;
        uint256 i = logs.length - 1;

        while (true) {
            if (lastUpdatedTime >= counter) {
                break;
            }
            RewardsPerSecondEntry memory log = logs[i];
            unchecked {
                accumulator += log.rewardsPerSecond * (counter - max(lastUpdatedTime, log.timestamp));
            }
            counter = log.timestamp;
            if (i == 0) {
                break;
            }
            --i;
        }

        // We know that during all the periods that were included in the current iterations,
        // the value of totalSharesStaked[_baseToken] would not have changed, as we only consider the
        // updates to the pool that happened after the lastUpdatedTime.
        accumulator = (accumulator * ACC_TOKEN_PRECISION) / totalSharesStaked[_baseToken];
        return accumulator + pool.accTokenPerShare;
    }

    /// @notice View function to see pending Token
    /// @param _nftId NFT for which pending tokens are to be viewed
    /// @param _rewardToken reward token for which pending tokens are to be viewed
    /// @return pending reward for a given user.
    function pendingToken(uint256 _nftId, address _rewardToken) external view returns (uint256) {
        NFTInfo storage nft = nftInfo[_nftId];
        if (!nft.isStaked) {
            return 0;
        }

        (address baseToken, , uint256 amount) = lpToken.tokenMetadata(_nftId);
        amount /= liquidityProviders.BASE_DIVISOR();

        if(!rewardTokens[baseToken].contains(_rewardToken)) {
            return 0;
        }

        PoolInfo memory pool = poolInfo[baseToken][_rewardToken];
        uint256 accToken1PerShare = pool.accTokenPerShare;
        if (block.timestamp > pool.lastRewardTime && totalSharesStaked[baseToken] != 0) {
            accToken1PerShare = getUpdatedAccTokenPerShare(baseToken, _rewardToken);
        }
        return
            ((amount * accToken1PerShare) / ACC_TOKEN_PRECISION) -
            nft.rewardInfo[_rewardToken].rewardDebt +
            nft.rewardInfo[_rewardToken].unpaidRewards;
    }

    /// @notice Update reward variables of the given pool.
    /// @return pool Returns the pool that was updated.
    function _updateRewardTokenParameters(address _baseToken, address _rewardToken)
        internal
        whenNotPaused
        returns (PoolInfo memory pool)
    {
        pool = poolInfo[_baseToken][_rewardToken];
        if (totalSharesStaked[_baseToken] > 0) {
            pool.accTokenPerShare = getUpdatedAccTokenPerShare(_baseToken, _rewardToken);
        }
        pool.lastRewardTime = block.timestamp;
        poolInfo[_baseToken][_rewardToken] = pool;
        emit LogUpdatePool(_baseToken, pool.lastRewardTime, totalSharesStaked[_baseToken], pool.accTokenPerShare);
    }

    /// @notice View function to see the tokens staked by a given user.
    /// @param _user Address of user.
    function getNftIdsStaked(address _user) external view returns (uint256[] memory nftIds) {
        nftIds = nftIdsStaked[_user];
    }

    function getRewardRatePerSecond(address _baseToken, address _rewardToken) external view returns (uint256) {
        uint256 length = rewardRateLog[_baseToken][_rewardToken].length;
        if (length == 0) {
            return 0;
        }
        return rewardRateLog[_baseToken][_rewardToken][length - 1].rewardsPerSecond;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override(IERC721ReceiverUpgradeable) returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    receive() external payable {
        emit LogNativeReceived(_msgSender(), msg.value);
    }

    function max(uint256 _a, uint256 _b) private pure returns (uint256) {
        return _a >= _b ? _a : _b;
    }
}
