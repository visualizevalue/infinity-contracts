//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
@title  SixteenElementsColors
@author VisualizeValue
@notice The sixteen colors of Checks Elements.
*/
library SixteenElementsColors {

    function AIR_COLORS() public pure returns (string[4] memory) {
        return [
            '566A81',
            '869FBB',
            'B0C6DF',
            'CEDDEF'
        ];
    }

    function FIRE_COLORS() public pure returns (string[4] memory) {
        return [
            'A10332',
            'DA0545',
            'F34650',
            'F58787'
        ];
    }

    function EARTH_COLORS() public pure returns (string[4] memory) {
        return [
            '00CE2D',
            '20F25B',
            '6EFDA3',
            '9BFBBE'
        ];
    }

    function WATER_COLORS() public pure returns (string[4] memory) {
        return [
            '1D4ED8',
            '2472F0',
            '5FAEF7',
            '7DC7FC'
        ];
    }

    function ELEMENTS_COLORS() public pure returns (string[16] memory colors) {
        for (uint i =  0; i < 4; i++) { colors[i] = AIR_COLORS()[i]; }
        for (uint i =  0; i < 4; i++) { colors[4 + i] = FIRE_COLORS()[i]; }
        for (uint i =  0; i < 4; i++) { colors[8 + i] = EARTH_COLORS()[i]; }
        for (uint i =  0; i < 4; i++) { colors[12 + i] = WATER_COLORS()[i]; }
    }

}
