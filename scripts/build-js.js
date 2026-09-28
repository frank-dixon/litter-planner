#!/usr/bin/env node
/**
 * Minify src/js → docs/js so a fresh clone can open docs/index.html.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src', 'js');
const outDir = path.join(root, 'docs', 'js');

const ENTRIES = [
  'schedule.js',
  'sample-fixture.js',
  'storage.js',
  'auth.js',
  'app.js',
];

async function buildOne(file) {
  const entry = path.join(srcDir, file);
  if (!fs.existsSync(entry)) {
    console.warn('skip missing', file);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [entry],
    outfile: path.join(outDir, file),
    bundle: false,
    minify: true,
    target: ['es2018'],
    legalComments: 'none',
    logLevel: 'silent',
  });
  const kb = (fs.statSync(path.join(outDir, file)).size / 1024).toFixed(1);
  console.log('minified', file, '→', 'docs/js/' + file, `(${kb} KB)`);
}

async function buildAll() {
  for (const f of ENTRIES) await buildOne(f);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
