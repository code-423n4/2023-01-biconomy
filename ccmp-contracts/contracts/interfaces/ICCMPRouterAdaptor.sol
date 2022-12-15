// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../structures/CrossChainMessage.sol";

interface ICCMPRouterAdaptor {
    error CallerIsNotCCMPGateway();

    error InvalidAddress(string parameterName, address value);

    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external returns (bool, string memory);

    function routePayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _routeArgs
    ) external;
}
