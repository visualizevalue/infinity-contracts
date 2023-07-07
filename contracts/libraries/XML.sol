// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library XML {
    // A generic element, can be used to construct any SVG (or HTML) element
    function tag(
        string memory name,
        string memory attributes,
        string memory children
    ) internal pure returns (string memory) {
        return string.concat(
            '<',name,' ',attributes,'>',
                children,
            '</',name,'>'
        );
    }

    // A generic element, can be used to construct any SVG (or HTML) element without children
    function tag(
        string memory name,
        string memory attributes
    ) internal pure returns (string memory) {
        return string.concat(
            '<',name,' ',attributes,'/>'
        );
    }

    // an SVG attribute
    function attr(
        string memory key,
        string memory value
    ) internal pure returns (string memory) {
        return string.concat(key, '=', '"', value, '" ');
    }
}
