/**
 * Tizen build for the 2017 Samsung TV (Tizen 3.0 / AppleWebKit 538.1).
 *
 * That webview is ES5-only: `let`/`const`/`class` throw outside strict mode and
 * `async`/`await`, arrow functions and optional chaining are unsupported. This
 * script transpiles the ES6 app in index.html down to ES5 (Babel + regenerator)
 * and writes the result to www/index.html, which `tizen package` bundles.
 *
 * Optional: if tv-config.local.json (gitignored) exists with { apiKey, folderId },
 * those credentials are baked in and the app auto-starts the slideshow, skipping
 * the on-screen setup form (which is impractical on a TV remote).
 *
 * Usage:
 *   node build-tizen.js            # production build
 *   node build-tizen.js --debug    # also POST console/errors to LOG_ENDPOINT
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'www', 'index.html');
const CONFIG = path.join(ROOT, 'tv-config.local.json');
const DEBUG = process.argv.indexOf('--debug') !== -1;
const LOG_ENDPOINT = process.env.TOTEMTV_LOG || 'http://10.0.0.17:8765/log';

let src = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

// ── Optional: bake in credentials + auto-launch ──
if (fs.existsSync(CONFIG)) {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  if (cfg.apiKey) src = src.replace("let apiKey = '';", "let apiKey = '" + cfg.apiKey + "';");
  if (cfg.folderId) src = src.replace("let folderId = '';", "let folderId = '" + cfg.folderId + "';");
  const reLaunch = /\/\/[^\n]*Auto-launch[^\n]*\n\s*if \(loadConfig\(\)\) \{[\s\S]*?\n    \}/;
  if (reLaunch.test(src)) src = src.replace(reLaunch, "    launch();");
  console.log('[build] baked in credentials + auto-launch');
} else {
  console.log('[build] no tv-config.local.json — using on-screen setup flow');
}

// ── Optional debug instrumentation (only with --debug) ──
if (DEBUG) {
  src = src.replace(
    "      try {\n        files = await fetchFiles();",
    "      try {\n        if(window.__post)window.__post('launch: fetching...');\n        files = await fetchFiles();\n        if(window.__post)window.__post('launch: got '+files.length+' files');"
  );
  src = src.replace(
    "      } catch (err) {\n        loadingScreen.style.display = 'none';",
    "      } catch (err) {\n        if(window.__post)window.__post('launch ERROR: '+(err&&err.message?err.message:err));\n        loadingScreen.style.display = 'none';"
  );
  // trace media display path
  src = src.replace(
    "      const file = files[currentIndex];\n      fileNameEl.textContent = file.name;",
    "      const file = files[currentIndex];\n      if(window.__post)window.__post('show #'+currentIndex+': '+file.name+' video='+isVideo(file));\n      fileNameEl.textContent = file.name;"
  );
  src = src.replace(
    "          img.addEventListener('load', () => {\n            fitImage(img, img.naturalWidth, img.naturalHeight);\n            mediaContainer.style.opacity = '1';\n            updateSidePanels(img.naturalWidth, img.naturalHeight);",
    "          img.addEventListener('load', () => {\n            if(window.__post)window.__post('IMG LOADED nat='+img.naturalWidth+'x'+img.naturalHeight);\n            fitImage(img, img.naturalWidth, img.naturalHeight);\n            mediaContainer.style.opacity = '1';\n            if(window.__post){var mc=document.getElementById('media-container');window.__post('FITTED disp='+img.clientWidth+'x'+img.clientHeight+' container='+mc.clientWidth+'x'+mc.clientHeight+' opacity='+mc.style.opacity);}\n            updateSidePanels(img.naturalWidth, img.naturalHeight);"
  );
  src = src.replace(
    "          img.addEventListener('error', () => {\n            delete preloadCache[file.id];",
    "          img.addEventListener('error', () => {\n            if(window.__post)window.__post('IMG ERROR for '+file.name+' src='+img.src);\n            delete preloadCache[file.id];"
  );
}

// ── Extract the single inline app <script> ──
const m = src.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: inline <script> not found'); process.exit(1); }

// ── Transpile to ES5 ──
const out = babel.transform(m[1], {
  presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false, loose: true }]],
  sourceType: 'script', compact: false, babelrc: false, configFile: false,
});
const transpiled = out.code;
console.log('[build] transpiled ' + m[1].length + ' -> ' + transpiled.length + ' chars');
['async function', '=>', '?.'].forEach(function (tok) {
  if (transpiled.indexOf(tok) !== -1) console.warn('[build] WARN: ES6 token remains: ' + tok);
});

// ── regenerator-runtime (async/await support) ──
const regen = fs.readFileSync(require.resolve('regenerator-runtime/runtime.js'), 'utf8');

// ── Optional debug harness, injected first (pure ES5, always parses) ──
if (DEBUG) {
  const diag =
    "\n  <script>\n  (function(){\n" +
    "    var LOG='" + LOG_ENDPOINT + "';\n" +
    "    function post(m){try{var x=new XMLHttpRequest();x.open('POST',LOG,true);x.setRequestHeader('Content-Type','text/plain');x.send(String(m));}catch(e){}}\n" +
    "    window.__post=post; post('BOOT ua='+navigator.userAgent);\n" +
    "    window.onerror=function(m,s,l,c){post('JSERROR: '+m+' @ '+s+':'+l+':'+c);return false;};\n" +
    "    window.onunhandledrejection=function(e){post('UNHANDLED: '+(e&&e.reason?e.reason:e));};\n" +
    "  })();\n  </script>";
  src = src.replace('<head>', '<head>' + diag, 1);
}

// ── Replace ES6 app script with regenerator + transpiled ES5 ──
src = src.replace(m[0], '<script>\n' + regen + '\n</script>\n<script>\n' + transpiled + '\n</script>');

fs.writeFileSync(OUT, src, 'utf8');
console.log('[build] wrote ' + path.relative(ROOT, OUT) + ' (' + src.length + ' chars)' + (DEBUG ? ' [DEBUG]' : ''));
