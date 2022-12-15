// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../../interfaces/ICCMPRouterAdaptor.sol";
import "../../interfaces/IAxelarGateway.sol";
import "../../interfaces/ICCMPGateway.sol";
import "../../structures/CrossChainMessage.sol";
import "../../security/Pausable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title CCMPAdaptorBase
/// @author ankur@biconomy.io
/// @notice Base contract for all CCMP Adaptors
abstract contract CCMPAdaptorBase is
    Ownable,
    ReentrancyGuard,
    PausableBase,
    ICCMPRouterAdaptor
{
    ICCMPGateway public ccmpGateway;

    event CCMPGatewayUpdated(ICCMPGateway indexed newCCMPGateway);

    modifier onlyCCMPGateway() {
        if (_msgSender() != address(ccmpGateway)) {
            revert CallerIsNotCCMPGateway();
        }
        _;
    }

    constructor(
        address _ccmpGateway,
        address _owner,
        address _pauser
    ) PausableBase(_pauser) {
        ccmpGateway = ICCMPGateway(_ccmpGateway);
        _transferOwnership(_owner);
    }

    function setCCMPGateway(
        ICCMPGateway _ccmpGateway
    ) external whenNotPaused onlyOwner {
        ccmpGateway = _ccmpGateway;
        emit CCMPGatewayUpdated(ccmpGateway);
    }
}
