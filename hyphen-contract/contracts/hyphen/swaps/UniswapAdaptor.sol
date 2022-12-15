// SPDX-License-Identifier: MIT

/**
 *Submitted for verification at Etherscan.io on 2022-05-18
*/

pragma solidity 0.8.0;
import "../interfaces/ISwapAdaptor.sol";
import "../interfaces/ISwapRouter.sol";
import "../lib/TransferHelper.sol";
import "../interfaces/IWETH.sol";

contract UniswapAdaptor is ISwapAdaptor {

    uint24 public constant POOL_FEE = 3000;
    address private constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    address public immutable NATIVE_WRAP_ADDRESS;
    ISwapRouter public immutable swapRouter;

    constructor(ISwapRouter _swapRouter, address nativeWrapAddress) {
        NATIVE_WRAP_ADDRESS = nativeWrapAddress;
        swapRouter = _swapRouter; // "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
    }

    /// @notice swapForFixedInput swaps a fixed amount of DAI for a maximum possible amount of WETH9
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DAI for this function to succeed.
    /// @param inputTokenAddress Erc20 token address.
    /// @param amountInMaximum The exact amount of Erc20 that will be swapped for desired token.
    /// @param receiver address where all tokens will be sent.
    /// @return amountOut The amount of Swapped token received.
    function swap(
        address inputTokenAddress,
        uint256 amountInMaximum,
        address receiver,
        SwapRequest[] memory swapRequests
    ) override external returns (uint256 amountOut) {

        require(inputTokenAddress != NATIVE, "wrong function");
        uint256 swapArrayLength = swapRequests.length;

        require(swapArrayLength <= 2, "too many swap requests");
        require(swapArrayLength == 1 || swapRequests[1].operation == SwapOperation.ExactInput, "Invalid swap operation");

        TransferHelper.safeTransferFrom(inputTokenAddress, msg.sender, address(this), amountInMaximum);
        TransferHelper.safeApprove(inputTokenAddress, address(swapRouter), amountInMaximum);
        
        uint256 amountIn;
        if(swapArrayLength == 1) {
            if (swapRequests[0].operation == SwapOperation.ExactOutput ){
                amountIn = _fixedOutputSwap (
                    amountInMaximum,
                    receiver,
                    swapRequests[0]
                );
                if(amountIn < amountInMaximum) {
                    TransferHelper.safeApprove(inputTokenAddress, address(swapRouter), 0);
                    TransferHelper.safeTransfer(inputTokenAddress, receiver, amountInMaximum - amountIn);
                }
            } else {
                _fixedInputSwap (
                    amountInMaximum,
                    receiver,
                    swapRequests[0]
                );
            }
        } else {
            amountIn = _fixedOutputSwap (
                amountInMaximum,
                receiver,
                swapRequests[0]
            );
            if(amountIn < amountInMaximum){
                amountOut = _fixedInputSwap (
                    amountInMaximum - amountIn,
                    receiver,
                    swapRequests[1]
                );
            } 
        }
    }

    /// @notice swapNative swaps a fixed amount of WETH for a maximum possible amount of Swap tokens
    /// @dev The calling address must send Native token to this contract to spend at least `amountIn` worth of its WETH for this function to succeed.
    /// @param amountInMaximum The exact amount of WETH that will be swapped for Desired token.
    /// @param receiver Address to with tokens will be sent after swap.
    /// @return amountOut The amount of Desired token received.
    function swapNative(
        uint256 amountInMaximum,
        address receiver,
        SwapRequest[] memory swapRequests
    ) override external returns (uint256 amountOut) {
        require(swapRequests.length == 1 , "only 1 swap request allowed");
        amountOut = _fixedInputSwap(amountInMaximum, receiver, swapRequests[0]);
    }

    // Call uniswap router for a fixed output swap
    function _fixedOutputSwap(
        uint256 amountInMaximum,
        address receiver,
        SwapRequest memory swapRequests
    ) internal returns (uint256 amountIn) {
        ISwapRouter.ExactOutputParams memory params;
        if(swapRequests.tokenAddress == NATIVE_WRAP_ADDRESS){
            params = ISwapRouter.ExactOutputParams({
                path: swapRequests.path,
                recipient: address(this),
                amountOut: swapRequests.amount,
                amountInMaximum: amountInMaximum
            });

            amountIn = swapRouter.exactOutput(params);
            unwrap(swapRequests.amount, receiver);

        } else {
            params = ISwapRouter.ExactOutputParams({
                path: swapRequests.path,
                recipient: receiver,
                amountOut: swapRequests.amount,
                amountInMaximum: amountInMaximum
            });

            amountIn = swapRouter.exactOutput(params);
        }
    }

     // Call uniswap router for a fixed Input amount
     function _fixedInputSwap(
        uint256 amount,
        address receiver,
        SwapRequest memory swapRequests
    ) internal returns (uint256 amountOut) {
         ISwapRouter.ExactInputParams memory params ;
         if(swapRequests.tokenAddress == NATIVE_WRAP_ADDRESS){
            params = ISwapRouter.ExactInputParams({
                path: swapRequests.path,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0
            });
            amountOut = swapRouter.exactInput(params);
            unwrap(amountOut, receiver);

        } else {
            params = ISwapRouter.ExactInputParams({
                path: swapRequests.path,
                recipient: receiver,
                amountIn: amount,
                amountOutMinimum: 0
            });
            amountOut = swapRouter.exactInput(params);
        }

    }

    function unwrap(uint256 amountMinimum, address recipient) internal {
        uint256 balanceWETH9 = IERC20(NATIVE_WRAP_ADDRESS).balanceOf(address(this));
        require(balanceWETH9 >= amountMinimum, 'Insufficient WETH9');

        if (balanceWETH9 > 0) {
            IWETH(NATIVE_WRAP_ADDRESS).withdraw(balanceWETH9);
            TransferHelper.safeTransferETH(recipient, balanceWETH9);
        }
    }

    receive() external payable {
        require(msg.sender == NATIVE_WRAP_ADDRESS, 'Not WETH9');
    }
}