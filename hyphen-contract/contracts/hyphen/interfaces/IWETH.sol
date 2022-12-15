pragma solidity 0.8.0;

import "./IERC20.sol";

/// @title Interface for WETH9
interface IWETH is IERC20 {

     function withdraw(uint256 _amount) external;
}