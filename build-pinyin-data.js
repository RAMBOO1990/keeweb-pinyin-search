const fs = require('fs');
const path = require('path');

const TONE_MAP = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
  'ü': 'v',
};
function stripTones(py) {
  return py.split('').map(ch => TONE_MAP[ch] || ch).join('');
}

function main() {
  const text = fs.readFileSync(path.join(__dirname, 'data', 'kMandarin_8105.txt'), 'utf8');
  const lines = text.split('\n');
  const map = {};

  for (const line of lines) {
    const m = line.match(/^U\+([0-9A-Fa-f]+):\s*(\S+)/);
    if (!m) continue;
    const codePoint = parseInt(m[1], 16);
    const rawPy = m[2];
    const ch = String.fromCodePoint(codePoint);
    const py = stripTones(rawPy);

    if (!py || py.includes('?')) continue;

    if (!map[py]) map[py] = '';
    if (!map[py].includes(ch)) map[py] += ch;
  }

  const sorted = Object.keys(map).sort();
  const entries = sorted.map(py =>
    JSON.stringify(py) + ':' + JSON.stringify(map[py])
  );

  const output = 'var PINYIN_MAP = {' + entries.join(',') + '};';
  const totalChars = sorted.reduce((s, k) => s + map[k].length, 0);

  fs.writeFileSync('pinyin-data.js', output, 'utf8');
  console.error('Total keys:', sorted.length, 'Total chars:', totalChars);
}

main();
