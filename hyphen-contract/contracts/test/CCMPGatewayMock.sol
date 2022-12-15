// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../hyphen/interfaces/ICCMPGateway.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CCMPGatewayMock is ICCMPGateway {
    address private constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct sendMessageArgs {
        uint256 destinationChainId;
        string adaptorName;
        ICCMPGateway.CCMPMessagePayload[] payloads;
        ICCMPGateway.GasFeePaymentArgs gasFeePaymentArgs;
        bytes routerArgs;
    }

    sendMessageArgs public lastCallArgs;

    bool shouldRevert = false;

    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        ICCMPGateway.CCMPMessagePayload[] calldata _payloads,
        ICCMPGateway.GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable override returns (bool sent) {
        if (shouldRevert) {
            revert("Mocked revert");
        }

        if (_gasFeePaymentArgs.feeTokenAddress != NATIVE) {
            IERC20(_gasFeePaymentArgs.feeTokenAddress).transferFrom(
                msg.sender,
                _gasFeePaymentArgs.relayer,
                _gasFeePaymentArgs.feeAmount
            );
        } else {
            (bool success, bytes memory returndata) = _gasFeePaymentArgs.relayer.call{
                value: _gasFeePaymentArgs.feeAmount
            }("");
            require(success, string(returndata));
        }

        sent = true;

        lastCallArgs.destinationChainId = _destinationChainId;
        lastCallArgs.adaptorName = _adaptorName;
        lastCallArgs.routerArgs = _routerArgs;
        lastCallArgs.gasFeePaymentArgs = _gasFeePaymentArgs;

        for (uint256 i = 0; i < _payloads.length; i++) {
            lastCallArgs.payloads.push(_payloads[i]);
        }
    }

    function lastCallPayload() external view returns (ICCMPGateway.CCMPMessagePayload[] memory) {
        return lastCallArgs.payloads;
    }

    function setRevertStatus(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function callContract(
        address to,
        bytes calldata _calldata,
        uint256 _fromChainId,
        address _fromContractAddress
    ) external {
        (bool success, bytes memory returnData) = to.call(
            abi.encodePacked(_calldata, _fromChainId, _fromContractAddress)
        );
        require(success, string(returnData));
    }
}
