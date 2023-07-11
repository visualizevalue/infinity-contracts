import fs from 'fs'
import puppeteer, { Browser, Page } from 'puppeteer'

let browser: Browser
let page: Page

const setupPNGRenderer = async () => {
  browser = await puppeteer.launch({ headless: 'new' })
  page = await browser.newPage()
  await page.setViewport({
    width: 1400,
    height: 1400,
    deviceScaleFactor: 1,
  })
}

const shutdownPNGRenderer = async () => browser.close()

const renderPNG = async (svg: string, path: string) => {
  await page.setContent(svg)
  await page.addStyleTag({ content: 'body { margin: 0; }' })
  await page.waitForSelector('svg')

  await page.screenshot({
    path
  })

  console.log(`Rendered ${path}`)
}

export const render = async (path: string) => {
  await setupPNGRenderer()
  try { fs.rmdirSync(`${path}/pngs`, { recursive: true }) } catch (e) {}
  try { fs.mkdirSync(`${path}/pngs`, { recursive: true }) } catch (e) {}

  const files = fs.readdirSync(`${path}/`).filter(f => f.indexOf('.svg') > -1)

  for (const file of files) {
    const svg = fs.readFileSync(`${path}/${file}`).toString()

    await renderPNG(svg, `${path}/pngs/${file.replace('svg', 'png')}`)
  }

  await shutdownPNGRenderer()
}
