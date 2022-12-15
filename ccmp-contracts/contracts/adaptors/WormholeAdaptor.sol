// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IWormhole.sol";
import "./base/CCMPAdaptorBase.sol";

/// @title Wormhole Adaptor
/// @author ankur@biconomy.io
/// @notice Adaptor for the Wormole protocol into the CCMP System
contract WormholeAdaptor is CCMPAdaptorBase {
    using CCMPMessageUtils for CCMPMessage;
    enum DeploymentConfiguration {
        Mainnet,
        Testnet
    }

    uint32 public wormholeMessageNonce = 0;
    IWormhole public wormhole;

    mapping(uint16 => uint256) public womrholeChainIdToChainId;
    mapping(uint256 => address) public chainIdToWormholeAdaptor;

    event CCMPMessageRoutedViaWormhole(
        uint32 indexed wormholeNonce,
        uint64 indexed sequenceID,
        uint8 indexed consistencyLevel
    );
    event WormholeUpdated(address indexed newWormhole);
    event WormholeChainIdUpdated(
        uint16 indexed wormholeChainId,
        uint256 indexed chainId
    );
    event WormholeAdaptorUpdated(
        uint256 indexed chainId,
        address indexed newWormholeAdaptor
    );

    constructor(
        address _wormhole,
        address _ccmpGateway,
        address _owner,
        address _pauser,
        DeploymentConfiguration _deploymentConfiguration
    ) CCMPAdaptorBase(_ccmpGateway, _owner, _pauser) {
        if (_wormhole == address(0)) {
            revert InvalidAddress("wormhole", _wormhole);
        }
        if (_ccmpGateway == address(0)) {
            revert InvalidAddress("ccmpGateway", _ccmpGateway);
        }
        if (_pauser == address(0)) {
            revert InvalidAddress("pauser", _pauser);
        }

        wormhole = IWormhole(_wormhole);

        // https://docs.wormhole.com/wormhole/contracts
        if (_deploymentConfiguration == DeploymentConfiguration.Mainnet) {
            // Set Mainnet Chain IDs
            _updateWormholeChainId(2, 1);
            _updateWormholeChainId(4, 56);
            _updateWormholeChainId(5, 137);
            _updateWormholeChainId(6, 43114);
            _updateWormholeChainId(7, 42262);
            _updateWormholeChainId(9, 1313161554);
            _updateWormholeChainId(10, 250);
            _updateWormholeChainId(11, 686);
            _updateWormholeChainId(12, 787);
            _updateWormholeChainId(13, 8217);
            _updateWormholeChainId(14, 42220);
        } else if (
            _deploymentConfiguration == DeploymentConfiguration.Testnet
        ) {
            // Set Testnet Chain IDs
            _updateWormholeChainId(2, 5);
            _updateWormholeChainId(10001, 3);
            _updateWormholeChainId(4, 97);
            _updateWormholeChainId(5, 80001);
            _updateWormholeChainId(6, 43113);
            _updateWormholeChainId(7, 42261);
            _updateWormholeChainId(9, 1313161555);
            _updateWormholeChainId(10, 4002);
            _updateWormholeChainId(11, 686);
            _updateWormholeChainId(12, 787);
            _updateWormholeChainId(13, 1001);
            _updateWormholeChainId(14, 44787);
        }
    }

    function setWormholeAdaptorAddress(
        uint256 _chainId,
        address _adaptor
    ) external onlyOwner {
        chainIdToWormholeAdaptor[_chainId] = _adaptor;
        emit WormholeAdaptorUpdated(_chainId, _adaptor);
    }

    function updateWormhole(IWormhole _wormhole) external onlyOwner {
        wormhole = _wormhole;
        emit WormholeUpdated(address(wormhole));
    }

    function _updateWormholeChainId(
        uint16 _wormholeChainId,
        uint256 _chainId
    ) internal {
        womrholeChainIdToChainId[_wormholeChainId] = _chainId;
        emit WormholeChainIdUpdated(_wormholeChainId, _chainId);
    }

    function updateWormholeChainId(
        uint16 _wormholeChainId,
        uint256 _chainId
    ) external onlyOwner {
        _updateWormholeChainId(_wormholeChainId, _chainId);
    }

    /// @notice Route a message to the Wormhole protocol
    /// @param _message The message to be routed
    /// @param _routerArgs The consistency level of the message abi encoded as bytes array
    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata _routerArgs
    ) external nonReentrant onlyCCMPGateway whenNotPaused {
        uint8 consistencyLevel = abi.decode(_routerArgs, (uint8));
        uint64 sequenceId = wormhole.publishMessage(
            wormholeMessageNonce,
            abi.encode(_message.hash()),
            consistencyLevel
        );
        emit CCMPMessageRoutedViaWormhole(
            wormholeMessageNonce,
            sequenceId,
            consistencyLevel
        );

        ++wormholeMessageNonce;
    }

    /// @notice Verify a message from the Wormhole protocol
    /// @param _ccmpMessage The message to be verified
    /// @param _verificationData VAA from Wormhole encoded as a bytes array
    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    )
        external
        virtual
        nonReentrant
        whenNotPaused
        returns (bool, string memory)
    {
        // Validate Via Wormhole
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole
            .parseAndVerifyVM(_verificationData);

        if (!valid) {
            return (false, reason);
        }

        // Validate payload agaisnt the message hash
        bool status = keccak256(vm.payload) ==
            keccak256(abi.encode(_ccmpMessage.hash()));

        if (!status) {
            return (false, "ERR_PAYLOAD_MISMATCH");
        }

        // Validate Origin
        uint256 chainId = womrholeChainIdToChainId[vm.emitterChainId];
        address emitterAddress = _bytes32ToAddress(vm.emitterAddress);
        if (chainIdToWormholeAdaptor[chainId] != emitterAddress) {
            return (false, "ERR_INVALID_ORIGIN");
        }

        return (true, "");
    }

    function _bytes32ToAddress(
        bytes32 _data
    ) internal pure returns (address s) {
        s = address(uint160(uint256(_data)));
    }
}
