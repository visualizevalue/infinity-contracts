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

    // /// @dev The different color band sizes that we use for the art.
    // function COLOR_BANDS() public pure returns (uint8[9] memory) {
    //     return [ 80, 60, 40, 20, 10, 5, 3, 2, 1 ];
    // }

    // /// @dev The gradient increment steps.
    // function GRADIENTS() public pure returns (uint8[7] memory) {
    //     return [ 0, 1, 2, 5, 8, 9, 10 ];
    // }

    /// @dev Collect relevant rendering data for easy access across functions.
    function collectRenderData(uint256 tokenId) public pure returns (RenderData memory data) {
        data.seed        = tokenId;
        data.light       = tokenId <= 88888888 ? true : false;
        data.background  = data.light == true ? 'FBFBFB' : '111111';
        data.gridColor   = data.light == true ? 'F5F5F5' : '1D1D1D';
        data.grid        = 8;
        data.stroke      = data.grid < 8 ? '0.04' : '0.03';

        // data.isBlack = check.stored.divisorIndex == 7;
        // data.count = data.isBlack ? 1 : DIVISORS()[check.stored.divisorIndex];

        // // Compute colors and indexes.
        // (string[] memory colors_, uint256[] memory colorIndexes_) = colors(check, checks);
        // data.gridColor = data.isBlack ? '#F2F2F2' : '#191919';
        // data.canvasColor = data.isBlack ? '#FFF' : '#111';
        // data.colorIndexes = colorIndexes_;
        // data.colors = colors_;

        // // Compute positioning data.
        // data.scale = data.count > 20 ? '1' : data.count > 1 ? '2' : '3';
        // data.spaceX = data.count == 80 ? 36 : 72;
        // data.spaceY = data.count > 20 ? 36 : 72;
        // data.perRow = perRow(data.count);
        // data.indent = data.count == 40;
        // data.rowX = rowX(data.count);
        // data.rowY = rowY(data.count);
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

/// @dev Bag holding all data relevant for rendering.
struct RenderData {
    string background;
    string gridColor;
    string stroke;
    uint256 seed;
    uint8 grid;
    bool light;
    // IChecks.Check check;
    // uint256[] colorIndexes;
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
