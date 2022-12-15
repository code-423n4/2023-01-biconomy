// contracts/Messages.sol
// SPDX-License-Identifier: Apache 2

pragma solidity 0.8.16;

import "../structures/Wormhole.sol";

contract MockWormhole is Structs {
    event MessagePublished(uint32, bytes, uint8);

    bool _validationState = false;
    bytes _payload = abi.encode(0);

    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence) {
        emit MessagePublished(nonce, payload, consistencyLevel);
        return 0;
    }

    function setValidationState(bool vs) public {
        _validationState = vs;
    }

    function setPayload(bytes calldata p) public {
        _payload = p;
    }

    function parseAndVerifyVM(bytes calldata)
        external
        view
        returns (
            Structs.VM memory vm,
            bool valid,
            string memory reason
        )
    {
        vm.payload = _payload;
        return (vm, _validationState, "");
    }
}
