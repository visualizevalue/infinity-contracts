// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EightyColors.sol";
import "./SixteenElementsColors.sol";
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
        uint baseStroke = data.grid < 8 ? STROKE : STROKE * 3 / 4;

        uint space  = 800 / data.grid;
        uint center = space / 4;
        uint width  = space / 2;

        bytes memory drops;
        for (uint i = 0; i < data.count; i++) {
            Drop memory drop = data.drops[i];

            uint stroke = baseStroke * data.grid / 2;
            uint scale  = width * 1000 / drop.formWidth;

            if (drop.isInfinity) {
                stroke = stroke * 2;
                scale = scale / 2;
            }

            drop.stroke = Utilities.uint2str(stroke);
            drop.width  = Utilities.uint2str(width);
            drop.center = Utilities.uint2str(center);
            drop.x      = Utilities.uint2str(i % data.grid * space + center);
            drop.y      = Utilities.uint2str(i / data.grid * space + center);
            drop.scale  = scale < 1000
                ? string(abi.encodePacked('0.', Utilities.uint2str(scale)))
                : Utilities.uint2str(scale / 1000);

            drops = abi.encodePacked(drops, renderDrop(drop));
        }
        return drops;
    }

    function renderDrop(Drop memory drop) public view returns (bytes memory) {
        bytes memory symbol = drop.form == 1 ? renderDropForm1(drop)
                            : drop.form == 2 ? renderDropForm2(drop)
                            : drop.form == 3 ? renderDropForm3(drop)
                            : drop.form == 4 ? renderDropForm4(drop)
                            : drop.form == 5 ? renderDropForm5(drop)
                            : drop.form == 8 ? renderDropForm8(drop)
                                             : renderDropForm9(drop);

        return abi.encodePacked(
            '<g ',renderDropTransforms(drop),' stroke-width="', drop.stroke, '">',
                symbol,
            '</g>'
        );
    }

    function renderDropTransforms(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            'transform="translate(',drop.x,',',drop.y,') rotate(',drop.rotation,')" transform-origin="',drop.center,' ',drop.center,'"'
        );
    }

    function renderDropForm1(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<use href="#drop" transform="scale(', drop.scale, ')" stroke="#', drop.color, '" />'
        );
    }

    function renderDropForm2(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm3(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,0) scale(-1,1)" />',
            '</g>'
        );
    }

    function renderDropForm4(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                    '<use href="#infinity" transform="rotate(90)" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm5(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,200) scale(-1,-1)" />',
            '</g>'
        );
    }

    function renderDropForm8(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                    '<use href="#infinity" transform="rotate(45)" />',
                    '<use href="#infinity" transform="rotate(90)" />',
                    '<use href="#infinity" transform="rotate(135)" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm9(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="#', drop.color, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,0) scale(-1,1)" />',
                '<use href="#drop" transform="translate(0,200) scale(1,-1)" />',
                '<use href="#drop" transform="translate(200,200) scale(-1,-1)" />',
            '</g>'
        );
    }

    /// @dev Collect relevant rendering data for easy access across functions.
    function collectRenderData(uint256 tokenId) public view returns (RenderData memory data) {
        data.seed        = tokenId;
        data.light       = tokenId <= 88888888 ? true : false;
        data.background  = data.light == true ? 'FBFBFB' : '111111';
        data.gridColor   = data.light == true ? 'F5F5F5' : '1D1D1D';
        // data.gridColor   = data.light == true ? 'F5F5F5' : '505050';
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

        return n <  1 ? 1
             : n <  8 ? 2
             : n < 24 ? 4
             : 8;
        // return n <  25 ? 1
        //      : n <  50 ? 2
        //      : n <  75 ? 4
        //      : 8;
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
        uint8[7] memory forms          = [1, 2, 3, 4, 5, 8, 9];
        uint8[7] memory rotationCounts = [2, 4, 4, 2, 2, 0, 0]; // How often we rotate

        string[64] memory colors = data.palette == 1 ? getElementColors(data) : getOriginalColors(data);

        for (uint i = 0; i < data.count; i++) {
            uint formIdx = getFormIdx(data, i);
            drops[i].form = forms[formIdx];
            drops[i].isInfinity = drops[i].form % 2 == 0;
            uint rotationIncrement = drops[i].isInfinity ? 45 : 90;
            uint rotations = rotationCounts[formIdx] > 0
                ? Utilities.random(
                    data.seed,
                    string(abi.encodePacked('rotation', Utilities.uint2str(i))),
                    rotationCounts[formIdx]
                )
                : 0;
            drops[i].rotation = Utilities.uint2str(rotations * rotationIncrement);
            drops[i].formWidth = 200;
            drops[i].color = colors[i];
        }
    }

    function getFormIdx(RenderData memory data, uint i) public view returns (uint) {
        uint random = Utilities.random(data.seed, string(abi.encodePacked('form', Utilities.uint2str(i))), 10);
        if (random < 1) return 0; // 10% drops

        uint8[3] memory common = [1, 3, 5];
        uint8[3] memory uncommon = [2, 4, 6];

        uint idx = Utilities.random(data.seed, string(abi.encodePacked('form-idx', Utilities.uint2str(i))), 3);
        return random < 8 ? common[idx] : uncommon[idx];
    }

    function getOriginalColors(RenderData memory data) public view returns (string[64] memory colors) {
        string[80] memory allColors = EightyColors.COLORS();
        uint initialIdx = Utilities.random(data.seed, 'initial', 80);

        bool randomBand = Utilities.random(data.seed, 'random_band', 1) == 1 && data.band < 5;
        if (randomBand) {
            for (uint i = initialIdx; i < initialIdx + 5; i++) {
                uint randomIdx = Utilities.random(data.seed, string(abi.encodePacked('random_band_', Utilities.uint2str(i))), 80);
                allColors[i % 80] = allColors[randomIdx];
            }
        }

        for (uint i = 0; i < data.count; i++) {
            colors[i] = allColors[0];

            uint colorOffset = data.gradient > 0
                ? (i * data.gradient * data.band / data.count) % data.band
                : Utilities.random(data.seed, string(abi.encodePacked('random_color_', Utilities.uint2str(i))), data.band);

            colors[i] = allColors[(initialIdx + colorOffset) % 80];
        }
    }

    function getElementColors(RenderData memory data) public view returns (string[64] memory colors) {
        return data.elementType == 1 ? getElementCompleteColors(data)
             : data.elementType == 2 ? getElementCompoundColors(data)
             : data.elementType == 3 ? getElementCompositeColors(data)
             : data.elementType == 4 ? getElementIsolateColors(data)
             : data.elementType == 5 ? getElementOrderColors(data)
                                     : getElementAlphaColors(data);
    }

    function getElementCompleteColors(RenderData memory data) public view returns (string[64] memory colors) {
        for (uint i = 0; i < data.count; i++) {
            uint idx = Utilities.random(data.seed, string(abi.encodePacked('complete', Utilities.uint2str(i))), 16);
            colors[i] = SixteenElementsColors.ELEMENTS_COLORS()[idx];
        }
    }

    function getElementCompoundColors(RenderData memory data) public view returns (string[64] memory colors) {
        colors = getElementCompleteColors(data);
    }

    function getElementCompositeColors(RenderData memory data) public view returns (string[64] memory colors) {
        colors = getElementCompleteColors(data);
    }

    function getElementIsolateColors(RenderData memory data) public view returns (string[64] memory colors) {
        colors = getElementCompleteColors(data);
    }

    function getElementOrderColors(RenderData memory data) public view returns (string[64] memory colors) {
        colors = getElementCompleteColors(data);
    }

    function getElementAlphaColors(RenderData memory data) public view returns (string[64] memory colors) {
        colors = getElementCompleteColors(data);
    }
}

struct Drop {
    uint form;
    bool isInfinity;
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
