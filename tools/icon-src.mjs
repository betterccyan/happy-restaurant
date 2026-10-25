// 图标矢量源：幸福小馆 —— 白瓷碗 + 暖橙汤面 + 筷子入汤
// 供 gen-icons.mjs 调用；改设计只动这里
export function iconSvg({ bg = true, round = false, glyphScale = 1, size = 160 } = {}) {
  const DEFS = `
<defs>
  <linearGradient id="bg" x1="0.05" y1="0" x2="0.55" y2="1">
    <stop offset="0" stop-color="#5F9BFA"/>
    <stop offset="0.45" stop-color="#2C7BF2"/>
    <stop offset="1" stop-color="#1657C4"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.2" cy="0.04" r="0.82">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.40"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="soup" x1="0.15" y1="0" x2="0.55" y2="1">
    <stop offset="0" stop-color="#FFCB8E"/>
    <stop offset="1" stop-color="#F08B2E"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.15"/>
    <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="round"><circle cx="80" cy="80" r="80"/></clipPath>
</defs>`

  const BG = bg
    ? `<g ${round ? 'clip-path="url(#round)"' : ''}>
    <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#bg)"/>
    <path d="M0 38 A38 38 0 0 1 38 0 H122 L0 122 Z" fill="url(#sheen)"/>
    <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#glow)"/>
  </g>
  <rect x="0.75" y="0.75" width="158.5" height="158.5" rx="37.3" fill="none"
        stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"
        ${round ? 'clip-path="url(#round)"' : ''}/>`
    : ''

  // 图形主体（以 80,86 为基准缩放，保证居中）
  const GLYPH = `
  <g transform="translate(80 86) scale(${glyphScale}) translate(-80 -86)">
    <!-- 筷子画在碗之前：末端藏进碗身，避免出现悬空的钝头 -->
    <g stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round">
      <line x1="46" y1="112" x2="114" y2="31"/>
      <line x1="60" y1="116" x2="126" y2="34"/>
    </g>
    <path d="M35 102 C 35 130, 52 142, 80 142 C 108 142, 125 130, 125 102 Z" fill="#FFFFFF"/>
    <ellipse cx="80" cy="103" rx="37.5" ry="8.6" fill="url(#soup)"/>
    <ellipse cx="80" cy="102" rx="45" ry="12" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
  </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="${size}" height="${size}">
${DEFS}${BG}${GLYPH}
</svg>`
}
