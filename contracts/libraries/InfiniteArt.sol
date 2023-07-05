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
        uint space  = 800 / data.grid;
        uint center = space / 4;
        uint width  = space / 2;

        bytes memory drops;
        for (uint i = 0; i < data.count; i++) {
            Drop memory drop = data.drops[i];

            uint baseStroke = drop.isInfinity ? 8 : 4;
            uint stroke = (data.grid < 8 ? baseStroke : baseStroke * 3 / 4) * data.grid / 2;
            uint scale  = width * 1000 / drop.formWidth;

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
            '<use href="#drop" transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '" />'
        );
    }

    function renderDropForm2(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm3(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,0) scale(-1,1)" />',
            '</g>'
        );
    }

    function renderDropForm4(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                    '<use href="#infinity" transform="rotate(90)" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm5(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,200) scale(-1,-1)" />',
            '</g>'
        );
    }

    function renderDropForm8(Drop memory drop) public pure returns (bytes memory) {
        return abi.encodePacked(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
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
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
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
        data.grid        = getGrid(tokenId);
        data.count       = data.grid ** 2;
        data.band        = getBand(tokenId);
        data.mapColors   = getColorMap(tokenId);
        data.alloy       = getAlloy(tokenId);
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

    function getColorMap(uint256 tokenId) public pure returns (bool) {
        return Utilities.random(tokenId, 'color_map', 80) < 1;
    }

    function getAlloy(uint256 tokenId) public pure returns (uint8) {
        uint256 n = Utilities.random(tokenId, 'alloy', 152);

        return n > 88 ? 1 // Complete
             : n > 56 ? 2 // Compound
             : n > 32 ? 3 // Composite
             : n > 16 ? 4 // Isolate
             : n >  4 ? 5 // Order
             : 6;         // Alpha
    }

    function getGradient(RenderData memory data) public view returns (uint8) {
        if (data.grid == 1 || data.alloy < 5) return 0;

        uint8 options = data.grid == 2 ? 2 : 6;
        uint8[6] memory GRADIENTS = data.grid == 2 ? [1, 2, 0, 0,  0,  0]
                                  : data.grid == 4 ? [1, 2, 4, 8, 10, 12]
                                                   : [1, 2, 4, 7,  8,  9];

        if (data.alloy == 5) {
            return GRADIENTS[Utilities.random(data.seed, 'gradient_select', options)];
        }

        // Vertical or horizontal for alphas
        return Utilities.random(data.seed, 'gradient_select', 2) == 1 ? 1 : data.grid;
    }

    function setGetMap(uint[64] memory map, uint key, uint value) public pure returns (uint[64] memory, uint) {
        uint k = key % 64;

        if (map[k] == 0) {
            map[k] = value;
        }

        return (map, map[k]);
    }

    function getDrops(RenderData memory data) public view returns (Drop[64] memory drops) {
        uint8[7] memory forms          = [1, 2, 3, 4, 5, 8, 9];
        uint8[7] memory rotationCounts = [2, 4, 4, 2, 2, 0, 0]; // How often we rotate

        (uint[64] memory colorIndexes, Color[64] memory colors) = getColors(data);
        uint[64] memory formColorMap;

        for (uint i = 0; i < data.count; i++) {
            drops[i].colorIdx = colorIndexes[i];
            drops[i].color = colors[i];

            uint formIdx = getFormIdx(data, i);
            uint form = forms[formIdx];
            if (data.mapColors) {
                (formColorMap, form) = setGetMap(formColorMap, drops[i].colorIdx, form);
            }
            drops[i].form = form;

            drops[i].isInfinity = drops[i].form % 2 == 0;
            drops[i].formWidth = drops[i].isInfinity ? 400 : 200;

            uint rotationIncrement = drops[i].isInfinity ? 45 : 90;
            uint rotations = rotationCounts[formIdx] > 0
                ? Utilities.random(
                    data.seed,
                    string(abi.encodePacked('rotation', Utilities.uint2str(i))),
                    rotationCounts[formIdx]
                )
                : 0;
            drops[i].rotation = Utilities.uint2str(rotations * rotationIncrement);
        }
    }

    function getFormIdx(RenderData memory data, uint i) public view returns (uint) {
        uint random = Utilities.random(data.seed, string(abi.encodePacked('form', Utilities.uint2str(i))), 10);
        if (random == 0) return 0; // 10% drops

        uint8[3] memory common = [1, 3, 5]; // Infinities
        uint8[3] memory uncommon = [2, 4, 6]; // Drops

        uint idx = Utilities.random(data.seed, string(abi.encodePacked('form-idx', Utilities.uint2str(i))), 3);
        return random < 8 ? common[idx] : uncommon[idx];
    }

    // function getOriginalColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     string[80] memory allColors = EightyColors.COLORS();
    //     uint initialIdx = Utilities.random(data.seed, 'initial', 80);

    //     bool randomBand = Utilities.random(data.seed, 'random_band', 2) == 1 && data.band < 5;
    //     if (randomBand) {
    //         for (uint i = initialIdx; i < initialIdx + 5; i++) {
    //             uint randomIdx = Utilities.random(data.seed, string(abi.encodePacked('random_band_', Utilities.uint2str(i))), 80);
    //             allColors[i % 80] = allColors[randomIdx];
    //         }
    //     }

    //     for (uint i = 0; i < data.count; i++) {
    //         colors[i] = allColors[0];

    //         uint colorOffset = data.gradient > 0
    //             ? (i * data.gradient * data.band / data.count) % data.band
    //             : Utilities.random(data.seed, string(abi.encodePacked('random_color_', Utilities.uint2str(i))), data.band);

    //         colors[i] = allColors[(initialIdx + colorOffset) % 80];
    //     }
    // }

    function allColors () public pure returns (Color[68] memory colors) {
        // Void
        uint8[4] memory voidLums = [16, 32, 80, 96];
        for (uint i = 0; i < 4; i++) {
            colors[i].h = 270;
            colors[i].s = 8;
            colors[i].l = voidLums[i];
            colors[i].rendered = renderColor(colors[i]);
        }

        // Colors
        uint8 count = 4*4;
        uint16 h = 256;
        uint8[4] memory lums = [56, 60, 64, 72];
        for (uint8 i = 0; i < 16; i++) {
            for(uint8 e = 0; e < 4; e++) {
                uint8 idx = 4+i*4+e;
                colors[idx].h = h;
                colors[idx].s = 88;
                colors[idx].l = lums[e];
                colors[idx].rendered = renderColor(colors[idx]);
            }

            h = 360 * i / count;
        }
    }

    function renderColor(Color memory color) public pure returns (string memory) {
        return string.concat('hsl(', str(color.h), ' ', str(color.s), '% ', str(color.l), '%)');
    }

    function getColors(RenderData memory data) public view returns (uint[64] memory colorIndexes, Color[64] memory colors) {
        Color[68] memory all = allColors();
        uint initialIdx = Utilities.random(data.seed, 'initial', 68);

        for (uint i = 0; i < data.count; i++) {
            // uint idx = Utilities.random(data.seed, string.concat('complete', Utilities.uint2str(i)), 68);
            uint idx = (i * data.gradient * data.band / data.count) % data.band;

            // ~~We store 1-based index to differenciate between set and unset values later.~~
            colorIndexes[i] = ((initialIdx + idx) % 68);

            colors[i] = all[colorIndexes[i]];
        }


        // return data.alloy == 1 ? getCompleteColors(data)
        //      : data.alloy == 2 ? getCompleteColors(data)
        //      : data.alloy == 3 ? getCompleteColors(data)
        //      : data.alloy == 4 ? getCompleteColors(data)
        //      : data.alloy == 5 ? getCompleteColors(data)
        //                        : getCompleteColors(data);
        // return data.alloy == 1 ? getCompleteColors(data)
        //      : data.alloy == 2 ? getElementCompoundColors(data)
        //      : data.alloy == 3 ? getElementCompositeColors(data)
        //      : data.alloy == 4 ? getElementIsolateColors(data)
        //      : data.alloy == 5 ? getElementOrderColors(data)
        //                        : getElementAlphaColors(data);
    }

    function getCompleteColors(RenderData memory data) public view returns (uint[64] memory colorIndexes, Color[64] memory colors) {
        Color[68] memory all = allColors();
        uint initialIdx = Utilities.random(data.seed, 'initial', 68);

        for (uint i = 0; i < data.count; i++) {
            // uint idx = Utilities.random(data.seed, string.concat('complete', Utilities.uint2str(i)), 68);
            uint idx = (i * data.gradient * data.band / data.count) % data.band;

            // ~~We store 1-based index to differenciate between set and unset values later.~~
            colorIndexes[i] = ((initialIdx + idx) % 68);

            colors[i] = all[colorIndexes[i]];
        }
    }

    // function getElementCompoundColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     uint firstIdx = Utilities.random(data.seed, 'compound_1', 16) / 4;
    //     uint secondIdx = Utilities.random(data.seed, 'compound_2', 16) / 4;

    //     uint tries = 3;
    //     while (firstIdx == secondIdx) {
    //         secondIdx = Utilities.random(
    //             data.seed, string(abi.encodePacked('compound_', Utilities.uint2str(tries))), 16
    //         ) / 4;
    //         tries++;
    //     }

    //     for (uint i = 0; i < data.count; i++) {
    //         uint random = Utilities.random(data.seed, string(abi.encodePacked('compound_r_', Utilities.uint2str(i))), 8);

    //         uint idx = random < 4 ? 4 * firstIdx + random
    //                               : 4 * secondIdx + random - 4;

    //         colors[i] = SixteenElementsColors.ELEMENTS_COLORS()[idx];
    //     }
    // }

    // function getElementCompositeColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     uint elementIdx = Utilities.random(data.seed, 'composite', 16) / 4;

    //     for (uint i = 0; i < data.count; i++) {
    //         uint random = Utilities.random(data.seed, string(abi.encodePacked('composite_', Utilities.uint2str(i))), 4);

    //         colors[i] = SixteenElementsColors.ELEMENTS_COLORS()[4 * elementIdx + random];
    //     }
    // }

    // function getElementIsolateColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     uint idx = Utilities.random(data.seed, 'isolate', 16);

    //     for (uint i = 0; i < data.count; i++) {
    //         colors[i] = SixteenElementsColors.ELEMENTS_COLORS()[idx];
    //     }
    // }

    // function getElementOrderColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     bool reverse = Utilities.random(data.seed, 'order_rev', 2) > 0;
    //     uint element = Utilities.random(data.seed, 'order_el', 4);

    //     uint[64] memory options;
    //     for (uint i = 0; i < data.count; i++) {
    //         options[i] = 4 * element + (4 * i) / data.count;
    //     }

    //     for (uint i = 0; i < data.count; i++) {
    //         uint initial = data.gradient > 2
    //             ? data.gradient % 2 == 1
    //                 ? data.count - 1
    //                 : 0
    //             : 0;
    //         uint oIdx = (initial + i * data.gradient) % data.count;
    //         if (reverse) {
    //             oIdx = data.count - 1 - oIdx;
    //         }
    //         uint idx = options[oIdx];

    //         colors[i] = SixteenElementsColors.ELEMENTS_COLORS()[idx];
    //     }
    // }

    // function getElementAlphaColors(RenderData memory data) public view returns (string[64] memory colors) {
    //     data.gradient = 1;

    //     colors = getElementOrderColors(data);
    // }

    function str(uint n) public pure returns (string memory) {
        return Utilities.uint2str(n);
    }
}

struct Color {
    uint16 h;
    uint16 s;
    uint16 l;
    uint208 id;
    string rendered;
}

struct Drop {
    uint form;
    bool isInfinity;
    uint16 formWidth;
    string scale;
    string rotation;
    string stroke;
    string center;
    string width;
    string x;
    string y;
    uint colorIdx;
    Color color;
}

/// @dev Bag holding all data relevant for rendering.
struct RenderData {
    string background;
    string gridColor;
    uint256 seed;
    uint8 alloy;
    uint8 grid;
    uint8 count;
    uint8 band;
    uint8 gradient;
    bool mapColors;
    bool light;
    uint[64] formMap;
    Drop[64] drops;
}
