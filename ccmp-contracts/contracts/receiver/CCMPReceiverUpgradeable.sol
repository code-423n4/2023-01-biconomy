// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./CCMPReceiverBase.sol";

/// @title CCMPRecevierUpgradeable
/// @author ankur@biconomy.io
/// @notice This contract is inherited by contracts that need to verify 
///         the source of the message (source chain id, address) while 
///         receiving messages on the destination chain.
abstract contract CCMPReceiverUpgradeable is CCMPReceiverBase, Initializable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function __CCMPReceiver_init(
        address __ccmpExecutor,
        ILiquidityPool _liquidityPool
    ) internal onlyInitializing {
        _setCCMPExecutor(__ccmpExecutor);
        _setLiquidityPool(_liquidityPool);
    }
}
