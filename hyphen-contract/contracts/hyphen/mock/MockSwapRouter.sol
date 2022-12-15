pragma solidity ^0.8.0;
import "../interfaces/ISwapAdaptor.sol";
import "../interfaces/ISwapRouter.sol";
import "../lib/TransferHelper.sol";

contract MockSwapRouter {
    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn){
        return params.amountOut;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut){
        return params.amountIn;
    }
}
