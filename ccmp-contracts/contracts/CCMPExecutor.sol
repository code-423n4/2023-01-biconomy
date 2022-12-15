// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICCMPExecutor.sol";

error InvalidSender();

/// @title CCMPExecutor
/// @author ankur@biconomy.io
/// @notice Handles message execution
contract CCMPExecutor is Ownable, ICCMPExecutor {
    address public ccmpGateway;

    event GatewayUpgraded(address indexed newGateway);

    modifier onlyGateway() {
        if (msg.sender != ccmpGateway) {
            revert InvalidSender();
        }
        _;
    }

    constructor(address _ccmpGateway, address _owner) Ownable() {
        ccmpGateway = _ccmpGateway;
        _transferOwnership(_owner);
    }

    /// @notice Handles Execution of the received message from CCMP Gateway on destination chain.
    function execute(
        address _to,
        bytes calldata _calldata
    ) external onlyGateway returns (bool success, bytes memory returndata) {
        (success, returndata) = _to.call{gas: gasleft()}(_calldata);
    }

    function updateCCMPGateway(address _newCCMPGateway) external onlyOwner {
        ccmpGateway = _newCCMPGateway;
        emit GatewayUpgraded(_newCCMPGateway);
    }
}
