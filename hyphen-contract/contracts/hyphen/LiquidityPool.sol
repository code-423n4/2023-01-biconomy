// $$\   $$\                     $$\                                 $$$$$$$\                      $$\
// $$ |  $$ |                    $$ |                                $$  __$$\                     $$ |
// $$ |  $$ |$$\   $$\  $$$$$$\  $$$$$$$\   $$$$$$\  $$$$$$$\        $$ |  $$ | $$$$$$\   $$$$$$\  $$ |
// $$$$$$$$ |$$ |  $$ |$$  __$$\ $$  __$$\ $$  __$$\ $$  __$$\       $$$$$$$  |$$  __$$\ $$  __$$\ $$ |
// $$  __$$ |$$ |  $$ |$$ /  $$ |$$ |  $$ |$$$$$$$$ |$$ |  $$ |      $$  ____/ $$ /  $$ |$$ /  $$ |$$ |
// $$ |  $$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |$$   ____|$$ |  $$ |      $$ |      $$ |  $$ |$$ |  $$ |$$ |
// $$ |  $$ |\$$$$$$$ |$$$$$$$  |$$ |  $$ |\$$$$$$$\ $$ |  $$ |      $$ |      \$$$$$$  |\$$$$$$  |$$ |
// \__|  \__| \____$$ |$$  ____/ \__|  \__| \_______|\__|  \__|      \__|       \______/  \______/ \__|
//           $$\   $$ |$$ |
//           \$$$$$$  |$$ |
//            \______/ \__|
//
// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./lib/Fee.sol";
import "./metatx/ERC2771ContextUpgradeable.sol";
import "../security/Pausable.sol";
import "./structures/TokenConfig.sol";
import "./structures/DepositAndCall.sol";
import "./interfaces/IExecutorManager.sol";
import "./interfaces/ILiquidityProviders.sol";
import "../interfaces/IERC20Permit.sol";
import "./interfaces/ITokenManager.sol";
import "./interfaces/ISwapAdaptor.sol";
import "./interfaces/ICCMPGateway.sol";
import "./interfaces/IERC20WithDecimals.sol";
import "./interfaces/ILiquidityPool.sol";

/**
 * Error Codes (to reduce contract deployment size):
 * 1: Only executor is allowed
 * 2: Only liquidityProviders is allowed
 * 3: Token not supported
 * 4: ExecutorManager cannot be 0x0
 * 5: TrustedForwarder cannot be 0x0
 * 6: LiquidityProviders cannot be 0x0
 * 7: LiquidityProviders can't be 0
 * 8: TokenManager can't be 0
 * 9: Executor Manager cannot be 0
 * 10: Amount mismatch
 * 11: Token symbol not set
 * 12: Liquidity pool not set
 * 13: Total percentage cannot be > 100
 * 14: To chain must be different than current chain
 * 15: wrong function
 * 16: Deposit amount not in Cap limit
 * 17: Receiver address cannot be 0
 * 18: Amount cannot be 0
 * 19: Total percentage cannot be > 100
 * 20: To chain must be different than current chain
 * 21: Deposit amount not in Cap limit
 * 22: Receiver address cannot be 0
 * 23: Amount cannot be 0
 * 24: Invalid sender contract
 * 25: Token not supported
 * 26: Withdraw amount not in Cap limit
 * 27: Bad receiver address
 * 28: Insufficient funds to cover transfer fee
 * 29: Native Transfer Failed
 * 30: Native Transfer Failed
 * 31: Wrong method call
 * 32: Swap adaptor not found
 * 33: Native Transfer to Adaptor Failed
 * 34: Withdraw amount not in Cap limit
 * 35: Bad receiver address
 * 36: Already Processed
 * 37: Insufficient funds to cover transfer fee
 * 38: Can't withdraw native token fee
 * 39: Gas Fee earned is 0
 * 40: Gas Fee earned is 0
 * 41: Native Transfer Failed
 * 42: Invalid receiver
 * 43: ERR__INSUFFICIENT_BALANCE
 * 44: ERR__NATIVE_TRANSFER_FAILED
 * 45: ERR__INSUFFICIENT_BALANCE
 * 46: InvalidOrigin
 * 47: Deposit token and Fee Payment Token should be same
 * 48: Invalid Decimals
 * 49: Transferred Amount Less than Min Amount
 * 50: Parameter length mismatch
 * 51: LiquidityPool cannot be set as recipient of payload
 * 52: msg value must be 0 when doing ERC20 transfer
 */

contract LiquidityPool is
    Initializable,
    ReentrancyGuardUpgradeable,
    Pausable,
    OwnableUpgradeable,
    ERC2771ContextUpgradeable,
    ILiquidityPool
{
    /* State */
    address private constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 private constant BASE_DIVISOR = 10000000000; // Basis Points * 100 for better accuracy

    uint256 public baseGas;

    IExecutorManager private executorManager;
    ITokenManager public tokenManager;
    ILiquidityProviders public liquidityProviders;

    mapping(bytes32 => bool) public override processedHash;
    mapping(address => uint256) public override gasFeeAccumulatedByToken;

    // Gas fee accumulated by token address => executor address
    mapping(address => mapping(address => uint256)) public override gasFeeAccumulated;

    // Incentive Pool amount per token address
    mapping(address => uint256) public override incentivePool;

    mapping(string => address) public swapAdaptorMap;

    // CCMP Gateway Address
    address public ccmpGateway;
    // CCMP Integration
    address public ccmpExecutor;
    // Chain Id => Liquidity Pool Address
    mapping(uint256 => address) public chainIdToLiquidityPoolAddress;

    /* Events */
    event AssetSent(
        address indexed asset,
        uint256 indexed amount,
        uint256 indexed transferredAmount,
        address target,
        bytes depositHash,
        uint256 fromChainId,
        uint256 lpFee,
        uint256 transferFee,
        uint256 gasFee
    );
    event AssetSentFromCCMP(
        address indexed asset,
        uint256 indexed amount,
        uint256 indexed transferredAmount,
        address target,
        uint256 fromChainId,
        uint256 lpFee,
        uint256 transferFee,
        uint256 gasFee
    );
    event Deposit(
        address indexed from,
        address indexed tokenAddress,
        address indexed receiver,
        uint256 toChainId,
        uint256 amount,
        uint256 reward,
        string tag
    );
    event DepositAndCall(
        address indexed from,
        address indexed tokenAddress,
        address indexed receiver,
        uint256 amount,
        uint256 reward,
        string tag
    );
    event DepositAndSwap(
        address indexed from,
        address indexed tokenAddress,
        address indexed receiver,
        uint256 toChainId,
        uint256 amount,
        uint256 reward,
        string tag,
        SwapRequest[] swapRequests
    );

    // MODIFIERS
    modifier onlyExecutor() {
        require(executorManager.getExecutorStatus(_msgSender()), "1");
        _;
    }

    modifier tokenChecks(address tokenAddress) {
        (, bool supportedToken, , , ) = tokenManager.tokensInfo(tokenAddress);
        require(supportedToken, "3");
        _;
    }

    function _verifyExitParams(address tokenAddress, uint256 amount, address payable receiver) internal view {
        TokenConfig memory config = tokenManager.getTransferConfig(tokenAddress);
        require(config.min <= amount && config.max >= amount, "26");
        require(receiver != address(0), "27");
    }

    function initialize(
        address _executorManagerAddress,
        address _pauser,
        address _trustedForwarder,
        address _tokenManager,
        address _liquidityProviders
    ) public initializer {
        require(_executorManagerAddress != address(0), "4");
        require(_trustedForwarder != address(0), "5");
        require(_liquidityProviders != address(0), "6");
        __ERC2771Context_init(_trustedForwarder);
        __ReentrancyGuard_init();
        __Ownable_init();
        __Pausable_init(_pauser);
        executorManager = IExecutorManager(_executorManagerAddress);
        tokenManager = ITokenManager(_tokenManager);
        liquidityProviders = ILiquidityProviders(_liquidityProviders);
        baseGas = 21000;
    }

    function setSwapAdaptor(string calldata name, address _swapAdaptor) external onlyOwner {
        swapAdaptorMap[name] = _swapAdaptor;
    }

    function setCCMPContracts(address _newCCMPExecutor, address _newCCMPGateway) external onlyOwner {
        ccmpExecutor = _newCCMPExecutor;
        ccmpGateway = _newCCMPGateway;
    }

    function setLiquidityPoolAddress(
        uint256[] calldata chainId,
        address[] calldata liquidityPoolAddress
    ) external onlyOwner {
        require(chainId.length == liquidityPoolAddress.length, "50");
        unchecked {
            uint256 length = chainId.length;
            for (uint256 i = 0; i < length; ++i) {
                chainIdToLiquidityPoolAddress[chainId[i]] = liquidityPoolAddress[i];
            }
        }
    }

    function setExecutorManager(address _executorManagerAddress) external onlyOwner {
        require(_executorManagerAddress != address(0), "Executor Manager cannot be 0");
        executorManager = IExecutorManager(_executorManagerAddress);
    }

    function getCurrentLiquidity(address tokenAddress) public view override returns (uint256 currentLiquidity) {
        uint256 liquidityPoolBalance = liquidityProviders.getCurrentLiquidity(tokenAddress);
        uint256 reservedLiquidity = liquidityProviders.totalLPFees(tokenAddress) +
            gasFeeAccumulatedByToken[tokenAddress] +
            incentivePool[tokenAddress];

        currentLiquidity = liquidityPoolBalance > reservedLiquidity ? liquidityPoolBalance - reservedLiquidity : 0;
    }

    /**
     * @dev Function used to deposit tokens into pool to initiate a cross chain token transfer.
     * @param toChainId Chain id where funds needs to be transfered
     * @param tokenAddress ERC20 Token address that needs to be transfered
     * @param receiver Address on toChainId where tokens needs to be transfered
     * @param amount Amount of token being transfered
     */
    function depositErc20(
        uint256 toChainId,
        address tokenAddress,
        address receiver,
        uint256 amount,
        string calldata tag
    ) public override tokenChecks(tokenAddress) whenNotPaused nonReentrant {
        address sender = _msgSender();
        uint256 rewardAmount = _preDepositErc20(sender, toChainId, tokenAddress, receiver, amount, 0);

        // Emit (amount + reward amount) in event
        emit Deposit(sender, tokenAddress, receiver, toChainId, amount + rewardAmount, rewardAmount, tag);
    }

    /**
     * @notice Function used to deposit tokens into pool and optionally execute post operation callback(s)
     * @param args Struct containing all the arguments for depositAndCall
     */
    function depositAndCall(
        DepositAndCallArgs calldata args
    ) external payable override tokenChecks(args.tokenAddress) whenNotPaused nonReentrant {
        uint256 rewardAmount = 0;
        if (args.tokenAddress == NATIVE) {
            require(args.amount + args.gasFeePaymentArgs.feeAmount == msg.value, "10");
            rewardAmount = _preDepositNative(args.receiver, args.toChainId, args.amount);
        } else {
            require(msg.value == 0, "52");
            rewardAmount = _preDepositErc20(
                _msgSender(),
                args.toChainId,
                args.tokenAddress,
                args.receiver,
                args.amount,
                args.gasFeePaymentArgs.feeAmount
            );
        }

        {
            require(args.gasFeePaymentArgs.feeTokenAddress == args.tokenAddress, "47");
            _invokeCCMP(args, args.amount + rewardAmount);
        }

        emit DepositAndCall(
            _msgSender(),
            args.tokenAddress,
            args.receiver,
            args.amount + rewardAmount,
            rewardAmount,
            args.tag
        );
    }

    /**
     * @notice Internal function to prepare the message payload and send a cross chain message to the liquidity pool
     *         on the destination chain via CCMPGateway.
     * @param args Struct containing all the arguments for depositAndCall
     * @param transferredAmount Amount of tokens being transfered. This included the actual amount + any rebalancing incentive reward
     */
    function _invokeCCMP(DepositAndCallArgs calldata args, uint256 transferredAmount) internal {
        ICCMPGateway.CCMPMessagePayload[] memory updatedPayloads = new ICCMPGateway.CCMPMessagePayload[](
            args.payloads.length + 1
        );

        {
            address toChainLiquidityPoolAddress = chainIdToLiquidityPoolAddress[args.toChainId];
            uint256 tokenSymbol = tokenManager.tokenAddressToSymbol(args.tokenAddress);
            uint256 tokenDecimals = _getTokenDecimals(args.tokenAddress);

            require(tokenSymbol != 0, "11");
            require(toChainLiquidityPoolAddress != address(0), "12");
            require(tokenDecimals != 0, "48");

            // Prepare the primary payload to be sent to liquidity pool on the exit chain
            updatedPayloads[0] = ICCMPGateway.CCMPMessagePayload({
                to: toChainLiquidityPoolAddress,
                _calldata: abi.encodeWithSelector(
                    this.sendFundsToUserFromCCMP.selector,
                    SendFundsToUserFromCCMPArgs({
                        tokenSymbol: tokenSymbol,
                        sourceChainAmount: transferredAmount,
                        sourceChainDecimals: tokenDecimals,
                        receiver: payable(args.receiver),
                        hyphenArgs: args.hyphenArgs
                    })
                )
            });

            uint256 length = updatedPayloads.length;
            for (uint256 i = 1; i < length; ) {
                // Other payloads must not call the liquidity pool contract on destination chain,
                // else an attacker can simply ask the liquidity pool to send all funds on the exit chain
                ICCMPGateway.CCMPMessagePayload memory payload = args.payloads[i - 1];
                require(payload.to != toChainLiquidityPoolAddress, "51");

                // Append msg.sender to payload, will be passed on to the receiving contract for verification
                payload._calldata = abi.encodePacked(payload._calldata, msg.sender);

                updatedPayloads[i] = payload;
                unchecked {
                    ++i;
                }
            }
        }

        // Send Fee with Call
        uint256 txValue = 0;
        if (args.gasFeePaymentArgs.feeTokenAddress == NATIVE) {
            txValue = args.gasFeePaymentArgs.feeAmount;
        } else {
            SafeERC20Upgradeable.safeApprove(
                IERC20WithDecimals(args.gasFeePaymentArgs.feeTokenAddress),
                ccmpGateway,
                args.gasFeePaymentArgs.feeAmount
            );
        }

        ICCMPGateway(ccmpGateway).sendMessage{value: txValue}(
            args.toChainId,
            args.adaptorName,
            updatedPayloads,
            args.gasFeePaymentArgs,
            args.routerArgs
        );
    }

    /**
     * @dev Function used to deposit tokens into pool to initiate a cross chain token swap And transfer .
     * @param toChainId Chain id where funds needs to be transfered
     * @param tokenAddress ERC20 Token address that needs to be transfered
     * @param receiver Address on toChainId where tokens needs to be transfered
     * @param amount Amount of token being transfered
     * @param tag Dapp unique identifier
     * @param swapRequest information related to token swap on exit chain
     */
    function depositAndSwapErc20(
        address tokenAddress,
        address receiver,
        uint256 toChainId,
        uint256 amount,
        string calldata tag,
        SwapRequest[] calldata swapRequest
    ) external tokenChecks(tokenAddress) whenNotPaused nonReentrant {
        uint256 totalPercentage = 0;
        {
            uint256 swapArrayLength = swapRequest.length;
            unchecked {
                for (uint256 index = 0; index < swapArrayLength; ++index) {
                    totalPercentage += swapRequest[index].percentage;
                }
            }
        }

        require(totalPercentage <= 100 * BASE_DIVISOR, "13");
        address sender = _msgSender();
        uint256 rewardAmount = _preDepositErc20(sender, toChainId, tokenAddress, receiver, amount, 0);
        // Emit (amount + reward amount) in event
        emit DepositAndSwap(
            sender,
            tokenAddress,
            receiver,
            toChainId,
            amount + rewardAmount,
            rewardAmount,
            tag,
            swapRequest
        );
    }

    /**
     * @notice Performs pre deposit checks, updates incentive pool and available liquidity
     * @param _tokenAddress Address of token being deposited
     * @param _toChainId Chain id where funds needs to be transfered
     * @param _receiver Address on toChainId where tokens needs to be transfered
     * @param _amount Amount of token being transfered
     * @return rewardAmount Amount of incentive reward (if any) being given for rebalancing the pool
     */
    function _preDeposit(
        address _tokenAddress,
        uint256 _toChainId,
        address _receiver,
        uint256 _amount
    ) internal returns (uint256) {
        require(_toChainId != block.chainid, "20");
        require(
            tokenManager.getDepositConfig(_toChainId, _tokenAddress).min <= _amount &&
                tokenManager.getDepositConfig(_toChainId, _tokenAddress).max >= _amount,
            "21"
        );
        require(_receiver != address(0), "22");
        require(_amount != 0, "23");

        // Update Incentive Pool
        uint256 rewardAmount = getRewardAmount(_amount, _tokenAddress);
        if (rewardAmount != 0) {
            incentivePool[_tokenAddress] = incentivePool[_tokenAddress] - rewardAmount;
        }

        // Update Available Liquidity
        liquidityProviders.increaseCurrentLiquidity(_tokenAddress, _amount);

        return rewardAmount;
    }

    function _preDepositNative(address receiver, uint256 toChainId, uint256 amount) internal returns (uint256) {
        return _preDeposit(NATIVE, toChainId, receiver, amount);
    }

    function _preDepositErc20(
        address sender,
        uint256 toChainId,
        address tokenAddress,
        address receiver,
        uint256 amount,
        uint256 extraFee
    ) internal returns (uint256 rewardAmount) {
        rewardAmount = _preDeposit(tokenAddress, toChainId, receiver, amount);

        // Transfer Amount + Extra Fee to this contract
        SafeERC20Upgradeable.safeTransferFrom(
            IERC20WithDecimals(tokenAddress),
            sender,
            address(this),
            amount + extraFee
        );
    }

    /**
     * @notice Function to calcluate the reward awarded for rebalancing the liquidity pool (if any) from a deficit state
     * @param amount Amount of token being deposited into the liquidity pool
     * @param tokenAddress Address of token being deposited
     * @return rewardAmount Amount of incentive reward (if any) being given for rebalancing the pool
     */
    function getRewardAmount(uint256 amount, address tokenAddress) public view override returns (uint256 rewardAmount) {
        uint256 currentLiquidity = getCurrentLiquidity(tokenAddress);
        uint256 providedLiquidity = liquidityProviders.getSuppliedLiquidityByToken(tokenAddress);
        if (currentLiquidity < providedLiquidity) {
            uint256 liquidityDifference = providedLiquidity - currentLiquidity;
            if (amount >= liquidityDifference) {
                rewardAmount = incentivePool[tokenAddress];
            } else {
                // Multiply by 10000000000 to avoid 0 reward amount for small amount and liquidity difference
                rewardAmount = (amount * incentivePool[tokenAddress] * 10000000000) / liquidityDifference;
                rewardAmount = rewardAmount / 10000000000;
            }
        }
    }

    /**
     * @dev Function used to deposit native token into pool to initiate a cross chain token transfer.
     * @param receiver Address on toChainId where tokens needs to be transfered
     * @param toChainId Chain id where funds needs to be transfered
     */
    function depositNative(
        address receiver,
        uint256 toChainId,
        string calldata tag
    ) external payable override whenNotPaused nonReentrant {
        uint256 rewardAmount = _preDepositNative(receiver, toChainId, msg.value);
        emit Deposit(_msgSender(), NATIVE, receiver, toChainId, msg.value + rewardAmount, rewardAmount, tag);
    }

    function depositNativeAndSwap(
        address receiver,
        uint256 toChainId,
        string calldata tag,
        SwapRequest[] calldata swapRequest
    ) external payable whenNotPaused nonReentrant {
        uint256 totalPercentage = 0;
        {
            uint256 swapArrayLength = swapRequest.length;
            unchecked {
                for (uint256 index = 0; index < swapArrayLength; ++index) {
                    totalPercentage += swapRequest[index].percentage;
                }
            }
        }

        require(totalPercentage <= 100 * BASE_DIVISOR, "19");

        uint256 rewardAmount = _preDepositNative(receiver, toChainId, msg.value);
        emit DepositAndSwap(
            _msgSender(),
            NATIVE,
            receiver,
            toChainId,
            msg.value + rewardAmount,
            rewardAmount,
            tag,
            swapRequest
        );
    }

    /**
     * @notice Calculates and updates the fee components for a given token transfer and amount
     *         Executed on the destination chain while transferring tokens
     * @param _tokenAddress Address of token being transferred
     * @param _amount Amount of token being transferred
     * @return lpFee Fee component deducted and to be paid to liquidity providers
     * @return incentivePoolFee Fee component deducted and to be paid to arbitrageurs to incentivize them to rebalance the pool
     * @return transferFeeAmount Total Fee deducted
     */
    function _calculateAndUpdateFeeComponents(
        address _tokenAddress,
        uint256 _amount
    ) private returns (uint256 lpFee, uint256 incentivePoolFee, uint256 transferFeeAmount) {
        TokenInfo memory tokenInfo = tokenManager.getTokensInfo(_tokenAddress);
        (lpFee, incentivePoolFee, transferFeeAmount) = Fee.getFeeComponents(
            _amount,
            getCurrentLiquidity(_tokenAddress),
            liquidityProviders.getSuppliedLiquidityByToken(_tokenAddress),
            tokenInfo.equilibriumFee,
            tokenInfo.maxFee,
            tokenManager.excessStateTransferFeePerc(_tokenAddress)
        );

        // Update Incentive Pool Fee
        if (incentivePoolFee != 0) {
            incentivePool[_tokenAddress] += incentivePoolFee;
        }

        // Update LP Fee
        liquidityProviders.addLPFee(_tokenAddress, lpFee);
    }

    /**
     * @notice Executed on the destination chain by the CCMPExecutor
     *         Releases tokens to the receiver on the destination chain.
     * @param args Struct containing the arguments for the function
     */
    function sendFundsToUserFromCCMP(SendFundsToUserFromCCMPArgs calldata args) external whenNotPaused {
        // CCMP Verification
        (address senderContract, uint256 sourceChainId) = _ccmpMsgOrigin();
        require(senderContract == chainIdToLiquidityPoolAddress[sourceChainId], "24");

        // Get local token address
        address tokenAddress = tokenManager.symbolToTokenAddress(args.tokenSymbol);
        require(tokenAddress != address(0), "25");

        // Calculate token amount on this chain
        uint256 tokenDecimals = _getTokenDecimals(tokenAddress);
        require(tokenDecimals & args.sourceChainDecimals != 0, "48");
        uint256 amount = _getDestinationChainTokenAmount(
            args.sourceChainAmount,
            args.sourceChainDecimals,
            tokenDecimals
        );

        _verifyExitParams(tokenAddress, amount, args.receiver);

        (uint256 lpFee, , uint256 transferFeeAmount) = _calculateAndUpdateFeeComponents(tokenAddress, amount);

        // Calculate final amount to transfer
        uint256 amountToTransfer;
        require(transferFeeAmount <= amount, "28");
        unchecked {
            amountToTransfer = amount - (transferFeeAmount);
        }

        // Enforce that atleast minAmount (encoded in bytes as hyphenArgs[0]) is transferred to receiver
        // This behaviour is overridable if they initiate the transaction from the ReclaimerEOA
        if (args.hyphenArgs.length > 0) {
            (uint256 minAmount, address reclaimerEoa) = abi.decode(args.hyphenArgs[0], (uint256, address));
            require(
                tx.origin == reclaimerEoa ||
                    amountToTransfer >=
                    _getDestinationChainTokenAmount(minAmount, args.sourceChainDecimals, tokenDecimals),
                "49"
            );
        }

        // Send funds to user
        liquidityProviders.decreaseCurrentLiquidity(tokenAddress, amountToTransfer);
        _releaseFunds(tokenAddress, args.receiver, amountToTransfer);

        emit AssetSentFromCCMP(
            tokenAddress,
            amount,
            amountToTransfer,
            args.receiver,
            sourceChainId,
            lpFee,
            transferFeeAmount,
            0
        );
    }

    function _getTokenDecimals(address _tokenAddress) private view returns (uint256) {
        return _tokenAddress == NATIVE ? 18 : IERC20WithDecimals(_tokenAddress).decimals();
    }

    function _getDestinationChainTokenAmount(
        uint256 _sourceTokenAmount,
        uint256 _sourceTokenDecimals,
        uint256 _destinationChainDecimals
    ) private pure returns (uint256 amount) {
        amount = (_sourceTokenAmount * (10 ** _destinationChainDecimals)) / (10 ** _sourceTokenDecimals);
    }

    function sendFundsToUserV2(
        address tokenAddress,
        uint256 amount,
        address payable receiver,
        bytes calldata depositHash,
        uint256 nativeTokenPriceInTransferredToken,
        uint256 fromChainId,
        uint256 tokenGasBaseFee
    ) external nonReentrant onlyExecutor whenNotPaused {
        uint256[4] memory transferDetails = _calculateAmountAndDecreaseAvailableLiquidity(
            tokenAddress,
            amount,
            receiver,
            depositHash,
            nativeTokenPriceInTransferredToken,
            tokenGasBaseFee
        );
        _releaseFunds(tokenAddress, receiver, transferDetails[0]);

        emit AssetSent(
            tokenAddress,
            amount,
            transferDetails[0],
            receiver,
            depositHash,
            fromChainId,
            transferDetails[1],
            transferDetails[2],
            transferDetails[3]
        );
    }

    function _releaseFunds(address tokenAddress, address payable receiver, uint256 amount) internal {
        if (tokenAddress == NATIVE) {
            (bool success, ) = receiver.call{value: amount}("");
            require(success, "30");
        } else {
            SafeERC20Upgradeable.safeTransfer(IERC20WithDecimals(tokenAddress), receiver, amount);
        }
    }

    function swapAndSendFundsToUser(
        address tokenAddress,
        uint256 amount,
        address payable receiver,
        bytes calldata depositHash,
        uint256 nativeTokenPriceInTransferredToken,
        uint256 tokenGasBaseFee,
        uint256 fromChainId,
        uint256 swapGasOverhead,
        SwapRequest[] calldata swapRequests,
        string memory swapAdaptor
    ) external nonReentrant onlyExecutor whenNotPaused {
        require(swapRequests.length > 0, "31");
        require(swapAdaptorMap[swapAdaptor] != address(0), "32");

        uint256[4] memory transferDetails = _calculateAmountAndDecreaseAvailableLiquidity(
            tokenAddress,
            amount,
            receiver,
            depositHash,
            nativeTokenPriceInTransferredToken,
            tokenGasBaseFee
        );

        if (tokenAddress == NATIVE) {
            (bool success, ) = swapAdaptorMap[swapAdaptor].call{value: transferDetails[0]}("");
            require(success, "33");
            ISwapAdaptor(swapAdaptorMap[swapAdaptor]).swapNative(transferDetails[0], receiver, swapRequests);
        } else {
            {
                uint256 gasBeforeApproval = gasleft();
                SafeERC20Upgradeable.safeApprove(
                    IERC20WithDecimals(tokenAddress),
                    address(swapAdaptorMap[swapAdaptor]),
                    0
                );
                SafeERC20Upgradeable.safeApprove(
                    IERC20WithDecimals(tokenAddress),
                    address(swapAdaptorMap[swapAdaptor]),
                    transferDetails[0]
                );

                swapGasOverhead += (gasBeforeApproval - gasleft());
            }
            {
                // Calculate Gas Fee
                uint256 swapGasFee = _calculateAndUpdateGasFee(
                    tokenAddress,
                    nativeTokenPriceInTransferredToken,
                    swapGasOverhead,
                    0,
                    _msgSender()
                );

                transferDetails[0] -= swapGasFee; // Deduct swap gas fee from amount to be sent
                transferDetails[3] += swapGasFee; // Add swap gas fee to gas fee
            }

            ISwapAdaptor(swapAdaptorMap[swapAdaptor]).swap(tokenAddress, transferDetails[0], receiver, swapRequests);
        }

        emit AssetSent(
            tokenAddress,
            amount,
            transferDetails[0],
            receiver,
            depositHash,
            fromChainId,
            transferDetails[1],
            transferDetails[2],
            transferDetails[3]
        );
    }

    function _calculateAmountAndDecreaseAvailableLiquidity(
        address tokenAddress,
        uint256 amount,
        address payable receiver,
        bytes calldata depositHash,
        uint256 nativeTokenPriceInTransferredToken,
        uint256 tokenGasBaseFee
    ) internal returns (uint256[4] memory) {
        uint256 initialGas = gasleft();
        _verifyExitParams(tokenAddress, amount, receiver);

        require(receiver != address(0), "35");
        (bytes32 hashSendTransaction, bool status) = checkHashStatus(tokenAddress, amount, receiver, depositHash);

        require(!status, "36");
        processedHash[hashSendTransaction] = true;
        // uint256 amountToTransfer, uint256 lpFee, uint256 transferFeeAmount, uint256 gasFee
        uint256[4] memory transferDetails = getAmountToTransferV2(
            initialGas,
            tokenAddress,
            amount,
            nativeTokenPriceInTransferredToken,
            tokenGasBaseFee
        );

        liquidityProviders.decreaseCurrentLiquidity(tokenAddress, transferDetails[0]);

        return transferDetails;
    }

    /**
     * @dev Internal function to calculate amount of token that needs to be transfered afetr deducting all required fees.
     * Fee to be deducted includes gas fee, lp fee and incentive pool amount if needed.
     * @param initialGas Gas provided initially before any calculations began
     * @param tokenAddress Token address for which calculation needs to be done
     * @param amount Amount of token to be transfered before deducting the fee
     * @param nativeTokenPriceInTransferredToken Price of native token in terms of the token being transferred (multiplied base div), used to calculate gas fee
     * @return [ amountToTransfer, lpFee, transferFeeAmount, gasFee ]
     */

    function getAmountToTransferV2(
        uint256 initialGas,
        address tokenAddress,
        uint256 amount,
        uint256 nativeTokenPriceInTransferredToken,
        uint256 tokenGasBaseFee
    ) internal returns (uint256[4] memory) {
        TokenInfo memory tokenInfo = tokenManager.getTokensInfo(tokenAddress);
        (uint256 lpFee, , uint256 transferFeeAmount) = _calculateAndUpdateFeeComponents(tokenAddress, amount);

        // Calculate Gas Fee
        uint256 totalGasUsed = initialGas + tokenInfo.transferOverhead + baseGas - gasleft();
        uint256 gasFee = _calculateAndUpdateGasFee(
            tokenAddress,
            nativeTokenPriceInTransferredToken,
            totalGasUsed,
            tokenGasBaseFee,
            _msgSender()
        );
        require(transferFeeAmount + gasFee <= amount, "37");
        unchecked {
            uint256 amountToTransfer = amount - (transferFeeAmount + gasFee);
            return [amountToTransfer, lpFee, transferFeeAmount, gasFee];
        }
    }

    function _calculateAndUpdateGasFee(
        address tokenAddress,
        uint256 nativeTokenPriceInTransferredToken,
        uint256 gasUsed,
        uint256 tokenGasBaseFee,
        address sender
    ) private returns (uint256) {
        uint256 gasFee = Fee.calculateGasFee(nativeTokenPriceInTransferredToken, gasUsed, tokenGasBaseFee);
        gasFeeAccumulatedByToken[tokenAddress] += gasFee;
        gasFeeAccumulated[tokenAddress][sender] += gasFee;
        return gasFee;
    }

    function getTransferFee(address tokenAddress, uint256 amount) external view override returns (uint256) {
        TokenInfo memory tokenInfo = tokenManager.getTokensInfo(tokenAddress);

        return
            Fee.getTransferFee(
                amount,
                getCurrentLiquidity(tokenAddress),
                liquidityProviders.getSuppliedLiquidityByToken(tokenAddress),
                tokenInfo.equilibriumFee,
                tokenInfo.maxFee,
                tokenManager.excessStateTransferFeePerc(tokenAddress)
            );
    }

    function checkHashStatus(
        address tokenAddress,
        uint256 amount,
        address payable receiver,
        bytes calldata depositHash
    ) public view returns (bytes32 hashSendTransaction, bool status) {
        hashSendTransaction = keccak256(abi.encode(tokenAddress, amount, receiver, keccak256(depositHash)));

        status = processedHash[hashSendTransaction];
    }

    function withdrawErc20GasFee(address tokenAddress) external override onlyExecutor whenNotPaused nonReentrant {
        require(tokenAddress != NATIVE, "38");
        uint256 gasFeeAccumulatedByExecutor = _updateGasFeeAccumulated(tokenAddress, _msgSender());
        SafeERC20Upgradeable.safeTransfer(IERC20WithDecimals(tokenAddress), _msgSender(), gasFeeAccumulatedByExecutor);
    }

    function withdrawNativeGasFee() external override onlyExecutor whenNotPaused nonReentrant {
        uint256 gasFeeAccumulatedByExecutor = _updateGasFeeAccumulated(NATIVE, _msgSender());
        (bool success, ) = payable(_msgSender()).call{value: gasFeeAccumulatedByExecutor}("");
        require(success, "41");
    }

    function _updateGasFeeAccumulated(
        address tokenAddress,
        address executor
    ) private returns (uint256 gasFeeAccumulatedByExecutor) {
        gasFeeAccumulatedByExecutor = gasFeeAccumulated[tokenAddress][executor];
        require(gasFeeAccumulatedByExecutor != 0, "39");
        gasFeeAccumulatedByToken[tokenAddress] = gasFeeAccumulatedByToken[tokenAddress] - gasFeeAccumulatedByExecutor;
        gasFeeAccumulated[tokenAddress][executor] = 0;
    }

    function transfer(
        address _tokenAddress,
        address receiver,
        uint256 _tokenAmount
    ) external override whenNotPaused nonReentrant {
        require(receiver != address(0), "42");
        require(_msgSender() == address(liquidityProviders), "2");
        if (_tokenAddress == NATIVE) {
            require(address(this).balance >= _tokenAmount, "43");
            (bool success, ) = receiver.call{value: _tokenAmount}("");
            require(success, "44");
        } else {
            IERC20WithDecimals baseToken = IERC20WithDecimals(_tokenAddress);
            require(baseToken.balanceOf(address(this)) >= _tokenAmount, "45");
            SafeERC20Upgradeable.safeTransfer(baseToken, receiver, _tokenAmount);
        }
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
    /// @notice This function is called by the receiver contract on the destination chain to get the source of the sent message
    ///         CCMPGateway will append the source details at the end of the calldata, this is done so that existing (upgradeable)
    ///         contracts do not need to change their function signatures
    function _ccmpMsgOrigin() internal view returns (address sourceChainSender, uint256 sourceChainId) {
        require(msg.sender == ccmpExecutor, "46");

        /*
         * Calldata Map:
         * |-------?? bytes--------|------32 bytes-------|---------20 bytes -------|
         * |---Original Calldata---|---Source Chain Id---|---Source Chain Sender---|
         */
        assembly {
            sourceChainSender := shr(96, calldataload(sub(calldatasize(), 20)))
            sourceChainId := calldataload(sub(calldatasize(), 52))
        }
    }

    receive() external payable {}
}
