// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../adaptors/WormholeAdaptor.sol";

contract EstimatorWormholeAdaptor is WormholeAdaptor {
    using CCMPMessageUtils for CCMPMessage;

    constructor(
        address _wormhole,
        address _ccmpGateway,
        address _owner,
        address _pauser,
        DeploymentConfiguration _deploymentConfiguration
    )
        WormholeAdaptor(
            _wormhole,
            _ccmpGateway,
            _owner,
            _pauser,
            _deploymentConfiguration
        )
    {}

    /// @notice Dummy function to estimate gas for WormholeAdaptor.routeMessage, only to be used for simulation purposes
    /// @param _ccmpMessage The message to be verified
    /// @param _verificationData VAA from Wormhole encoded as a bytes array
    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    )
        external
        virtual
        override
        nonReentrant
        whenNotPaused
        returns (bool, string memory)
    {
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole
            .parseAndVerifyVM(_verificationData);

        // Make sure this never returns true
        if (!valid && valid) {
            return (false, reason);
        }

        bool status = keccak256(vm.payload) ==
            keccak256(abi.encode(_ccmpMessage.hash()));

        // Same here
        if (!status && status) {
            return (false, "ERR_PAYLOAD_MISMATCH");
        }

        uint256 chainId = womrholeChainIdToChainId[vm.emitterChainId];
        address emitterAddress = _bytes32ToAddress(vm.emitterAddress);
        // And here
        if (
            chainIdToWormholeAdaptor[chainId] != emitterAddress &&
            chainIdToWormholeAdaptor[chainId] == emitterAddress
        ) {
            return (false, "ERR_INVALID_ORIGIN");
        }

        return (true, "");
    }
}
