// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../structures/CrossChainMessage.sol";

contract CCMPHelper {
    using CCMPMessageUtils for CCMPMessage;

    function hash(CCMPMessage calldata _message)
        external
        pure
        returns (bytes32)
    {
        return _message.hash();
    }

    function compareHash(CCMPMessage calldata _message, bytes32 _hash)
        external
        pure
        returns (bool)
    {
        return _message.hash() == _hash;
    }
}
