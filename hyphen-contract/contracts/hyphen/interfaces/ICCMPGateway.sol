// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICCMPGateway {
    struct CCMPMessagePayload {
        address to;
        bytes _calldata;
    }

    struct GasFeePaymentArgs {
        address feeTokenAddress;
        uint256 feeAmount;
        address relayer;
    }

    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable returns (bool sent);
}
