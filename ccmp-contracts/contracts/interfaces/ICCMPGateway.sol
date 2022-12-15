// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../structures/CrossChainMessage.sol";
import "./ICCMPRouterAdaptor.sol";
import "./ICCMPExecutor.sol";

interface ICCMPGatewayBase {
    error UnsupportedAdapter(string adaptorName);
}

interface ICCMPGatewaySender is ICCMPGatewayBase {
    // Errors
    error UnsupportedDestinationChain(uint256 destinationChainId);
    error InvalidPayload(string reason);
    error AmountIsZero();
    error NativeAmountMismatch();
    error NativeTransferFailed(address relayer, bytes data);
    error AmountExceedsBalance(uint256 _amount, uint256 balance);
    error InsufficientNativeAmount(
        uint256 requiredAmount,
        uint256 actualAmount
    );

    // Events
    event CCMPMessageRouted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        GasFeePaymentArgs gasFeePaymentArgs,
        CCMPMessagePayload[] payload
    );
    event FeePaid(
        address indexed _tokenAddress,
        uint256 indexed _amount,
        address indexed _relayer
    );

    // Functions
    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable returns (bool sent);

    function getGasFeePaymentDetails(
        bytes32 _messageHash,
        address[] calldata _tokens
    ) external view returns (uint256[] memory balances);

    /// @notice Handles fee payment
    function addGasFee(
        GasFeePaymentArgs memory _args,
        bytes32 _messageHash,
        address _sender
    ) external payable;
}

interface ICCMPGatewayReceiver is ICCMPGatewayBase {
    // Errors
    error InvalidSource(uint256 sourceChainId, ICCMPGateway sourceGateway);
    error WrongDestination(
        uint256 destinationChainId,
        ICCMPGateway destinationGateway
    );
    error AlreadyExecuted(uint256 nonce);
    error VerificationFailed(string reason);
    error ExternalCallFailed(
        uint256 index,
        address contractAddress,
        bytes returndata
    );

    // Events
    event CCMPMessageExecuted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        GasFeePaymentArgs gasFeePaymentArgs,
        CCMPMessagePayload[] payload
    );

    event CCMPPayloadExecuted(
        uint256 indexed index,
        address indexed contractAddress,
        bool success,
        bytes returndata
    );

    // Functions
    function receiveMessage(
        CCMPMessage calldata _message,
        bytes calldata _verificationData,
        bool _allowPartialCompletion
    ) external returns (bool received);
}

interface ICCMPConfiguration {
    // Events
    event GatewayUpdated(
        uint256 indexed destinationChainId,
        ICCMPGateway indexed gateway
    );
    event CCMPExecutorUpdated(ICCMPExecutor indexed _ccmpExecutor);
    event AdaptorUpdated(string indexed adaptorName, address indexed adaptor);
    event ContractPaused();
    event ContractUnpaused();
    event PauserUpdated(address indexed pauser);

    // Functions
    function setGateway(uint256 _chainId, ICCMPGateway _gateway) external;

    function setRouterAdaptor(string calldata name, ICCMPRouterAdaptor adaptor)
        external;

    function setCCMPExecutor(ICCMPExecutor _ccmpExecutor) external;

    function setPauser(address _pauser) external;

    function gateway(uint256 _chainId)
        external
        view
        returns (ICCMPGateway gateway_);

    function routerAdator(string calldata name)
        external
        view
        returns (ICCMPRouterAdaptor adaptor);

    function ccmpExecutor() external view returns (ICCMPExecutor executor);

    function transferOwnership(address _newOwner) external;

    function owner() external view returns (address owner_);

    function pauser() external view returns (address pauser_);

    function pause() external;

    function unpause() external;
}

interface ICCMPGateway is
    ICCMPGatewaySender,
    ICCMPGatewayReceiver,
    ICCMPConfiguration
{}
