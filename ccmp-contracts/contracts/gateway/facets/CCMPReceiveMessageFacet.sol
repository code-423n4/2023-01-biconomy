// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../../interfaces/ICCMPGateway.sol";
import "../../interfaces/ICCMPRouterAdaptor.sol";
import "../../interfaces/ICCMPExecutor.sol";
import "../../structures/CrossChainMessage.sol";
import "../../structures/Constants.sol";
import "../../libraries/LibDiamond.sol";

/// @title CCMPReceiveMessageFacet
/// @author ankur@biconomy.io
/// @notice This facet receives cross chain messages from relayers
contract CCMPReceiverMessageFacet is ICCMPGatewayReceiver, Constants {
    using CCMPMessageUtils for CCMPMessage;

    /// @notice Function called by the relayer on the destination chain to execute the sent message on the exit chain.
    /// @param _message The message to be executed.
    /// @param _verificationData Adaptor specific abi-encoded data required to verify the message's validity on the exit chain. For example, commandId for Axelar.
    /// @param _allowPartialExecution Whether to allow partial execution of the message.
    /// @return status The status of the execution.
    function receiveMessage(
        CCMPMessage calldata _message,
        bytes calldata _verificationData,
        bool _allowPartialExecution
    ) external returns (bool) {
        LibDiamond._enforceIsContractNotPaused();

        LibDiamond.CCMPDiamondStorage storage ds = LibDiamond._diamondStorage();

        // Check Source
        if (_message.sourceGateway != ds.gateways[_message.sourceChainId]) {
            revert InvalidSource(
                _message.sourceChainId,
                _message.sourceGateway
            );
        }

        // Check Destination
        if (
            address(_message.destinationGateway) != address(this) ||
            _message.destinationChainId != block.chainid
        ) {
            revert WrongDestination(
                _message.destinationChainId,
                _message.destinationGateway
            );
        }

        // Check Replay
        if (ds.nonceUsed[_message.nonce]) {
            revert AlreadyExecuted(_message.nonce);
        }
        ds.nonceUsed[_message.nonce] = true;

        // Verify from underlying protocol
        ICCMPRouterAdaptor adaptor = ds.adaptors[_message.routerAdaptor];
        if (adaptor == ICCMPRouterAdaptor(address(0))) {
            revert UnsupportedAdapter(_message.routerAdaptor);
        }

        {
            (bool verified, string memory reason) = adaptor.verifyPayload(
                _message,
                _verificationData
            );
            if (!verified) {
                revert VerificationFailed(reason);
            }
        }

        _executeCCMPMessage(_message, _allowPartialExecution);

        _emitCCMPMessageExecuted(_message);

        return true;
    }

    function _emitCCMPMessageExecuted(CCMPMessage calldata _message) private {
        emit CCMPMessageExecuted(
            _message.hash(),
            _message.sender,
            _message.sourceGateway,
            _message.sourceAdaptor,
            _message.sourceChainId,
            _message.destinationGateway,
            _message.destinationChainId,
            _message.nonce,
            _message.routerAdaptor,
            _message.gasFeePaymentArgs,
            _message.payload
        );
    }

    /// @notice Handles Execution of the received message from CCMP Gateway on destination chain.
    /// @param _message The message received from CCMP Gateway.
    /// @param _allowPartialExecution Whether to allow partial execution of the message.
    function _executeCCMPMessage(
        CCMPMessage calldata _message,
        bool _allowPartialExecution
    ) internal {
        LibDiamond.CCMPDiamondStorage storage ds = LibDiamond._diamondStorage();

        // Execute CCMP Message Content
        uint256 length = _message.payload.length;

        for (uint256 i = 0; i < length; ) {
            CCMPMessagePayload memory _payload = _message.payload[i];

            (bool success, bytes memory returndata) = ds.ccmpExecutor.execute(
                _payload.to,
                // Append sender and source chain id to the calldata
                // This can be used in the target contract for verification
                abi.encodePacked(
                    _payload._calldata,
                    _message.sourceChainId,
                    _message.sender
                )
            );

            if (!(_allowPartialExecution || success)) {
                revert ExternalCallFailed(i, _payload.to, returndata);
            }

            emit CCMPPayloadExecuted(i, _payload.to, success, returndata);

            unchecked {
                ++i;
            }
        }
    }
}
