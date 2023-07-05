import fs from 'fs'

const COUNT = 16
const START_HUE = 176
const HUE_INCREMENT = 360 / COUNT
const SATS = [88, 88, 88, 88]
const LUMS = [56, 60, 64, 72]


class Color {
  constructor(public h: number, public s: number, public l: number) {}
}

const rootBand = [...Array(COUNT)].map((_, i) => new Color(START_HUE + i * HUE_INCREMENT, SATS[0], LUMS[0]))

const colors: Color[] = []
for (const color of rootBand) {
  colors.push(new Color(color.h, color.s, color.l))
  colors.push(new Color(color.h, SATS[1], LUMS[1]))
  colors.push(new Color(color.h, SATS[2], LUMS[2]))
  colors.push(new Color(color.h, SATS[3], LUMS[3]))
}

const SVG = `<svg width="400" height="1500" viewBox="0 0 400 1500">
    ${
      colors
        .map((c, i) => `<rect width="100" height="100" x="${i % 4 * 100}" y="${Math.floor(i / 4) * 100}" fill="hsl(${c.h} ${c.s}% ${c.l}%)" />`)
        .join(`\n`)
    }
  </svg>
`

fs.writeFileSync('colors.svg', SVG)


/// complete band
/// add air and void as extra
/// every 4096 black on white
