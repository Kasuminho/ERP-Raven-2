const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { posts } = require('./staff-forum-content');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'staff-forum', 'assets');
const avatarPath = path.join(root, 'apps', 'web', 'public', 'aristolfo-webhooks.png');

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
}

function fit(value, max = 56) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const avatar = fs.readFileSync(avatarPath).toString('base64');

  for (const post of posts) {
    const title = post.title.replace(/^\d+ · /, '');
    const titleSize = title.length > 40 ? 40 : title.length > 32 ? 47 : 54;
    const cards = post.visual.map((line, index) => `
      <g transform="translate(80 ${305 + index * 148})">
        <rect width="930" height="116" rx="20" fill="#171018" stroke="#673347" stroke-width="2"/>
        <circle cx="58" cy="58" r="30" fill="#d5a84c"/>
        <text x="58" y="69" text-anchor="middle" font-size="31" font-weight="800" fill="#16080d">${index + 1}</text>
        <text x="112" y="69" font-family="Segoe UI, Arial, sans-serif" font-size="31" font-weight="650" fill="#fff4f0">${escapeXml(fit(line))}</text>
      </g>`).join('');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
        <defs>
          <radialGradient id="glow" cx="80%" cy="34%" r="78%"><stop offset="0" stop-color="#6b2338"/><stop offset="0.52" stop-color="#211019"/><stop offset="1" stop-color="#090609"/></radialGradient>
          <clipPath id="portrait"><circle cx="1330" cy="220" r="155"/></clipPath>
          <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000" flood-opacity="0.7"/></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#glow)"/>
        <path d="M0 790 C360 650 690 960 1060 775 C1270 665 1450 690 1600 610 L1600 900 L0 900Z" fill="#150a10" opacity="0.92"/>
        <circle cx="1330" cy="220" r="168" fill="#b23b5e" opacity="0.24" filter="url(#shadow)"/>
        <image href="data:image/png;base64,${avatar}" x="1175" y="65" width="310" height="310" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/>
        <circle cx="1330" cy="220" r="156" fill="none" stroke="#dc6b8b" stroke-width="5"/>
        <text x="80" y="90" font-family="Segoe UI, Arial, sans-serif" font-size="25" font-weight="750" letter-spacing="4" fill="#ef829e">CENTRAL DA STAFF · ACESSO RESTRITO</text>
        <text x="80" y="165" font-family="Georgia, Times New Roman, serif" font-size="${titleSize}" font-weight="700" fill="#fff3df">${escapeXml(fit(title))}</text>
        <text x="80" y="216" font-family="Segoe UI, Arial, sans-serif" font-size="25" fill="#cdb8bf">${escapeXml(post.route)}</text>
        ${cards}
        <line x1="1060" y1="410" x2="1060" y2="755" stroke="#73384b" stroke-width="2"/>
        <text x="1115" y="475" font-family="Georgia, Times New Roman, serif" font-size="38" fill="#fff3df">Staff G3X</text>
        <text x="1115" y="530" font-family="Segoe UI, Arial, sans-serif" font-size="25" fill="#d8c4ca">Operação • Auditoria</text>
        <text x="1115" y="572" font-family="Segoe UI, Arial, sans-serif" font-size="25" fill="#d8c4ca">Decisão • Comunicação</text>
        <text x="1115" y="752" font-family="Georgia, Times New Roman, serif" font-size="29" fill="#d5a84c">Aristolfo · 570 anos</text>
        <text x="80" y="846" font-family="Segoe UI, Arial, sans-serif" font-size="23" fill="#9f858d">G3X · RAVEN II  •  Tutorial oficial Staff-only · PT-BR</text>
      </svg>`;
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, `${post.slug}.png`));
  }

  console.log(`Generated ${posts.length} Staff tutorial assets in ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
