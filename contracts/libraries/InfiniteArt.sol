// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import "./EightyColors.sol";
import "./Utilities.sol";

/**
@title  InfiniteArt
@author VisualizeValue
@notice Renders the Infinity visuals.
*/
library InfiniteArt {

    /// @dev Collect relevant rendering data for easy access across functions.
    function collectRenderData(uint256 tokenId) public pure returns (RenderData memory data) {
        data.seed        = tokenId;
        data.light       = tokenId <= 88888888 ? true : false;
        data.background  = data.light == true ? 'FBFBFB' : '111111';
        data.gridColor   = data.light == true ? 'F5F5F5' : '1D1D1D';
        data.grid        = getGrid(tokenId);
        data.count       = data.grid ** 2;
        data.stroke      = data.grid < 8 ? '0.04' : '0.03';

        data.band        = getBand(tokenId);
        data.palette     = getPalette(tokenId);
        if (data.palette == 1) {
            data.elementType = getElementType(tokenId);
        }
        data.gradient    = getGradient(data);

        data.drops       = getDrops(data);
    }

    function getGrid(uint256 seed) public pure returns (uint8) {
        uint256 n = Utilities.random(seed, 'grid', 100);

        return n <  1 ? 1
             : n <  8 ? 2
             : n < 24 ? 4
             : 8;
    }

    function getBand(uint256 seed) public pure returns (uint8) {
        uint256 n = Utilities.random(seed, 'band', 120);

        return n > 80 ? 80
             : n > 50 ? 60
             : n > 30 ? 40
             : n > 20 ? 20
             : n > 12 ? 10
             : n >  7 ? 5
             : n >  3 ? 3
             : n >  1 ? 2
             : 1;
    }

    function getPalette(uint256 tokenId) public pure returns (uint8) {
        return Utilities.random(tokenId, 'palette', 100) < 80 ? 0 : 1;
    }

    function getElementType(uint256 tokenId) public pure returns (uint8) {
        uint256 n = Utilities.random(tokenId, 'element_type', 152);

        return n > 88 ? 1 // Complete
             : n > 56 ? 2 // Compound
             : n > 32 ? 3 // Composite
             : n > 16 ? 4 // Isolate
             : n >  4 ? 5 // Order
             : 6; // Alpha

    }

    function getGradient(RenderData memory data) public pure returns (uint8) {
        if (data.grid == 1) return 0;

        uint8 options = data.grid == 2 ? 2 : 6;
        uint8[6] memory GRADIENTS = data.grid == 2 ? [1, 2, 0, 0,  0,  0]
                                  : data.grid == 4 ? [1, 2, 4, 8, 10, 12]
                                                   : [1, 2, 4, 7,  8,  9];

        // Originals
        if (data.palette == 0) {
            return Utilities.random(data.seed, 'gradient', 10) < 2
                   ? GRADIENTS[Utilities.random(data.seed, 'gradient_select', options)]
                   : 0;
        }

        // Elements
        if (data.elementType == 6) return 1;
        if (data.elementType == 5) return GRADIENTS[Utilities.random(data.seed, 'gradient_select', options)];
        return 0;
    }

    function getDrops(RenderData memory data) public pure returns (Drop[] memory drops) {
        return drops;
    }

    /// @dev Generate the SVG code for rows in the 8x8 grid.
    function generateGridRow() public pure returns (bytes memory) {
        bytes memory row;
        for (uint256 i; i < 8; i++) {
            row = abi.encodePacked(
                row,
                '<use transform="translate(', Utilities.uint2str(i), ')" href="#box" />'
            );
        }
        return row;
    }

    /// @dev Generate the SVG code for the entire 8x8 grid.
    function generateGrid() public pure returns (bytes memory) {
        bytes memory grid;
        for (uint256 i; i < 8; i++) {
            grid = abi.encodePacked(
                grid,
                '<use href="#row" transform="translate(0,', Utilities.uint2str(i), ')" />'
            );
        }

        return grid;
    }

    /// @dev Generate SVG code for the drops.
    function generateDrops(RenderData memory data) public pure returns (bytes memory) {
        bytes memory drops;

        return drops;
    }

    function generateStyle(RenderData memory data) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<style>',
                ':root {',
                    '--bg: #', data.background, ';',
                    '--gr: #', data.gridColor, ';',
                '}',
            '</style>'
        );
    }

    function generateDefs() public pure returns (bytes memory) {
        return abi.encodePacked(
            '<defs>',
                '<rect id="box" width="1" height="1" fill="var(--bg)" stroke="var(--gr)" stroke-width="0.04" style="paint-order: stroke;" />'
                '<g id="row">', generateGridRow(), '</g>',
                '<mask id="mask"><rect width="8" height="8" fill="white"/></mask>',
                '<path id="drop" d="M 1 0 A 1 1, 0, 1, 1, 0 1 L 0 0 Z"/>',
                '<g id="infinity">',
                    '<use href="#drop" />',
                    '<use href="#drop" transform="scale(-1,-1)" />',
                '</g>',
                '<filter id="noise">',
                    '<feTurbulence type="fractalNoise" baseFrequency="80" stitchTiles="stitch" numOctaves="1" seed="1"/>',
                    '<feColorMatrix type="matrix" values="2  0  0 -1 -1',
                                                            '2  0  0 -1 -1',
                                                            '2  0  0 -1 -1',
                                                        '0.8  0  0 -1  0.2" />',
                '</filter>',
            '</defs>'
        );
    }

    /// @dev Generate the SVG code for an Infinity token.
    /// @param data The token to render.
    function generateSVG(RenderData memory data) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<svg viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">',
                generateStyle(data),
                generateDefs(),
                '<rect width="8" height="8" fill="var(--bg)" />',
                '<g transform="scale(0.95)" transform-origin="center">',
                    generateGrid(),
                    generateDrops(data),
                '</g>',
                '<rect mask="url(#mask)" width="8" height="8" fill="black" filter="url(#noise)" style="mix-blend-mode: overlay;"/>',
            '</svg>'
        );
    }
}

struct Drop {
    uint8 form;
    uint8 color;
    uint8 rotation;
}

/// @dev Bag holding all data relevant for rendering.
struct RenderData {
    string background;
    string gridColor;
    string stroke;
    uint256 seed;
    uint8 palette;
    uint8 elementType;
    uint8 grid;
    uint8 count;
    uint8 band;
    uint8 gradient;
    bool light;
    Drop[] drops;

    // IChecks.Check check;
    // uint[] colorIndexes;
    // string[] colors;
    // string canvasColor;
    // string gridColor;
    // string duration;
    // string scale;
    // uint32 seed;
    // uint16 rowX;
    // uint16 rowY;
    // uint8 count;
    // uint8 spaceX;
    // uint8 spaceY;
    // uint8 perRow;
    // uint8 indexInRow;
    // uint8 isIndented;
    // bool isNewRow;
    // bool isBlack;
    // bool indent;
}
