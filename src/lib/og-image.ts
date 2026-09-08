import sharp from 'sharp'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export type OgImageKind = 'home' | 'page' | 'writing' | 'note' | 'til' | 'quote'

export interface OgImageSpec {
  path: string
  kind: OgImageKind
  title: string
  description?: string
  label?: string
  meta?: string
}

const palette = {
  background: '#f8f7f4',
  backgroundDeep: '#eeebe5',
  ink: '#151312',
  muted: '#625d58',
  hairline: '#c8c2bb',
  accent: '#e94a1a',
  accentSoft: '#ffe0d5',
  dark: '#171514',
  darkMuted: '#c6bcb1',
  light: '#f8f1e9',
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function plainText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function characterWidth(character: string): number {
  if (/[ilI1.,'’]/.test(character)) return 0.26
  if (/[mwMW@%&]/.test(character)) return 0.88
  if (/[A-Z0-9]/.test(character)) return 0.65
  if (/\s/.test(character)) return 0.3
  return 0.5
}

function textWidth(value: string, fontSize: number): number {
  return [...value].reduce((width, character) => width + characterWidth(character) * fontSize, 0)
}

export function wrapText(value: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const words = plainText(value).split(' ').filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && textWidth(candidate, fontSize) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }

    if (lines.length === maxLines) break
  }

  if (lines.length < maxLines && line) lines.push(line)

  const consumed = lines.join(' ').split(' ').length
  if (consumed < words.length && lines.length > 0) {
    let last = lines.at(-1) ?? ''
    while (last && textWidth(`${last}…`, fontSize) > maxWidth) {
      last = last.replace(/\s+\S+$/, '')
    }
    lines[lines.length - 1] = `${last || words[consumed - 1]}…`
  }

  return lines
}

function textLines(lines: string[], x: number, y: number, lineHeight: number, className: string): string {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`)
    .join('')
}

function baseStyles(titleSize: number): string {
  return `
    .serif { font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; }
    .sans { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    .brand { font-size: 29px; font-weight: 500; letter-spacing: -0.02em; }
    .label { font-size: 17px; font-weight: 700; letter-spacing: 0.12em; }
    .title { font-size: ${titleSize}px; font-weight: 650; letter-spacing: -0.035em; }
    .description { font-size: 23px; font-weight: 450; letter-spacing: -0.01em; }
    .meta { font-size: 16px; font-weight: 650; letter-spacing: 0.05em; }
  `
}

function editorialCard(spec: OgImageSpec): string {
  const titleLength = plainText(spec.title).length
  const titleSize = titleLength > 105 ? 51 : titleLength > 70 ? 58 : titleLength > 42 ? 66 : 76
  const titleLines = wrapText(spec.title, 930, titleSize, 3)
  const titleTop = titleLines.length === 1 ? 270 : titleLines.length === 2 ? 220 : 206
  const titleLineHeight = Math.round(titleSize * 1.03)
  const descriptionLines = spec.description ? wrapText(spec.description, 840, 23, 2) : []
  const descriptionTop = Math.min(492, titleTop + titleLines.length * titleLineHeight + 34)

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>${baseStyles(titleSize)}</style>
      <rect width="1200" height="630" fill="${palette.background}"/>
      <path d="M1044 0H1200V630H1092C1062 520 1050 410 1064 300C1078 187 1071 87 1044 0Z" fill="${palette.accent}"/>
      <circle cx="1124" cy="104" r="19" fill="${palette.ink}"/>
      <line x1="72" y1="72" x2="1010" y2="72" stroke="${palette.hairline}" stroke-width="2"/>
      <text x="72" y="124" class="serif brand" fill="${palette.ink}">Ciaran Lyons</text>
      <text x="1010" y="121" text-anchor="end" class="mono label" fill="${palette.accent}">${escapeXml((spec.label ?? spec.kind).toUpperCase())}</text>
      ${textLines(titleLines, 72, titleTop, titleLineHeight, 'serif title')}
      ${textLines(descriptionLines, 74, descriptionTop, 31, 'sans description')}
      <text x="72" y="580" class="mono meta" fill="${palette.muted}">${escapeXml(spec.meta ?? 'CIARANLYONS.COM')}</text>
    </svg>
  `
}

function homeCard(spec: OgImageSpec): string {
  const lines = wrapText(spec.title, 790, 82, 3)
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>${baseStyles(82)}</style>
      <rect width="1200" height="630" fill="${palette.background}"/>
      <rect x="895" width="305" height="630" fill="${palette.accent}"/>
      <circle cx="1048" cy="315" r="104" fill="none" stroke="${palette.ink}" stroke-width="2"/>
      <circle cx="1048" cy="315" r="22" fill="${palette.ink}"/>
      <line x1="72" y1="72" x2="840" y2="72" stroke="${palette.hairline}" stroke-width="2"/>
      <text x="72" y="124" class="serif brand" fill="${palette.ink}">Ciaran Lyons</text>
      ${textLines(lines, 72, 250, 84, 'serif title')}
      <text x="72" y="580" class="mono meta" fill="${palette.muted}">CIARANLYONS.COM</text>
    </svg>
  `
}

function noteCard(spec: OgImageSpec): string {
  const titleSize = plainText(spec.title).length > 120 ? 47 : plainText(spec.title).length > 80 ? 54 : 62
  const lines = wrapText(spec.title, 1010, titleSize, 4)
  const top = lines.length <= 2 ? 245 : 194
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>${baseStyles(titleSize)}</style>
      <rect width="1200" height="630" fill="${palette.dark}"/>
      <rect x="72" y="70" width="42" height="8" fill="${palette.accent}"/>
      <line x1="130" y1="74" x2="1128" y2="74" stroke="#4d4640" stroke-width="2"/>
      <text x="72" y="129" class="serif brand" fill="${palette.light}">Ciaran Lyons</text>
      <text x="1128" y="126" text-anchor="end" class="mono label" fill="${palette.accent}">NOTE</text>
      ${textLines(lines, 72, top, Math.round(titleSize * 1.12), 'serif title light-title')}
      <circle cx="1088" cy="546" r="39" fill="none" stroke="${palette.accent}" stroke-width="2"/>
      <path d="M1072 546H1104M1088 530V562" stroke="${palette.accent}" stroke-width="2"/>
      <text x="72" y="580" class="mono meta" fill="${palette.darkMuted}">${escapeXml(spec.meta ?? 'CIARANLYONS.COM')}</text>
      <style>.light-title { fill: ${palette.light}; }</style>
    </svg>
  `
}

function tilCard(spec: OgImageSpec): string {
  const titleSize = plainText(spec.title).length > 90 ? 53 : plainText(spec.title).length > 60 ? 61 : 70
  const titleLines = wrapText(spec.title, 810, titleSize, 3)
  const descriptionLines = spec.description ? wrapText(spec.description, 760, 22, 2) : []
  const titleTop = titleLines.length === 1 ? 290 : titleLines.length === 2 ? 250 : 235
  const lineHeight = Math.round(titleSize * 1.05)
  const descriptionTop = Math.min(504, titleTop + titleLines.length * lineHeight + 31)
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>${baseStyles(titleSize)}</style>
      <rect width="1200" height="630" fill="${palette.backgroundDeep}"/>
      <rect x="940" width="260" height="630" fill="${palette.accentSoft}"/>
      <text x="1070" y="406" text-anchor="middle" class="sans" font-size="158" font-weight="800" letter-spacing="-0.08em" fill="${palette.accent}" transform="rotate(-90 1070 315)">TIL</text>
      <line x1="72" y1="72" x2="878" y2="72" stroke="${palette.hairline}" stroke-width="2"/>
      <text x="72" y="124" class="serif brand" fill="${palette.ink}">Ciaran Lyons</text>
      <text x="878" y="121" text-anchor="end" class="mono label" fill="${palette.accent}">${escapeXml((spec.label ?? 'TIL').toUpperCase())}</text>
      ${textLines(titleLines, 72, titleTop, lineHeight, 'serif title')}
      ${textLines(descriptionLines, 74, descriptionTop, 30, 'sans description')}
      <text x="72" y="580" class="mono meta" fill="${palette.muted}">${escapeXml(spec.meta ?? 'CIARANLYONS.COM')}</text>
    </svg>
  `
}

function quoteCard(spec: OgImageSpec): string {
  const quoteLength = plainText(spec.title).length
  const titleSize = quoteLength > 210 ? 40 : quoteLength > 145 ? 45 : quoteLength > 90 ? 51 : 59
  const titleLines = wrapText(spec.title, 930, titleSize, 5)
  const lineHeight = Math.round(titleSize * 1.11)
  const top = titleLines.length <= 2 ? 280 : titleLines.length === 3 ? 240 : 205
  const metaLines = spec.description ? wrapText(spec.description, 790, 21, 2) : []
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <style>${baseStyles(titleSize)}</style>
      <rect width="1200" height="630" fill="${palette.accent}"/>
      <line x1="72" y1="72" x2="1128" y2="72" stroke="${palette.ink}" stroke-width="2" opacity="0.42"/>
      <text x="72" y="124" class="serif brand" fill="${palette.ink}">Ciaran Lyons</text>
      <text x="1128" y="121" text-anchor="end" class="mono label" fill="${palette.ink}">FOUND QUOTE</text>
      <text x="68" y="${top + 2}" class="serif" font-size="104" fill="${palette.background}" opacity="0.52">“</text>
      ${textLines(titleLines, 120, top, lineHeight, 'serif title')}
      ${textLines(metaLines, 120, 545 - Math.max(0, metaLines.length - 1) * 27, 27, 'sans description')}
      <rect x="1088" y="534" width="40" height="40" rx="20" fill="${palette.ink}"/>
      <text x="1108" y="562" text-anchor="middle" class="serif" font-size="29" font-weight="700" fill="${palette.accent}">#</text>
    </svg>
  `
}

export function buildOgSvg(spec: OgImageSpec): string {
  if (spec.kind === 'home') return homeCard(spec)
  if (spec.kind === 'note') return noteCard(spec)
  if (spec.kind === 'til') return tilCard(spec)
  if (spec.kind === 'quote') return quoteCard(spec)
  return editorialCard(spec)
}

export async function buildOgPng(spec: OgImageSpec): Promise<Buffer> {
  return sharp(Buffer.from(buildOgSvg(spec))).png({ compressionLevel: 9 }).toBuffer()
}

export function ogImagePath(pagePath: string): string {
  const normalized = pagePath === '/' ? '/home/' : `/${pagePath.replace(/^\/+|\/+$/g, '')}/`
  return `/og${normalized.slice(0, -1)}.png`
}
