// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import "./EightyColors.sol";
import "./Utilities.sol";
import "hardhat/console.sol";

/**
@title  InfiniteArt
@author VisualizeValue
@notice Renders the Infinity visuals.
*/
library InfiniteArt {

    uint constant private STROKE = 4;

    /// @dev Generate the SVG code for an Infinity token.
    /// @param data The token to render.
    function renderSVG(RenderData memory data) public view returns (bytes memory) {
        return abi.encodePacked(
            '<svg viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">',
                renderStyle(data),
                renderDefs(),
                '<rect width="800" height="800" fill="var(--bg)" />',
                '<g transform="scale(0.95)" transform-origin="center">',
                    renderGrid(),
                    renderDrops(data),
                '</g>',
                '<rect mask="url(#mask)" width="800" height="800" fill="black" filter="url(#noise)" style="mix-blend-mode: overlay;"/>',
            '</svg>'
        );
    }

    function renderStyle(RenderData memory data) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<style>',
                ':root {',
                    '--bg: #', data.background, ';',
                    '--gr: #', data.gridColor, ';',
                '}',
            '</style>'
        );
    }

    function renderDefs() public pure returns (bytes memory) {
        return abi.encodePacked(
            '<defs>',
                '<rect id="box" width="100" height="100" stroke="var(--gr)" stroke-width="4" style="paint-order: stroke;" />'
                '<g id="row">', renderGridRow(), '</g>',
                '<mask id="mask"><rect width="800" height="800" fill="white"/></mask>',
                '<path id="drop" d="M 100 0 A 100 100, 0, 1, 1, 0 100 L 0 0 Z"/>',
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

    /// @dev Generate the SVG code for rows in the 8x8 grid.
    function renderGridRow() public pure returns (bytes memory) {
        bytes memory row;
        for (uint256 i; i < 8; i++) {
            row = abi.encodePacked(
                row,
                '<use transform="translate(', Utilities.uint2str(i*100), ')" href="#box" />'
            );
        }
        return row;
    }

    /// @dev Generate the SVG code for the entire 8x8 grid.
    function renderGrid() public pure returns (bytes memory) {
        bytes memory grid;
        for (uint256 i; i < 8; i++) {
            grid = abi.encodePacked(
                grid,
                '<use href="#row" transform="translate(0,', Utilities.uint2str(i*100), ')" />'
            );
        }

        return grid;
    }

    /// @dev Generate SVG code for the drops.
    function renderDrops(RenderData memory data) public view returns (bytes memory) {
        // // TODO: Refactor up or down?
        // string memory center = data.grid == 1 ? '2'
        //                      : data.grid == 2 ? '1'
        //                      : data.grid == 4 ? '0.5'
        //                                       : '0.25';

        bytes memory drops;
        for (uint i = 0; i < data.count; i++) {
            drops = abi.encodePacked(drops, renderDropGroup(i, data));
        }

        return drops;
    }

    function renderDropGroup(uint i, RenderData memory data) public view returns (bytes memory) {
        uint baseStroke = data.grid < 8 ? STROKE : STROKE * 3 / 4;

        uint space = 800 / data.grid;
        uint center = space / 4;
        uint width = space / 2;
        uint scale = width * 100 / data.drops[i].formWidth;

        if (i == 0) {
            console.log(data.seed, width, data.drops[i].formWidth);
        }

        data.drops[i].stroke = Utilities.uint2str(baseStroke * data.grid / 2);
        data.drops[i].width  = Utilities.uint2str(width);
        data.drops[i].center = Utilities.uint2str(center);
        data.drops[i].x      = Utilities.uint2str(i % data.grid * space + center);
        data.drops[i].y      = Utilities.uint2str(i / data.grid * space + center);
        data.drops[i].scale  = data.drops[i].formWidth > width
            ? string(abi.encodePacked('0.', Utilities.uint2str(scale)))
            : Utilities.uint2str(scale / 100);

        return renderDrop(data.drops[i]);
    }

    function renderDrop(Drop memory drop) public view returns (bytes memory) {
        return abi.encodePacked(
            '<g ',renderDropTransforms(drop),' stroke-width="', drop.stroke, '">',
                '<use href="#drop" transform="scale(', drop.scale, ')" stroke="#', drop.color, '" />'
            '</g>'
        );
    }

    function renderDropTransforms(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            'transform="translate(',drop.x,',',drop.y,') rotate(',drop.rotation,')" transform-origin="',drop.center,' ',drop.center,'"'
        );
    }

    /// @dev Collect relevant rendering data for easy access across functions.
    function collectRenderData(uint256 tokenId) public view returns (RenderData memory data) {
        data.seed        = tokenId;
        data.light       = tokenId <= 88888888 ? true : false;
        data.background  = data.light == true ? 'FBFBFB' : '111111';
        // data.gridColor   = data.light == true ? 'F5F5F5' : '1D1D1D';
        data.gridColor   = data.light == true ? 'F5F5F5' : '505050';
        data.grid        = getGrid(tokenId);
        data.count       = data.grid ** 2;
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

        // return n <  1 ? 1
        //      : n <  8 ? 2
        //      : n < 24 ? 4
        //      : 8;
        return n <  25 ? 1
             : n <  50 ? 2
             : n <  75 ? 4
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

    function getGradient(RenderData memory data) public view returns (uint8) {
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

    function getDrops(RenderData memory data) public view returns (Drop[64] memory drops) {
        console.log('data.count', data.count);
        for (uint i = 0; i < data.count; i++) {
            drops[i].form = 1;
            drops[i].formWidth = 200;
            drops[i].color = 'fff';
            drops[i].rotation = '90';
        }
    }
}

struct Drop {
    uint8 form;
    uint8 formWidth;
    string color;
    string scale;
    string rotation;
    string stroke;
    string center;
    string width;
    string x;
    string y;
}

/// @dev Bag holding all data relevant for rendering.
struct RenderData {
    string background;
    string gridColor;
    uint256 seed;
    uint8 palette;
    uint8 elementType;
    uint8 grid;
    uint8 count;
    uint8 band;
    uint8 gradient;
    bool light;
    Drop[64] drops;

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
