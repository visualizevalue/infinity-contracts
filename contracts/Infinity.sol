// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./standards/ERC1155.sol";

/// @title Infinity token contract v1
/// @author Visualize Value
contract Infinity is ERC1155 {
    /// @notice The name of the collection
    string public name = "Infinity";

    /// @notice The symbol of the collection
    string public symbol = unicode"∞";

    /// @notice The price of an infinity
    uint public price = 0.008 ether;

    /// @dev Generative mints start from this token ID
    uint private constant GENERATIVE = 88888888;

    /// @dev VV creator account
    address private constant VV = 0xc8f8e2F59Dd95fF67c3d39109ecA2e2A017D4c8a;

    constructor() ERC1155() {}

    /// @notice Deposit ether, receive random infinities
    receive() external payable {
        uint amount  = msg.value / price;
        uint surplus = msg.value % price;

        _mint(msg.sender, _randomId(), amount, "");
        _send(msg.sender, surplus);
    }

    /// @notice Create an infinity check and deposit 0.008 ETH for each token.
    function generate(
        address source,
        address recipient,
        uint tokenIdOrOffset,
        uint amount,
        string calldata message
    ) public payable {
        _checkDeposit(amount);

        uint tokenId = _validateId(tokenIdOrOffset, source);

        _mint(recipient, tokenId, amount, "");

        if (bytes(message).length > 0) {
            emit Message(msg.sender, recipient, tokenId, message);
        }
    }

    /// @notice Create multiple infinity check tokens and deposit 0.008 ETH in each.
    function generateMany(
        address source,
        address[] calldata recipients,
        uint[] calldata tokenIdsOrOffsets,
        uint[] calldata amounts
    ) public payable {
        require(
            recipients.length == tokenIdsOrOffsets.length &&
            recipients.length == amounts.length,
            "Invalid input"
        );

        _checkDeposit(_totalAmount(amounts));

        for (uint i = 0; i < recipients.length; i++) {
            _mint(recipients[i], _validateId(tokenIdsOrOffsets[i], source), amounts[i], "");
        }
    }

    /// @notice Destroy the token to withdraw its desposited ETH.
    function degenerate(
        uint id,
        uint amount
    ) public virtual {
        // Check whether we own at least {amount} of token {id}
        _checkOwnership(id, amount);

        // Execute burn
        _burn(msg.sender, id, amount);

        // Withdraw funds
        _send(msg.sender, amount * price);
    }

    /// @notice {degenerate} multiple tokens at once.
    function degenerateMany(
        uint[] memory ids,
        uint[] memory amounts
    ) public virtual {
        require(ids.length == amounts.length, "Invalid input.");

        // Check ownership for each token
        for (uint i = 0; i < ids.length; i++) {
            _checkOwnership(ids[i], amounts[i]);
        }

        // Execute burn
        _burnBatch(msg.sender, ids, amounts);

        // Withdraw funds
        _send(msg.sender, _totalAmount(amounts) * price);
    }

    /// @notice Supply is (in)finite: (2^256 - 1)^2
    function totalSupply(uint) public pure returns (uint) {
        return type(uint).max;
    }

    /// @dev Make sure only VV can create pieces below {GENERATIVE}, and IDs are randomized for initial mints
    function _validateId(uint id, address existing) internal view returns (uint) {
        bool minted = existing != address(0) && balanceOf(existing, id) > 0;

        // If it's an already minted piece, or we are VV, continue
        if (minted || msg.sender == VV) return id;

        return _randomId(id);
    }

    /// @dev Make a random generative token ID
    function _randomId(uint offset) internal view returns (uint id) {
        id = block.prevrandao + offset;

        // Force into {GENERATIVE} range
        if (id < GENERATIVE) {
            id += GENERATIVE;
        }

        return id;
    }

    /// @dev Make a random generative token ID
    function _randomId() internal view returns (uint) {
        return _randomId(0);
    }

    /// @dev Check whether the {msg.sender} owns at least {amount} of token {id}
    function _checkOwnership(uint id, uint amount) internal view {
        require(balanceOf(msg.sender, id) >= amount, "Can't burn more infinities than owned.");
    }

    /// @dev Check whether the deposited Ether is a correct {price} multipe of the token {amount}
    function _checkDeposit(uint amount) internal {
        require(msg.value == amount * price, "Incorrect ether deposit.");
    }

    /// @dev Get the sum of all given amounts
    function _totalAmount(uint[] memory amounts) internal pure returns (uint amount) {
        for (uint i = 0; i < amounts.length; i++) {
            amount += amounts[i];
        }
    }

    /// @dev Send ETH to an address
    function _send(address to, uint value) internal {
        (bool success, ) = payable(to).call{value: value}("");
        require(success, "Unable to send value, recipient may have reverted");
    }
}
