// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../hyphen/interfaces/ILPToken.sol";
import "../hyphen/interfaces/ILiquidityProviders.sol";
import "../hyphen/interfaces/IHyphenLiquidityFarmingV2.sol";

contract BatchHelper {
    function execute(
        IERC20 token,
        ILPToken lpToken,
        ILiquidityProviders liquidityProviders,
        IHyphenLiquidityFarmingV2 farming,
        address receiver
    ) external {
        uint256 balance = token.balanceOf(address(this));
        token.approve(address(liquidityProviders), balance);
        liquidityProviders.addTokenLiquidity(address(token), balance);
        uint256[] memory tokensOwned = lpToken.getAllNftIdsByUser(address(this));
        lpToken.approve(address(farming), tokensOwned[0]);
        farming.deposit(tokensOwned[0], receiver);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
