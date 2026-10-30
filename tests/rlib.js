const fs = require('fs'), path = require('path');
const NM = '/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/node_modules/', F = NM + '@fontsource/';
const face = (fam, dir, w, st) => `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:block;src:url(https://fonts.gstatic.com/local/${dir}/${dir}-latin-${w}-${st}.woff2) format('woff2')}`;
const CSS = [['Manrope', 'manrope', [400, 500, 600, 700, 800], ['normal']], ['Cormorant Garamond', 'cormorant-garamond', [500, 600, 700], ['normal', 'italic']], ['Figtree', 'figtree', [400, 500, 600, 700, 800], ['normal']], ['Cinzel', 'cinzel', [600, 700], ['normal']]]
  .flatMap(([fam, dir, ws, sts]) => ws.flatMap(w => sts.map(st => face(fam, dir, w, st)))).join('\n');
exports.FILE = process.env.PV || 'file:///home/claude/work/midnight/fta-command-centre-preview.html';
exports.setup = async p => {
  await p.route(/html2canvas/, r => r.fulfill({ body: fs.readFileSync(NM + 'html2canvas/dist/html2canvas.min.js'), contentType: 'text/javascript' }));
  await p.route(/qrcode/, r => r.fulfill({ body: fs.readFileSync(NM + 'qrcode-generator/qrcode.js'), contentType: 'text/javascript' }));
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ body: CSS, contentType: 'text/css' }));
  await p.route(/fonts\.gstatic\.com\/local\//, r => { const u = new URL(r.request().url()).pathname.split('/'); const dir = u[2], file = u[3]; const fp = F + dir + '/files/' + file; if (fs.existsSync(fp)) r.fulfill({ body: fs.readFileSync(fp), contentType: 'font/woff2' }); else r.abort(); });
  await p.route(/fonts\.gstatic\.com\/s\//, r => r.abort());
};
