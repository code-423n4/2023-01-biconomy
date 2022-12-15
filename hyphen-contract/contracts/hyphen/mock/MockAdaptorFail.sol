pragma solidity ^0.8.0;
import "../interfaces/ISwapAdaptor.sol";
import "../interfaces/ISwapRouter.sol";
import "../lib/TransferHelper.sol";

contract MockAdaptorFail is ISwapAdaptor {
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
    ) external override returns (uint256 amountIn) {
        revert("Insufitient funds");
    }

    function swapNative(
        uint256 amountInMaximum,
        address receiver,
        SwapRequest[] memory swapRequests
    ) external override returns (uint256 amountIn) {
        revert("Insufitient funds");
    }

    function unwrap(uint256 amountMinimum, address recipient) internal {
       
    }

    receive() external payable {
        require(msg.sender == NATIVE_WRAP_ADDRESS, 'Not WETH9');
    }
}
