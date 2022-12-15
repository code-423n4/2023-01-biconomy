pragma solidity ^0.8.0;
import "../interfaces/ISwapAdaptor.sol";
import "../interfaces/ISwapRouter.sol";
import "../lib/TransferHelper.sol";

contract MockSwapRouterFail {
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

    function exactOutputSingle(ExactOutputParams calldata params) external payable returns (uint256 amountIn){
        revert();
    }

    function exactInputSingle(ExactInputParams calldata params) external payable returns (uint256 amountOut){
        revert();
    }
}
