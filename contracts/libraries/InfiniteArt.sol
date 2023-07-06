// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Utilities.sol";
import "hardhat/console.sol";

/**
@title  InfiniteArt
@author VisualizeValue
@notice Renders the Infinity visuals.
*/
library InfiniteArt {

    uint8 public constant ELEMENTS = 17;
    uint8 public constant SHADES = 4;

    /// @dev Generate the SVG code for an Infinity token.
    /// @param data The token to render.
    function renderSVG(RenderData memory data) public view returns (string memory) {
        return string.concat(
            '<svg viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">',
                renderStyle(data),
                renderDefs(),
                '<rect width="800" height="800" fill="var(--bg)" />',
                '<g transform="scale(0.95)" transform-origin="center">',
                    renderGrid(),
                    renderDrops(data),
                '</g>',
                renderNoise(data),
            '</svg>'
        );
    }

    function renderNoise(RenderData memory data) public pure returns (string memory) {
        return string.concat(
            '<rect mask="url(#mask)" width="800" height="800" fill="black" filter="url(#noise)" style="mix-blend-mode: ',
            data.light ? 'multiply;" opacity="0.248"' : 'overlay;"',
            '/>'
        );
    }

    function renderStyle(RenderData memory data) public pure returns (string memory) {
        return string.concat(
            '<style>',
                ':root {',
                    '--bg: ', data.background, ';',
                    '--gr: ', data.gridColor, ';',
                '}',
            '</style>'
        );
    }

    function renderDefs() public pure returns (string memory) {
        return string.concat(
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
                    '<feTurbulence type="fractalNoise" baseFrequency="1" stitchTiles="stitch" numOctaves="1" seed="1"/>',
                    '<feColorMatrix type="saturate" values="0"/>',
                '</filter>',
            '</defs>'
        );
    }

    /// @dev Generate the SVG code for rows in the 8x8 grid.
    function renderGridRow() public pure returns (string memory) {
        string memory row;
        for (uint256 i; i < 8; i++) {
            row = string.concat(
                row,
                '<use transform="translate(', str(i*100), ')" href="#box" />'
            );
        }
        return row;
    }

    /// @dev Generate the SVG code for the entire 8x8 grid.
    function renderGrid() public pure returns (string memory) {
        string memory grid;
        for (uint256 i; i < 8; i++) {
            grid = string.concat(
                grid,
                '<use href="#row" transform="translate(0,', str(i*100), ')" />'
            );
        }

        return grid;
    }

    /// @dev Generate SVG code for the drops.
    function renderDrops(RenderData memory data) public view returns (string memory) {
        uint space  = 800 / data.grid;
        uint center = space / 4;
        uint width  = space / 2;

        string memory drops;
        for (uint i = 0; i < data.count; i++) {
            Drop memory drop = data.drops[i];

            uint baseStroke = drop.isInfinity ? 8 : 4;
            uint stroke = (data.grid < 8 ? baseStroke : baseStroke * 3 / 4) * data.grid / 2;
            uint scale  = width * 1000 / drop.formWidth;

            drop.stroke = str(stroke);
            drop.width  = str(width);
            drop.center = str(center);
            drop.x      = str(i % data.grid * space + center);
            drop.y      = str(i / data.grid * space + center);
            drop.scale  = scale < 1000
                ? string.concat('0.', str(scale))
                : str(scale / 1000);

            drops = string.concat(drops, renderDrop(drop));
        }
        return drops;
    }

    function renderDrop(Drop memory drop) public view returns (string memory) {
        string memory symbol = drop.form == 1 ? renderDropForm1(drop)
                             : drop.form == 2 ? renderDropForm2(drop)
                             : drop.form == 3 ? renderDropForm3(drop)
                             : drop.form == 4 ? renderDropForm4(drop)
                             : drop.form == 5 ? renderDropForm5(drop)
                             : drop.form == 8 ? renderDropForm8(drop)
                                              : renderDropForm9(drop);

        return string.concat(
            '<g ',renderDropTransforms(drop),' stroke-width="', drop.stroke, '">',
                symbol,
            '</g>'
        );
    }

    function renderDropTransforms(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            'transform="translate(',drop.x,',',drop.y,') rotate(',drop.rotation,')" transform-origin="',drop.center,' ',drop.center,'"'
        );
    }

    function renderDropForm1(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            '<use href="#drop" transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '" />'
        );
    }

    function renderDropForm2(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm3(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,0) scale(-1,1)" />',
            '</g>'
        );
    }

    function renderDropForm4(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<g transform="translate(200,200)">'
                    '<use href="#infinity" />',
                    '<use href="#infinity" transform="rotate(90)" />',
                '</g>'
            '</g>'
        );
    }

    function renderDropForm5(Drop memory drop) public pure returns (string memory) {
        return string.concat(
            '<g transform="scale(', drop.scale, ')" stroke="', drop.color.rendered, '">',
                '<use href="#drop" />',
                '<use href="#drop" transform="translate(200,200) scale(-1,-1)" />',
            '</g>'
        );
    }

    function renderDropForm8(Drop memory drop) public pure returns (string memory) {
        return string.concat(
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

    function renderDropForm9(Drop memory drop) public pure returns (string memory) {
        return string.concat(
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
        data.light       = tokenId % 4096 == 0 ? true : false;
        data.background  = data.light == true ? '#FFFFFF' : '#111111';
        data.gridColor   = data.light == true ? '#F5F5F5' : '#19181B';
        data.grid        = getGrid(data);
        data.count       = data.grid ** 2;
        data.alloy       = getAlloy(data);
        data.band        = getBand(data);
        data.continuous  = getContinuous(data);
        data.mapColors   = getColorMap(data);
        data.gradient    = getGradient(data);
        data.drops       = getDrops(data);
    }

    function getGrid(RenderData memory data) public pure returns (uint8) {
        if (data.seed == 0) return 1; // Genesis is 1x1

        uint256 n = Utilities.random(data.seed, 'grid', 160);

        return n <  1 ? 1
             : n <  8 ? 2
             : n < 40 ? 4
                      : 8;
    }

    function getBand(RenderData memory data) public pure returns (uint8) {
        return Utilities.max(1, data.alloy * SHADES);
    }

    function getColorMap(RenderData memory data) public pure returns (bool) {
        return Utilities.random(data.seed, 'color_map', 100) < 8;
    }

    function getContinuous(RenderData memory data) public pure returns (bool) {
        return Utilities.random(data.seed, 'continuous', 2) < 1;
    }

    // How many different elements we use...
    function getAlloy(RenderData memory data) public view returns (uint8) {
        if (data.grid == 1) return 0;

        uint8 n = uint8(Utilities.random(data.seed, 'alloy', 100));

        return n >= 56 ? 4 + n % (ELEMENTS - 4) // Complete
             : n >= 24 ? 2                     // Compound
             : n >=  4 ? 1                    // Composite
                       : 0;                  // Isolate
    }

    function getGradient(RenderData memory data) public view returns (uint8) {
        if (data.grid == 1 || data.alloy == 0) return 0;
        if (Utilities.random(data.seed, 'gradient', 10) < 8) return 0;

        uint8 options = data.grid == 2 ? 2 : 7;
        uint8[7] memory GRADIENTS = data.grid == 2 ? [1, 2, 0, 0, 0, 0, 0]
                                  : data.grid == 4 ? [1, 2, 3, 4, 5, 8, 10]
                                                   : [1, 2, 4, 7, 8, 9, 16];

        return GRADIENTS[Utilities.random(data.seed, 'select_gradient', options)];
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
                    string.concat('rotation', str(i)),
                    rotationCounts[formIdx]
                )
                : 0;
            drops[i].rotation = str(rotations * rotationIncrement);
        }
    }

    function getFormIdx(RenderData memory data, uint i) public view returns (uint) {
        if (data.seed == 0) return 5; // The genesis piece is an infinity flower

        uint random = Utilities.random(data.seed, string.concat('form', str(i)), 10);
        if (random == 0) return 0; // 10% drops

        uint8[3] memory common = [1, 3, 5]; // Infinities
        uint8[3] memory uncommon = [2, 4, 6]; // Drops

        uint idx = Utilities.random(data.seed, string.concat('form-idx', str(i)), 3);
        return random < 8 ? common[idx] : uncommon[idx];
    }

    function allColors (RenderData memory data) public view returns (Color[68] memory colors) {
        // Void
        uint8[4] memory voidLums = [16, 32, 80, 96];
        for (uint i = 0; i < SHADES; i++) {
            colors[i].h = 270;
            colors[i].s = 8;
            colors[i].l = voidLums[i];
            colors[i].rendered = data.light ? '#080808' : renderColor(colors[i]);
        }

        // Colors
        uint8 count = 4*4;
        uint16 startHue = 256;
        uint8[4] memory lums = [56, 60, 64, 72];
        for (uint8 i = 0; i < 16; i++) {
            uint16 hue = (startHue + 360 * i / count) % 360;

            for(uint8 e = 0; e < 4; e++) {
                uint8 idx = 4+i*4+e;
                colors[idx].h = hue;
                colors[idx].s = 88;
                colors[idx].l = lums[e];
                colors[idx].rendered = data.light ? '#080808' : renderColor(colors[idx]);
            }
        }
    }

    function renderColor(Color memory color) public pure returns (string memory) {
        return string.concat('hsl(', str(color.h), ' ', str(color.s), '% ', str(color.l), '%)');
    }

    function getColors(RenderData memory data) public view returns (uint[64] memory colorIndexes, Color[64] memory colors) {
        console.log('=============');
        console.log('token', data.seed);
        console.log('data.continuous', data.continuous);
        console.log('data.gradient', data.gradient);
        console.log('data.alloy', data.alloy);
        console.log('data.band', data.band);

        Color[68] memory all = allColors(data);
        console.log('=============');
        console.log('options:');
        uint[68] memory options = getColorOptions(data);
        console.log('=============');

        for (uint i = 0; i < data.count; i++) {
            colorIndexes[i] = (
                data.gradient > 0
                    ? getGradientColor(data, options, i)
                    : getRandomColor(data, options, i)
            ) % 68;

            // console.log('colorIndexes[i]', colorIndexes[i]);

            colors[i] = all[options[colorIndexes[i]]];
        }
    }

    function getColorOptions(RenderData memory data) public view returns (uint[68] memory options) {
        uint count = Utilities.max(1, data.alloy);
        for (uint element = 0; element < count; element++) {
            uint idx = element * SHADES;

            uint chosen = data.continuous && element > 0
                ? (options[idx - 1] / SHADES + 1) % ELEMENTS // Increment previous by one
                : Utilities.random(data.seed, string.concat('element', str(element)), ELEMENTS);
            uint chosenIdx = chosen * SHADES;

            for (uint shade = 0; shade < SHADES; shade++) {
                options[idx + shade] = chosenIdx + shade;
                console.log(data.seed, idx + shade, options[idx + shade]);
            }
        }
    }

    function getGradientColor(RenderData memory data, uint[68] memory options, uint i) public view returns (uint) {
        uint offset;
        if (data.gradient == 3 || data.gradient == 7) {
            offset = data.grid + 1;
        }

        return ((offset + i) * data.gradient * data.band / data.count) % data.band;
    }

    function getRandomColor(RenderData memory data, uint[68] memory options, uint i) public view returns (uint) {
        uint8 max = Utilities.max(SHADES, data.band);
        string memory key = data.alloy == 0 ? '0' : str(i);
        return Utilities.random(data.seed, string.concat('random_color_', key), max);
    }

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
    bool continuous;
    uint8 grid;
    uint8 count;
    uint8 band;
    uint8 gradient;
    bool mapColors;
    bool light;
    uint[64] formMap;
    Drop[64] drops;
}
