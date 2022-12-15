// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../../interfaces/ICCMPGateway.sol";
import "../../interfaces/ICCMPRouterAdaptor.sol";
import "../../interfaces/ICCMPExecutor.sol";
import "../../structures/CrossChainMessage.sol";
import "../../structures/Constants.sol";
import "../../libraries/LibDiamond.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CCMPSendMessageFacet
/// @author ankur@biconomy.io
/// @notice This facet is used to send cross chain messages
contract CCMPSendMessageFacet is ICCMPGatewaySender, Constants {
    using CCMPMessageUtils for CCMPMessage;
    using SafeERC20 for IERC20;

    /// @param _destinationChainId The chain id of the destination chain.
    /// @param _adaptorName The name of the router adaptor to use. Currently "axelar", "wormhole" and "abacus" are supported.
    /// @param _gasFeePaymentArgs Contains details for the fee quoted by the relayer.
    /// @param _routerArgs Contains abi encoded router specific arguments. For ex, CONSISTENCY_LEVEL when sending message via wormhole.
    /// @return sent The hash of the message sent.
    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable returns (bool) {
        LibDiamond._enforceIsContractNotPaused();

        LibDiamond.CCMPDiamondStorage storage ds = LibDiamond._diamondStorage();

        // Check Adaptor
        ICCMPRouterAdaptor adaptor = ds.adaptors[_adaptorName];
        if (adaptor == ICCMPRouterAdaptor(address(0))) {
            revert UnsupportedAdapter(_adaptorName);
        }

        // Check Chain ID
        if (_destinationChainId == block.chainid) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }
        ICCMPGateway destinationGateway = ds.gateways[_destinationChainId];
        if (destinationGateway == ICCMPGateway(address(0))) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }

        // Check Payload
        if (_payloads.length == 0) {
            revert InvalidPayload("No payload");
        }

        CCMPMessage memory message = CCMPMessage({
            sender: msg.sender,
            sourceGateway: ICCMPGateway(address(this)),
            sourceAdaptor: adaptor,
            sourceChainId: block.chainid,
            destinationGateway: destinationGateway,
            destinationChainId: _destinationChainId,
            // Global nonce, chainid is included to prevent coliision with messages from different chain but same index
            nonce: (block.chainid << 128) + ds.nextNonce++,
            routerAdaptor: _adaptorName,
            gasFeePaymentArgs: _gasFeePaymentArgs,
            payload: _payloads
        });

        bytes32 messageHash = message.hash();

        addGasFee(message.gasFeePaymentArgs, messageHash, message.sender);

        adaptor.routePayload(message, _routerArgs);

        emit CCMPMessageRouted(
            messageHash,
            message.sender,
            message.sourceGateway,
            message.sourceAdaptor,
            message.sourceChainId,
            message.destinationGateway,
            message.destinationChainId,
            message.nonce,
            message.routerAdaptor,
            message.gasFeePaymentArgs,
            message.payload
        );

        return true;
    }

    function getGasFeePaymentDetails(
        bytes32 _messageHash,
        address[] calldata _tokens
    ) external view returns (uint256[] memory balances) {
        LibDiamond.CCMPDiamondStorage storage ds = LibDiamond._diamondStorage();
        balances = new uint256[](_tokens.length);
        unchecked {
            for (uint256 i = 0; i < _tokens.length; ++i) {
                balances[i] = ds.gasFeePaidByToken[_messageHash][_tokens[i]];
            }
        }
    }

    /// @notice Handles fee payment
    function addGasFee(
        GasFeePaymentArgs memory _args,
        bytes32 _messageHash,
        address _sender
    ) public payable {
        uint256 feeAmount = _args.feeAmount;
        address relayer = _args.relayer;
        address tokenAddress = _args.feeTokenAddress;

        LibDiamond.CCMPDiamondStorage storage ds = LibDiamond._diamondStorage();

        if (feeAmount > 0) {
            ds.gasFeePaidByToken[_messageHash][tokenAddress] += feeAmount;

            if (tokenAddress == NATIVE_ADDRESS) {
                if (msg.value != feeAmount) {
                    revert NativeAmountMismatch();
                }
                (bool success, bytes memory returndata) = relayer.call{
                    value: msg.value
                }("");
                if (!success) {
                    revert NativeTransferFailed(relayer, returndata);
                }
            } else {
                if (msg.value != 0) {
                    revert NativeAmountMismatch();
                }
                IERC20(tokenAddress).safeTransferFrom(
                    _sender,
                    relayer,
                    feeAmount
                );
            }

            emit FeePaid(tokenAddress, feeAmount, relayer);
        }
    }
}
