// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Base64.sol";

import "./InfiniteArt.sol";
import "./Utilities.sol";

/**
@title  InfiniteMetadata
@author VisualizeValue
@notice Renders ERC721 compatible metadata for Checks.
*/
library InfiniteMetadata {

    /// @dev Render the JSON Metadata for a given Infinity token.
    /// @param data The render data for our token
    function tokenURI(
        RenderData memory data
    ) public pure returns (string memory) {
        bytes memory svg = InfiniteArt.generateSVG(data);

        bytes memory metadata = abi.encodePacked(
            '{',
                '"name": "Infinity",',
                unicode'"description": "∞",',
                '"image": ',
                    '"data:image/svg+xml;base64,',
                    Base64.encode(svg),
                    '",',
                '"attributes": [', attributes(data), ']',
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(metadata)
            )
        );
    }

    /// @dev Render the JSON atributes for a given Infinity token.
    /// @param data The check to render.
    function attributes(RenderData memory data) public pure returns (bytes memory) {
        return abi.encodePacked(
            trait('Light', light(data.light), ','),
            trait('Grid', grid(data), '')
            // trait('Color Band', colorBand(data.colorBand), ','),
        );
    }

    function light(bool on) public pure returns (string memory) {
        return on ? 'On' : 'Off';
    }

    function grid(RenderData memory data) public pure returns (string memory) {
        string memory g = Utilities.uint2str(data.grid);

        return string(abi.encodePacked(g, 'x', g));
    }

    /// @dev Get the names for different gradients. Compare ChecksArt.GRADIENTS.
    /// @param gradientIndex The index of the gradient.
    function gradients(uint8 gradientIndex) public pure returns (string memory) {
        return [
            'None', 'Linear', 'Double Linear', 'Reflected', 'Double Angled', 'Angled', 'Linear Z'
        ][gradientIndex];
    }

    /// @dev Get the percentage values for different color bands. Compare ChecksArt.COLOR_BANDS.
    /// @param bandIndex The index of the color band.
    function colorBand(uint8 bandIndex) public pure returns (string memory) {
        return [
            'Eighty', 'Sixty', 'Forty', 'Twenty', 'Ten', 'Five', 'One'
        ][bandIndex];
    }

    /// @dev Generate the SVG snipped for a single attribute.
    /// @param traitType The `trait_type` for this trait.
    /// @param traitValue The `value` for this trait.
    /// @param append Helper to append a comma.
    function trait(
        string memory traitType, string memory traitValue, string memory append
    ) public pure returns (string memory) {
        return string(abi.encodePacked(
            '{',
                '"trait_type": "', traitType, '",'
                '"value": "', traitValue, '"'
            '}',
            append
        ));
    }

}
