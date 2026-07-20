const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { posts } = require('./player-forum-content');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'player-forum', 'assets');
const avatarPath = path.join(root, 'apps', 'web', 'public', 'aristolfo-webhooks.png');

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
}

function fit(value, max = 58) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function cardLines(lines, x, y, color) {
  return lines.map((line, index) => `
    <g transform="translate(${x} ${y + (index * 142)})">
      <rect width="910" height="112" rx="20" fill="#151122" stroke="#3f315a" stroke-width="2"/>
      <circle cx="55" cy="56" r="29" fill="${color}"/>
      <text x="55" y="68" text-anchor="middle" font-size="32" font-weight="800" fill="#0b0712">${index + 1}</text>
      <text x="105" y="66" font-family="Segoe UI, Arial, sans-serif" font-size="31" font-weight="650" fill="#f5f0ff">${escapeXml(fit(line))}</text>
    </g>`).join('');
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const avatar = fs.readFileSync(avatarPath).toString('base64');

  for (const post of posts) {
    const title = post.title.replace(/^\d+ · /, '');
    const titleSize = title.length > 38 ? 42 : title.length > 32 ? 49 : 55;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
        <defs>
          <radialGradient id="glow" cx="78%" cy="35%" r="75%"><stop offset="0" stop-color="#512178"/><stop offset="0.55" stop-color="#171022"/><stop offset="1" stop-color="#08060d"/></radialGradient>
          <clipPath id="portrait"><circle cx="1330" cy="220" r="155"/></clipPath>
          <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000" flood-opacity="0.65"/></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#glow)"/>
        <path d="M0 790 C350 650 690 960 1050 770 C1260 660 1430 690 1600 610 L1600 900 L0 900Z" fill="#120b1e" opacity="0.9"/>
        <circle cx="1330" cy="220" r="168" fill="#9b63e8" opacity="0.25" filter="url(#shadow)"/>
        <image href="data:image/png;base64,${avatar}" x="1175" y="65" width="310" height="310" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/>
        <circle cx="1330" cy="220" r="156" fill="none" stroke="#b47cff" stroke-width="5"/>
        <text x="80" y="90" font-family="Segoe UI, Arial, sans-serif" font-size="25" font-weight="750" letter-spacing="4" fill="#b993ff">CENTRAL DO PLAYER · PLAYER HUB</text>
        <text x="80" y="165" font-family="Georgia, Times New Roman, serif" font-size="${titleSize}" font-weight="700" fill="#fff7e6">${escapeXml(fit(title, 52))}</text>
        <text x="80" y="214" font-family="Segoe UI, Arial, sans-serif" font-size="25" fill="#c8bdd8">${escapeXml(post.route)}</text>
        ${cardLines(post.visualPt, 80, 290, '#d5a84c')}
        <line x1="1045" y1="405" x2="1045" y2="760" stroke="#4f3c6b" stroke-width="2"/>
        ${post.visualEn.map((line, index) => `<text x="1100" y="${465 + index * 95}" font-family="Segoe UI, Arial, sans-serif" font-size="27" fill="#ddd3ea"><tspan fill="#b993ff" font-weight="800">${index + 1}.</tspan> ${escapeXml(fit(line, 30))}</text>`).join('')}
        <text x="1100" y="760" font-family="Georgia, Times New Roman, serif" font-size="29" fill="#d5a84c">Aristolfo · 570 anos</text>
        <text x="80" y="846" font-family="Segoe UI, Arial, sans-serif" font-size="23" fill="#8f839f">G3X · RAVEN II  •  Tutorial oficial PT-BR / EN</text>
      </svg>`;

    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, `${post.slug}.png`));
  }

  console.log(`Generated ${posts.length} tutorial assets in ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
