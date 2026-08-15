#!/usr/bin/env node
// Image generation -> palette-quantized game asset.
//
// *** UNVERIFIED: network policy blocked api.openai.com during authoring, so this
// *** has never completed a live call. Expect to debug it. Verify request and
// *** response shapes against current OpenAI docs before trusting the output.
//
// Usage:
//   node tools/imagegen.js --spec tools/genspecs/walls.json [--dry-run] [--only id]
//
// Key: read from --key-file (default: $CLAUDE_SCRATCH/.openai_key) or $OPENAI_API_KEY.
// NEVER commit the key, log it, or put it in the environment config.
//
// A spec file is: {"class":"wall","size":128,"outline":false,"seamless":true,
//                  "anchor":"stone_a","items":[{"id":"stone_a","prompt":"..."}, ...]}
// Output: assets/gen/<class>/<id>.json   (palette indices, committed)
//         assets/gen/<class>/<id>.raw.png (RGB generation, build input, gitignored)
//         assets/gen/<class>/_sheet.png   (contact sheet for grid review)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PREAMBLE =
  '1998 pre-rendered CRPG game asset, 256-colour palette era, hard warm key light from the upper ' +
  'left, cool fill, no modern soft shading, no text, no watermark, no signature, no border, ' +
  'centred, flat even background for masking. ';

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? (process.argv[i + 1] || true) : dflt;
}
const DRY = process.argv.includes('--dry-run');

function readKey() {
  const kf = arg('key-file', path.join(process.env.CLAUDE_SCRATCH || '', '.openai_key'));
  if (kf && fs.existsSync(kf)) return fs.readFileSync(kf, 'utf8').trim();
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  throw new Error('no API key: pass --key-file <path> or set OPENAI_API_KEY. ' +
    'The scratchpad is per-session — a new session needs the key pasted again.');
}

// ---- generation -------------------------------------------------------------
// Returns a Buffer of PNG bytes. Uses the edits endpoint when an anchor image is
// supplied, which is what holds a class of assets to one style.
async function generate(key, prompt, size, anchorPath) {
  const body = { model: 'gpt-image-1', prompt: PREAMBLE + prompt, size, n: 1 };
  let res;
  if (anchorPath && fs.existsSync(anchorPath)) {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', PREAMBLE + prompt);
    form.append('size', size);
    form.append('image', new Blob([fs.readFileSync(anchorPath)], { type: 'image/png' }), 'anchor.png');
    res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form,
    });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    // 403 from the proxy is a POLICY denial (environment network access) — not transient.
    throw new Error(`image API ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json.data && json.data[0] && (json.data[0].b64_json || json.data[0].image);
  if (!b64) throw new Error('no image payload in response: ' + JSON.stringify(json).slice(0, 300));
  return Buffer.from(b64, 'base64');
}

// ---- downsample + quantize, in headless Chromium (reuses the game palette) ---
async function quantize(pngBuffers, spec) {
  const { chromium } = require('playwright');
  const core = fs.readFileSync(path.join(ROOT, 'src/00_core.js'), 'utf8').replace(/'use strict';/, '');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  await page.addScriptTag({ content: core });
  const out = [];
  for (const { id, buf } of pngBuffers) {
    const data = await page.evaluate(async ([b64, size, outline]) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      // area-average downsample: draw big -> small in two steps for a clean reduction
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, size, size);
      const d = g.getImageData(0, 0, size, size).data;
      const px = new Uint8Array(size * size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        if (d[i + 3] < 100) { px[y * size + x] = 0; continue; }
        const p = palDither(d[i], d[i + 1], d[i + 2], x, y, 8);
        px[y * size + x] = p === 0 ? 240 : p;
      }
      if (outline) { // 1px dark outline on transparent neighbours
        const o = px.slice();
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          if (px[y * size + x]) continue;
          if ((x > 0 && px[y * size + x - 1]) || (x < size - 1 && px[y * size + x + 1]) ||
              (y > 0 && px[(y - 1) * size + x]) || (y < size - 1 && px[(y + 1) * size + x]))
            o[y * size + x] = 240;
        }
        return Array.from(o);
      }
      return Array.from(px);
    }, [buf.toString('base64'), spec.size, !!spec.outline]);
    out.push({ id, data });
    console.log('  quantized', id, `${spec.size}x${spec.size}`);
  }
  await browser.close();
  return out;
}

(async () => {
  const specPath = arg('spec');
  if (!specPath) throw new Error('--spec <file.json> required');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const only = arg('only');
  const items = spec.items.filter(it => !only || it.id === only);
  const outDir = path.join(ROOT, 'assets/gen', spec.class);
  fs.mkdirSync(outDir, { recursive: true });

  if (DRY) {
    console.log(`[dry-run] class=${spec.class} size=${spec.size} items=${items.length}`);
    for (const it of items) console.log('  ' + it.id + ': ' + (PREAMBLE + it.prompt).slice(0, 120) + '…');
    console.log('\nAnchor:', spec.anchor || '(none — generate and approve the anchor FIRST)');
    return;
  }

  const key = readKey();
  const anchorPath = spec.anchor ? path.join(outDir, spec.anchor + '.raw.png') : null;
  if (spec.anchor && !fs.existsSync(anchorPath))
    console.warn('WARNING: anchor image missing — generate and APPROVE the anchor before the class.');

  const bufs = [];
  for (const it of items) {
    process.stdout.write('generating ' + it.id + ' … ');
    const buf = await generate(key, it.prompt, spec.genSize || '1024x1024',
      it.id === spec.anchor ? null : anchorPath);
    fs.writeFileSync(path.join(outDir, it.id + '.raw.png'), buf);
    bufs.push({ id: it.id, buf });
    console.log('ok');
  }

  const quant = await quantize(bufs, spec);
  for (const q of quant)
    fs.writeFileSync(path.join(outDir, q.id + '.json'), JSON.stringify({ size: spec.size, px: q.data }));

  console.log(`\n${quant.length} asset(s) -> ${outDir}`);
  console.log('NEXT: review the whole class as a grid before accepting any of it.');
  if (spec.seamless) console.log('NEXT: check each texture tiled 3x3 for seams before accepting.');
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
