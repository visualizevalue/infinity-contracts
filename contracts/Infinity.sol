// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/InfiniteBags.sol";
import "./libraries/InfiniteGenerator.sol";
import "./libraries/InfiniteArt.sol";
import "./libraries/InfiniteMetadata.sol";

import "./standards/ERC1155.sol";

/// @title Infinity token contract.
/// @notice Imo notable.
/// @author Visualize Value
contract Infinity is ERC1155 {

    /// @notice The name of the collection.
    string public name = "Infinity";

    /// @notice The symbol of the collection.
    string public symbol = unicode"∞";

    /// @notice The price of an infinity token.
    uint public price = 0.008 ether;

    /// @dev Generative mints start from this token ID.
    uint private constant GENERATIVE = 8888;

    /// @dev VV creator account.
    address private constant VV = 0xc8f8e2F59Dd95fF67c3d39109ecA2e2A017D4c8a;

    /// @dev Instanciate the contract...
    constructor() ERC1155() {}

    /// @notice Deposit ether, receive random infinities
    receive() external payable {
        _generateViaDeposit(msg.sender, _randomId());
    }

    /// @notice Create an infinity check and deposit 0.008 ETH for each token.
    /// @param source The address of an existing owner of the token. 0x0 for new mints.
    /// @param recipient The address that should receive the token.
    /// @param tokenIdOrOffset The token ID to mint, or a random offset to prevent in-block duplicates.
    /// @param message Mint the token with an optional message.
    function generate(
        address source,
        address recipient,
        uint tokenIdOrOffset,
        string calldata message
    ) public payable {
        uint tokenId = _validateId(tokenIdOrOffset, source);

        _generateViaDeposit(recipient, tokenId);

        if (bytes(message).length > 0) {
            emit Message(msg.sender, recipient, tokenId, message);
        }
    }

    /// @notice Swap an inifinity token for a new one.
    /// @param id The token ID to burn.
    /// @param amount The token amount to burn / recreate.
    /// @param source The address of an existing owner of the new token. 0x0 for new generations.
    /// @param tokenIdOrOffset The token ID to mint, or a random offset to prevent in-block duplicates.
    function regenerate(uint id, uint amount, address source, uint tokenIdOrOffset) public {
        // Execute burn
        _burn(msg.sender, id, amount);

        // Mint a new token
        _mint(msg.sender, _validateId(tokenIdOrOffset, source), amount, "");
    }

    /// @notice Destroy the token to withdraw its desposited ETH.
    /// @param id The token ID to destroy.
    /// @param amount The amount to degenerate (withdraws 0.008 ETH per item).
    function degenerate(
        uint id,
        uint amount
    ) public {
        // Execute burn
        _burn(msg.sender, id, amount);

        // Withdraw funds
        _send(msg.sender, amount * price);
    }

    /// @notice Create multiple infinity check tokens and deposit 0.008 ETH in each.
    /// @param sources The address of an existing owner of all tokens. 0x0 for new mints.
    /// @param recipients The addresses that should receive the token.
    /// @param tokenIdsOrOffsets The tokenIDs to mint, or random offsets to prevent in-block duplicates.
    /// @param amounts The number of tokens to send to each recipient.
    function generateMany(
        address[] calldata sources,
        address[] calldata recipients,
        uint[] calldata tokenIdsOrOffsets,
        uint[] calldata amounts
    ) public payable {
        require(
            recipients.length == tokenIdsOrOffsets.length &&
            recipients.length == amounts.length &&
            recipients.length == sources.length,
            "Invalid input"
        );

        _checkDeposit(_totalAmount(amounts));

        for (uint i = 0; i < recipients.length; i++) {
            _mint(recipients[i], _validateId(tokenIdsOrOffsets[i], sources[i]), amounts[i], "");
        }
    }

    /// @notice Create multiple infinity check tokens and deposit 0.008 ETH in each.
    /// @param ids The existing token IDs that should be destroyed in the process.
    /// @param degenerateAmounts The number of tokens per id to burn.
    /// @param sources The addresses of existing owners of new tokens. 0x0 for new mints.
    /// @param tokenIdsOrOffsets The tokenIDs to mint, or random offsets to prevent in-block duplicates.
    /// @param amounts The number of tokens per id recreate.
    function regenerateMany(
        uint[] calldata ids,
        uint[] calldata degenerateAmounts,
        address[] calldata sources,
        uint[] calldata tokenIdsOrOffsets,
        uint[] calldata amounts
    ) public payable {
        require(
            ids.length == degenerateAmounts.length &&
            sources.length == tokenIdsOrOffsets.length &&
            sources.length == amounts.length &&
            _totalAmount(degenerateAmounts) == _totalAmount(amounts),
            "Invalid input"
        );

        for (uint i = 0; i < ids.length; i++) {
            _burn(msg.sender, ids[i], degenerateAmounts[i]);
        }

        for (uint i = 0; i < tokenIdsOrOffsets.length; i++) {
            _mint(msg.sender, _validateId(tokenIdsOrOffsets[i], sources[i]), amounts[i], "");
        }
    }

    /// @notice {degenerate} multiple tokens at once.
    /// @param ids The tokenIDs to destroy.
    /// @param amounts The amounts to degenerate (withdraws 0.008 ETH per item).
    function degenerateMany(
        uint[] memory ids,
        uint[] memory amounts
    ) public {
        require(ids.length == amounts.length, "Invalid input.");

        // Execute burn
        _burnBatch(msg.sender, ids, amounts);

        // Withdraw funds
        _send(msg.sender, _totalAmount(amounts) * price);
    }

    /// @notice Render SVG of the token.
    /// @param tokenId The token ID to render.
    function svg(uint tokenId) public pure returns (string memory) {
        return InfiniteArt.renderSVG(InfiniteGenerator.tokenData(tokenId));
    }

    /// @notice Render the encoded token metadata-URI.
    /// @param tokenId The token ID to get metadata for.
    function uri(uint tokenId) public pure override returns (string memory) {
        return InfiniteMetadata.tokenURI(InfiniteGenerator.tokenData(tokenId));
    }

    /// @notice Return token data for a given ID.
    /// @param tokenId The token ID to render.
    function data(uint tokenId) public pure returns (Token memory) {
        return InfiniteGenerator.tokenData(tokenId);
    }

    /// @notice Supply is (in)finite: (2^256 - 1)^2.
    function totalSupply() public pure returns (uint) { return type(uint).max; }
    function totalSupply(uint) public pure returns (uint) { return type(uint).max; }

    /// @dev Mint a token n times, based on the amount of ETH sent.
    function _generateViaDeposit(address recipient, uint tokenId) internal {
        uint amount  = msg.value / price;
        uint surplus = msg.value % price;

        _mint(recipient, tokenId, amount, "");
        _send(recipient, surplus);
    }

    /// @dev Validate IDs to minted tokens or randomize for initial mints. Exception for VV mints.
    function _validateId(uint id, address existing) internal view returns (uint) {
        bool minted = existing != address(0) && balanceOf(existing, id) > 0;

        // If it's an already minted piece, or we are VV, continue.
        if (minted || msg.sender == VV) return id;

        // Use ID as offset to prevent in-block duplication.
        return _randomId(id);
    }

    /// @dev Make a random generative token ID.
    function _randomId(uint offset) internal view returns (uint id) {
        id = block.prevrandao + offset; // Use ID as offset to prevent in-block duplication.

        // Force into {GENERATIVE} range
        if (id < GENERATIVE) {
            id += GENERATIVE;
        }

        return id;
    }

    /// @dev Make a random generative token ID.
    function _randomId() internal view returns (uint) {
        return _randomId(0);
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
