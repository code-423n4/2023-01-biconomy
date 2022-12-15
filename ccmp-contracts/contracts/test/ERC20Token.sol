// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract ERC20Token is ERC20Upgradeable {
    uint8 private __decimals;

    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __decimals = _decimals;
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    function decimals() public view override returns (uint8) {
        return __decimals;
    }
}
