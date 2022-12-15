// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {AbacusConnectionClient} from "./base/AbacusConnectionClient.sol";
import {IMessageRecipient} from "@abacus-network/core/interfaces/IMessageRecipient.sol";
import {TypeCasts} from "@abacus-network/core/contracts/libs/TypeCasts.sol";
import "../interfaces/IAxelarGateway.sol";
import "../structures/CrossChainMessage.sol";

import "./base/CCMPAdaptorBase.sol";

error HyperlaneAdapterDestinationChainUnsupported(uint256 chainId);
error InvalidOriginChain(uint256 chainId);
error InvalidSender(address sender, uint256 chainId);

/// @title Hyperlane Adaptor
/// @author ankur@biconomy.io
/// @notice Adaptor for the abacus protocol into the CCMP System
contract HyperlaneAdaptor is
    AbacusConnectionClient,
    CCMPAdaptorBase,
    IMessageRecipient
{
    using CCMPMessageUtils for CCMPMessage;

    event DomainIdUpdated(uint256 indexed chainId, uint32 indexed newDomainId);
    event HyperlaneMessageRouted(uint256 indexed messageId);
    event HyperlaneMessageVerified(
        bytes32 indexed ccmpMessageHash,
        uint32 indexed origin,
        uint256 indexed sourceChainId,
        address sender
    );
    event HyperlaneAdaptorUpdated(
        uint256 indexed chainId,
        address indexed newAbacusAdaptor
    );

    // Hyperlane Domain ID to Chain ID
    mapping(uint256 => uint32) public chainIdToDomainId;
    mapping(uint32 => uint256) public domainIdToChainId;

    // Whether a message has been verified or not
    mapping(bytes32 => bool) public messageHashVerified;

    // Hyperlane Adaptor Mapping from other chains
    mapping(uint256 => address) public chainIdToHyperlaneAdaptor;

    constructor(
        address _ccmpGateway,
        address _owner,
        address _pauser,
        address _abacusConnectionManager,
        address _interchainGasPaymaster
    )
        CCMPAdaptorBase(_ccmpGateway, _owner, _pauser)
        AbacusConnectionClient(
            _abacusConnectionManager,
            _interchainGasPaymaster
        )
    {
        if (_ccmpGateway == address(0)) {
            revert InvalidAddress("ccmpGateway", _ccmpGateway);
        }
        if (_pauser == address(0)) {
            revert InvalidAddress("pauser", _pauser);
        }
        if (_abacusConnectionManager == address(0)) {
            revert InvalidAddress(
                "abacusConnectionManager",
                _abacusConnectionManager
            );
        }
        if (_interchainGasPaymaster == address(0)) {
            revert InvalidAddress(
                "interchainGasPaymaster",
                _interchainGasPaymaster
            );
        }
        // Initialize default domain IDs: https://docs.useabacus.network/abacus-docs/developers/domains
        // Testnet
        _updateDomainId(44787, 1000);
        _updateDomainId(421611, 0x61722d72);
        _updateDomainId(97, 0x62732d74);
        _updateDomainId(43113, 43113);
        _updateDomainId(5, 5);
        _updateDomainId(42, 3000);
        _updateDomainId(80001, 80001);
        _updateDomainId(69, 0x6f702d6b);

        // Mainnet
        _updateDomainId(42161, 0x617262);
        _updateDomainId(43114, 0x61766178);
        _updateDomainId(56, 0x627363);
        _updateDomainId(42220, 0x63656c6f);
        _updateDomainId(1, 0x657468);
        _updateDomainId(10, 0x6f70);
        _updateDomainId(137, 0x706f6c79);
    }

    /// @notice Called by Abacus's Inbox Contract (onlyInbox) to verify a inbound CCMP Message
    /// @param _origin The origin domain ID
    /// @param _sender The sender contract on the source chain
    /// @param _message The message to be verified
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external onlyInbox {
        // Check if the source chain is registered
        uint256 originChainId = domainIdToChainId[_origin];
        if (originChainId == 0 || originChainId == block.chainid) {
            revert InvalidOriginChain(_origin);
        }

        // Ensure that the message is sent by the Abacus Adaptor on the source chain
        address sender = TypeCasts.bytes32ToAddress(_sender);
        if (sender != chainIdToHyperlaneAdaptor[originChainId]) {
            revert InvalidSender(sender, originChainId);
        }

        bytes32 ccmpMessageHash = abi.decode(_message, (bytes32));
        messageHashVerified[ccmpMessageHash] = true;

        emit HyperlaneMessageVerified(
            ccmpMessageHash,
            _origin,
            originChainId,
            sender
        );
    }

    /// @notice Called by the CCMP Gateway to route a message via Abacus
    /// @param _message The message to be routed
    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata
    ) external nonReentrant whenNotPaused onlyCCMPGateway {
        uint32 destinationChainDomainId = chainIdToDomainId[
            _message.destinationChainId
        ];
        address destinationRouterAddress = chainIdToHyperlaneAdaptor[
            _message.destinationChainId
        ];

        if (
            destinationChainDomainId == 0 ||
            destinationRouterAddress == address(0)
        ) {
            revert HyperlaneAdapterDestinationChainUnsupported(
                _message.destinationChainId
            );
        }

        bytes32 destinationRouterAddressEncoded = TypeCasts.addressToBytes32(
            chainIdToHyperlaneAdaptor[_message.destinationChainId]
        );

        uint256 messageId = _outbox().dispatch(
            destinationChainDomainId,
            destinationRouterAddressEncoded,
            abi.encode(_message.hash())
        );

        emit HyperlaneMessageRouted(messageId);
    }

    /// @notice Called by the CCMP Gateway to verify a message routed via Abacus
    /// @param _ccmpMessage The message to be verified
    /// @return status Whether the message is verified or not
    /// @return message Message/Error string
    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata
    ) external view virtual whenNotPaused returns (bool, string memory) {
        return
            messageHashVerified[_ccmpMessage.hash()]
                ? (true, "")
                : (false, "ERR__MESSAGE_NOT_VERIFIED");
    }

    function _updateDomainId(uint256 _chainId, uint32 _domainId) internal {
        chainIdToDomainId[_chainId] = _domainId;
        domainIdToChainId[_domainId] = _chainId;
        emit DomainIdUpdated(_chainId, _domainId);
    }

    function updateDomainId(
        uint256 _chainId,
        uint32 _domainId
    ) external onlyOwner {
        _updateDomainId(_chainId, _domainId);
    }

    function setHyperlaneAdaptor(
        uint256 _chainId,
        address _hyperlaneAdaptor
    ) external onlyOwner {
        chainIdToHyperlaneAdaptor[_chainId] = _hyperlaneAdaptor;
        emit HyperlaneAdaptorUpdated(_chainId, _hyperlaneAdaptor);
    }
}
