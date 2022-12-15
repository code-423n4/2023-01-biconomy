// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20WithDecimals is IERC20Upgradeable {
    function decimals() external view returns (uint8);
}
