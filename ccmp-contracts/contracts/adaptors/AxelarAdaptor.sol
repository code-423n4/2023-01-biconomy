// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IAxelarGateway.sol";
import "../structures/CrossChainMessage.sol";

import "./base/CCMPAdaptorBase.sol";

error AxelarAdaptorSourceChainNotSupported(uint256 chainId);
error AxelarAdaptorDestinationChainNotSupported(uint256 chainId);
error NotApprovedByGateway();
error InvalidSender();

/// @title Axelar Adaptor
/// @author ankur@biconomy.io
/// @notice Adaptor for the Axelar protocol into the CCMP System
contract AxelarAdaptor is CCMPAdaptorBase {
    using CCMPMessageUtils for CCMPMessage;

    mapping(uint256 => string) public chainIdToName;
    mapping(string => string) public chainNameToAdaptorAddressChecksummed;
    IAxelarGateway public axelarGateway;

    // Whether a message has been verified or not
    mapping(bytes32 => bool) public messageHashVerified;

    event AxelarGatewayUpdated(address indexed newAxelarGateway);
    event ChainNameUpdated(
        uint256 indexed destinationChainId,
        string indexed destinationChainName
    );
    event AxelarAdaptorAddressChecksummedUpdated(
        string indexed chainName,
        string indexed newAxelarAdaptorAddressChecksummed
    );
    event AxelarMessageRouted();
    event AxelarMessageVerified(
        bytes32 commandId,
        string indexed sourceChain,
        string indexed sourceAddress,
        bytes payload,
        bytes32 indexed messageHash
    );

    constructor(
        address _axelarGateway,
        address _ccmpGateway,
        address _owner,
        address _pauser
    ) CCMPAdaptorBase(_ccmpGateway, _owner, _pauser) {
        if (_axelarGateway == address(0)) {
            revert InvalidAddress("axelarGateway", _axelarGateway);
        }
        if (_ccmpGateway == address(0)) {
            revert InvalidAddress("ccmpGateway", _ccmpGateway);
        }
        if (_pauser == address(0)) {
            revert InvalidAddress("pauser", _pauser);
        }

        axelarGateway = IAxelarGateway(_axelarGateway);

        // Setup Mainnet Chain ID to Names
        chainIdToName[1313161554] = "aurora";
        chainIdToName[43114] = "Avalanche";
        chainIdToName[56] = "binance";
        chainIdToName[1] = "Ethereum";
        chainIdToName[250] = "Fantom";
        chainIdToName[1284] = "Moonbeam";
        chainIdToName[137] = "Polygon";

        // Setup Testnet Chain ID to Names
        chainIdToName[1313161555] = "aurora";
        chainIdToName[43113] = "Avalanche";
        chainIdToName[97] = "binance";
        chainIdToName[3] = "Ethereum";
        chainIdToName[4002] = "Fantom";
        chainIdToName[1287] = "Moonbeam";
        chainIdToName[80001] = "Polygon";
    }

    /// @notice Called by the CCMP Gateway to route a message via Axelar
    /// @param _message The message to be routed
    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata
    ) external nonReentrant whenNotPaused onlyCCMPGateway {
        string memory destinationChainName = chainIdToName[
            _message.destinationChainId
        ];
        string
            memory destinationRouterAddress = chainNameToAdaptorAddressChecksummed[
                destinationChainName
            ];

        if (
            bytes(destinationChainName).length == 0 ||
            bytes(destinationRouterAddress).length == 0
        ) {
            revert AxelarAdaptorDestinationChainNotSupported(
                _message.destinationChainId
            );
        }

        axelarGateway.callContract(
            destinationChainName,
            destinationRouterAddress,
            abi.encode(_message.hash())
        );

        emit AxelarMessageRouted();
    }

    /// @notice Called by the CCMP Gateway to verify a message routed via Axelar
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

    /// @notice Called by the Axelar Gateway to verify a message routed via Axelar
    /// @param _commandId The command ID of the message to be verified
    /// @param _sourceChain The source chain of the message to be verified
    /// @param _sourceAddress The source address of the message to be verified
    /// @param _payload The payload of the message to be verified
    function execute(
        bytes32 _commandId,
        string calldata _sourceChain,
        string calldata _sourceAddress,
        bytes calldata _payload
    ) external {
        bytes32 payloadHash = keccak256(_payload);

        // Call axelar gateway to validate contarct call
        if (
            !axelarGateway.validateContractCall(
                _commandId,
                _sourceChain,
                _sourceAddress,
                payloadHash
            )
        ) {
            revert NotApprovedByGateway();
        }

        // Validate message origin
        if (
            keccak256(abi.encodePacked(_sourceAddress)) !=
            keccak256(
                abi.encodePacked(
                    chainNameToAdaptorAddressChecksummed[_sourceChain]
                )
            )
        ) {
            revert InvalidSender();
        }

        // Verify the message
        bytes32 ccmpMessageHash = abi.decode(_payload, (bytes32));
        messageHashVerified[ccmpMessageHash] = true;

        emit AxelarMessageVerified(
            _commandId,
            _sourceChain,
            _sourceAddress,
            _payload,
            ccmpMessageHash
        );
    }

    function setChainIdToName(
        uint256 _chainId,
        string calldata _chainName
    ) external onlyOwner {
        chainIdToName[_chainId] = _chainName;
        emit ChainNameUpdated(_chainId, _chainName);
    }

    function setAxelarAdaptorAddressChecksummed(
        string calldata _chainName,
        string calldata _adaptorAddressChecksummed
    ) external onlyOwner {
        chainNameToAdaptorAddressChecksummed[
            _chainName
        ] = _adaptorAddressChecksummed;
        emit AxelarAdaptorAddressChecksummedUpdated(
            _chainName,
            _adaptorAddressChecksummed
        );
    }

    function updateAxelarGateway(
        IAxelarGateway _axelarGateway
    ) external onlyOwner {
        axelarGateway = _axelarGateway;
        emit AxelarGatewayUpdated(address(_axelarGateway));
    }
}
