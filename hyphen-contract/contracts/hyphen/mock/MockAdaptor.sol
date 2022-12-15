pragma solidity ^0.8.0;
import "../interfaces/ISwapAdaptor.sol";
import "../interfaces/ISwapRouter.sol";
import "../lib/TransferHelper.sol";

contract MockAdaptor is ISwapAdaptor {
    uint24 public constant POOL_FEE = 3000;
    address private constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    address public immutable NATIVE_WRAP_ADDRESS;
    ISwapRouter public immutable swapRouter;

    constructor(ISwapRouter _swapRouter, address nativeWrapAddress) {
        NATIVE_WRAP_ADDRESS = nativeWrapAddress;
        swapRouter = _swapRouter; // "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
    }

    function swap(
        address inputTokenAddress,
        uint256 amountInMaximum,
        address receiver,
        SwapRequest[] memory swapRequests
    ) external override returns (uint256 amountOut) {
        require(inputTokenAddress != NATIVE, "wrong function");
        uint256 swapArrayLength = swapRequests.length;
        require(swapArrayLength <= 2, "too many swap requests");
        require(swapArrayLength == 1 || swapRequests[1].operation == SwapOperation.ExactInput, "Invalid swap operation");

        TransferHelper.safeTransferFrom(inputTokenAddress, msg.sender, address(this), amountInMaximum);
        TransferHelper.safeApprove(inputTokenAddress, address(swapRouter), amountInMaximum);

        uint256 amountIn;
        if(swapArrayLength == 1) {
            if (swapRequests[0].operation == SwapOperation.ExactOutput ){
                amountIn = amountInMaximum - amountInMaximum/2; // half of the amount used up in swap

                if(amountIn < amountInMaximum) {
                    TransferHelper.safeApprove(inputTokenAddress, address(swapRouter), 0);
                    TransferHelper.safeTransfer(inputTokenAddress, receiver, amountInMaximum - amountIn);
                }
            } else {
                // do nothing, all amountIn is used up in swap
                amountOut = amountIn;
            }
        } else {
             amountIn = amountInMaximum - amountInMaximum/2; // half of the amount used up in swap
            if(amountIn < amountInMaximum){
                amountOut = amountIn;
            } 
        }
    }

    function swapNative(
        uint256 amountInMaximum,
        address receiver,
        SwapRequest[] memory swapRequests
    ) override external returns (uint256 amountOut) {
    }

    function unwrap(uint256 amountMinimum, address recipient) internal {
       
    }

    receive() external payable {
        require(msg.sender == NATIVE_WRAP_ADDRESS, 'Not WETH9');
    }
}