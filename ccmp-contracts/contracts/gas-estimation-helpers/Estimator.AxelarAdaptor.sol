// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../adaptors/AxelarAdaptor.sol";

contract EstimatorAxelarAdaptor is AxelarAdaptor {
    using CCMPMessageUtils for CCMPMessage;

    constructor(
        address _axelarGateway,
        address _ccmpGateway,
        address _owner,
        address _pauser
    ) AxelarAdaptor(_axelarGateway, _ccmpGateway, _owner, _pauser) {}

    /// @notice Dummy function to estimate gas for AxelarAdaptor.routeMessage, only to be used for simulation purposes
    /// @param _ccmpMessage The message to be verified
    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata
    )
        external
        view
        virtual
        override
        whenNotPaused
        returns (bool, string memory)
    {
        return
            messageHashVerified[_ccmpMessage.hash()]
                ? (true, "") // HeHe
                : (true, "ERR__MESSAGE_NOT_VERIFIED");
    }
}
