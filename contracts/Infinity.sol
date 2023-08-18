// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/InfiniteArt.sol";
import "./libraries/InfiniteBags.sol";
import "./libraries/InfiniteGenerator.sol";
import "./libraries/InfiniteMetadata.sol";

import "./standards/ERC1155.sol";

// Contributors:
//
// - 0xCygaar
// - akshatmittal
// - akuti.eth
// - backseats.eth
// - jalil.eth
// - MouseDev.eth
// - tomhirst.eth
//
/// @title Infinity token contract.
contract Infinity is ERC1155 {

    /// @notice The name of the collection.
    string public constant name = "Infinity";

    /// @notice The symbol of the collection.
    string public constant symbol = unicode"∞";

    /// @notice The price of an infinity token.
    uint public constant PRICE = 0.008 ether;

    /// @dev VV creator account.
    address private constant VV = 0xc8f8e2F59Dd95fF67c3d39109ecA2e2A017D4c8a;

    /// @dev Emitted when minting a token with a message.
    event Message(address indexed from, address indexed to, uint256 indexed id, string message);

    /// @dev Raised when the user isn't allowed to mint the given token.
    error InvalidToken();

    /// @dev Raised when the user provides inconsistent arguments.
    error InvalidInput();

    /// @dev Raised when the msg.value does not meet the required amount for the number of tokens minted.
    error InvalidDesposit();

    /// @dev Raised when refunding the user failed.
    error FailedSend();

    /// @dev Instanciate the contract...
    constructor(address[] memory genesisRecipients) ERC1155() payable {
        _checkDeposit(genesisRecipients.length);

        for (uint i; i < genesisRecipients.length;) {
            _mint(genesisRecipients[i], 0, 1, "");

            unchecked { ++i; }
        }
    }

    /// @notice Deposit ether, receive random infinities
    receive() external payable {
        _generateViaDeposit(msg.sender, _randomId());
    }

    /// @notice Create a new infinity check and deposit 0.008 ETH for each token.
    /// @param recipient The address that should receive the token.
    /// @param message Mint the token with an optional message.
    function generate(
        address recipient,
        string calldata message
    ) public payable {
        uint id = _randomId();

        _generateViaDeposit(recipient, id);

        _message(recipient, id, message);
    }

    /// @notice Copy an existing infinity check owned by someone and deposit 0.008 ETH for each token.
    /// @param source The address of an existing owner of the token.
    /// @param recipient The address that should receive the token.
    /// @param id The token to mint.
    /// @param message Mint the token with an optional message.
    function generateExisting(
        address source,
        address recipient,
        uint id,
        string calldata message
    ) public payable {
        _validateId(id, source);

        _generateViaDeposit(recipient, id);

        _message(recipient, id, message);
    }

    /// @notice Swap an inifinity token for a new one.
    /// @param id The token to burn.
    /// @param amount The token amount to burn / recreate.
    function regenerate(uint id, uint amount) public {
        // Execute burn
        _burn(msg.sender, id, amount);

        // Mint a new token
        _mint(msg.sender, _randomId(), amount, "");
    }

    /// @notice Destroy the token to withdraw its desposited ETH.
    /// @param id The token to destroy.
    /// @param amount The amount to degenerate (withdraws 0.008 ETH per item).
    function degenerate(
        uint id,
        uint amount
    ) public {
        // Execute burn
        _burn(msg.sender, id, amount);

        // Withdraw funds
        _send(msg.sender, amount * PRICE);
    }

    /// @notice Create multiple infinity check tokens and deposit 0.008 ETH in each.
    /// @param recipients The addresses that should receive the token.
    /// @param amounts The number of tokens to send to each recipient.
    function generateMany(
        address[] calldata recipients,
        uint[] calldata amounts
    ) public payable {
        _validateCounts(recipients.length, amounts.length);
        _checkDeposit(_totalAmount(amounts));

        for (uint i; i < recipients.length;) {
            _mint(recipients[i], _randomId(), amounts[i], "");

            unchecked { ++i; }
        }
    }

    /// @notice Copy multiple infinity check tokens and deposit 0.008 ETH in each.
    /// @param sources The addresses of existing owners of each token.
    /// @param recipients The addresses that should receive the token.
    /// @param ids The tokens to mint.
    /// @param amounts The number of tokens to send for each token.
    function generateManyExisting(
        address[] calldata sources,
        address[] calldata recipients,
        uint[] calldata ids,
        uint[] calldata amounts
    ) public payable {
        _validateCounts(sources.length, recipients.length, ids.length, amounts.length);
        _checkDeposit(_totalAmount(amounts));

        for (uint i; i < sources.length;) {
            _validateId(ids[i], sources[i]);

            _mint(recipients[i], ids[i], amounts[i], "");

            unchecked { ++i; }
        }
    }

    /// @notice Create multiple new infinity check tokens and deposit 0.008 ETH in each.
    /// @param ids The existing tokens that should be destroyed in the process.
    /// @param amounts The number of tokens to recreate per id.
    function regenerateMany(
        uint[] calldata ids,
        uint[] calldata amounts
    ) public payable {
        for (uint i; i < ids.length;) {
            _burn(msg.sender, ids[i], amounts[i]);
            _mint(msg.sender, _randomId(), amounts[i], "");

            unchecked { ++i; }
        }
    }

    /// @notice Degenerate multiple tokens at once.
    /// @param ids The tokens to destroy.
    /// @param amounts The amounts to degenerate (withdraws 0.008 ETH per item).
    function degenerateMany(
        uint[] calldata ids,
        uint[] calldata amounts
    ) public {
        // Execute burn
        _burnBatch(msg.sender, ids, amounts);

        // Withdraw funds
        _send(msg.sender, _totalAmount(amounts) * PRICE);
    }

    /// @notice Render SVG of the token.
    /// @param id The token to render.
    function svg(uint id) public pure returns (string memory) {
        return InfiniteArt.renderSVG(InfiniteGenerator.tokenData(id));
    }

    /// @notice Render the encoded token metadata-URI.
    /// @param id The token to get metadata for.
    function uri(uint id) public pure override returns (string memory) {
        return InfiniteMetadata.tokenURI(InfiniteGenerator.tokenData(id));
    }

    /// @notice Supply is (in)finite: (2^256 - 1)^2.
    function totalSupply() public pure returns (uint) { return type(uint).max; }
    function totalSupply(uint) public pure returns (uint) { return type(uint).max; }

    /// @dev Mint a token n times, based on the amount of ETH sent.
    function _generateViaDeposit(address recipient, uint id) internal {
        uint amount  = msg.value / PRICE;
        uint surplus = msg.value % PRICE;

        if (amount == 0) revert InvalidDesposit();

        _mint(recipient, id, amount, "");
        _send(recipient, surplus);
    }

    /// @dev Make sure the token exists or VV is the minter.
    function _validateId(uint id, address source) internal view {
        bool minted = balanceOf(source, id) > 0;

        // Continue if the token is already minted, or we are VV.
        if (minted || msg.sender == VV) return;

        revert InvalidToken();
    }

    /// @dev Validate that both counts are equal.
    function _validateCounts(uint a, uint b) internal pure {
        if (a == b) return;

        revert InvalidInput();
    }

    /// @dev Validate that all four counts are equal.
    function _validateCounts(uint a, uint b, uint c, uint d) internal pure {
        if (a == b && a == c && a == d) return;

        revert InvalidInput();
    }

    /// @dev Make a random generative token.
    function _randomId() internal view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.prevrandao, msg.sender, gasleft())));
    }

    /// @dev Check whether the deposited Ether is a correct {PRICE} multipe of the token {amount}
    function _checkDeposit(uint amount) internal {
        if (msg.value != amount * PRICE) revert InvalidDesposit();
    }

    /// @dev Get the sum of all given amounts
    function _totalAmount(uint[] calldata amounts) internal pure returns (uint amount) {
        for (uint i; i < amounts.length;) {
            amount += amounts[i];

            unchecked { ++i; }
        }
    }

    /// @dev Send ETH to an address
    function _send(address to, uint value) internal {
        (bool success,) = to.call{ value: value }("");

        if (success) return;

        revert FailedSend();
    }

    /// @dev Emit a mint message, if provided
    function _message(address recipient, uint id, string calldata message) internal {
        if (bytes(message).length > 0) {
            emit Message(msg.sender, recipient, id, message);
        }
    }
}
