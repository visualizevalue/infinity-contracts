// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReceiveBlock {
    error FailedProxySend();

    /// @notice Block incoming ETH.
    receive() external payable {
        revert();
    }

    function send(address recipient) external payable {
        (bool success,) = recipient.call{ value: msg.value }("");

        if (! success) revert FailedProxySend();
    }
}
