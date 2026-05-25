/**
 * onepiece-nakama.com → episodes.json catalog builder
 *
 * Personal use only, with explicit permission from the site owners.
 *
 * Strategy:
 *   1. Use the WordPress REST API to list all posts (JSON, no browser rendering needed).
 *      Each page returns up to 100 posts. Iterate pages until empty.
 *   2. Filter posts whose title contains "פרק" (anime episodes), ignoring manga chapters.
 *   3. For each episode post, fetch its full rendered content and extract:
 *      - Drive links  (drive.google.com)
 *      - MEGA links   (mega.nz)
 *      - Holder links (upns.pro  — stored as DIRECT)
 *   4. Parse the episode number from the post title.
 *   5. Write tools/scrape-catalog/output/episodes.json, then copy to app/src/main/assets/.
 *
 * Rate limiting: 1 request / 1200 ms — polite crawling.
 * Resume support: if output/progress.json exists, skips already-fetched post IDs.
 *
 * Usage:
 *   cd tools/scrape-catalog
 *   npm install
 *   node index.js           # full run
 *   node index.js --resume  # resume after interruption
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL      = 'https://onepiece-nakama.com';
const API_BASE      = `${BASE_URL}/wp-json/wp/v2`;
const POSTS_PER_PAGE = 100;
const DELAY_MS      = 1200;          // ms between HTTP requests (polite rate limit)
const OUTPUT_DIR    = path.join(__dirname, 'output');
const OUTPUT_JSON   = path.join(OUTPUT_DIR, 'episodes.json');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');
const ASSETS_DEST   = path.join(__dirname, '../../app/src/main/assets/episodes.json');
const RESUME        = process.argv.includes('--resume');

// Global intro default (One Piece OP is ~90 s on most episodes).
const DEFAULT_INTRO_START_MS = 0;
const DEFAULT_INTRO_END_MS   = 90_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'onepiece-nakama-personal-catalog-builder/1.0 (private use)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
  return res.json();
}

/** Extract the numeric episode number from a Hebrew post title. */
function parseEpisodeNumber(title) {
  // Matches: "וואן פיס פרק 1163 מתורגם לעברית" → 1163
  const m = title.match(/פרק\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Extract all hrefs from rendered HTML that match a predicate. */
function extractLinks(html, predicate) {
  const results = [];
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (predicate(href)) results.push(href);
  }
  return [...new Set(results)]; // deduplicate
}

/** Determine the best (Drive > Holder > MEGA) source from a list of links. */
function pickSource(links) {
  const drive  = links.find(l => l.includes('drive.google.com'));
  const mega   = links.find(l => l.includes('mega.nz'));
  const holder = links.find(l => l.includes('upns.pro'));

  if (drive)  return { sourceUrl: drive,  sourceType: 'DRIVE' };
  if (holder) return { sourceUrl: holder, sourceType: 'DIRECT' };
  if (mega)   return { sourceUrl: mega,   sourceType: 'MEGA' };
  return null;
}

/** Load existing progress (list of already-processed post IDs). */
function loadProgress() {
  if (!RESUME || !fs.existsSync(PROGRESS_FILE)) return { done: new Set(), episodes: [] };
  const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  return { done: new Set(p.done), episodes: p.episodes };
}

function saveProgress(done, episodes) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ done: [...done], episodes }, null, 2));
}

// ── Phase 1: collect all episode posts via WP REST API ─────────────────────
async function collectPostList() {
  const posts = [];
  let page = 1;
  console.log('Phase 1: collecting post list from WP REST API…');
  while (true) {
    const url = `${API_BASE}/posts?per_page=${POSTS_PER_PAGE}&page=${page}&_fields=id,link,title,status&orderby=date&order=asc`;
    let batch;
    try {
      batch = await fetchJson(url);
    } catch (e) {
      // 400 means we've gone past the last page.
      if (e.message.startsWith('HTTP 400')) break;
      throw e;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const post of batch) {
      const raw = post.title?.rendered ?? '';
      // Decode HTML entities for Hebrew text.
      const title = raw.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
                       .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const num = parseEpisodeNumber(title);
      if (num !== null) {
        posts.push({ id: post.id, link: post.link, title, number: num });
      }
    }
    console.log(`  page ${page}: ${batch.length} posts (${posts.length} anime episodes so far)`);
    page++;
    await sleep(DELAY_MS);
  }
  // Sort by episode number ascending.
  posts.sort((a, b) => a.number - b.number);
  console.log(`Phase 1 done: ${posts.length} anime episode posts found.\n`);
  return posts;
}

// ── Phase 2: for each post, fetch full content and extract links ─────────────
async function processPost(post) {
  const url = `${API_BASE}/posts/${post.id}?_fields=id,content`;
  const data = await fetchJson(url);
  const html = data.content?.rendered ?? '';

  const allLinks = extractLinks(html, href =>
    href.includes('drive.google.com') ||
    href.includes('mega.nz') ||
    href.includes('upns.pro')
  );

  const source = pickSource(allLinks);
  if (!source) return null;

  // Also store the MEGA link separately so the app can fallback.
  const megaUrl = allLinks.find(l => l.includes('mega.nz'));

  return {
    id: `op-e${String(post.number).padStart(4, '0')}`,
    season: episodeToSeason(post.number),
    number: post.number,
    title: post.title,
    titleHe: post.title,
    arc: null,           // can be filled in manually later
    sourceUrl: source.sourceUrl,
    sourceType: source.sourceType,
    // If Drive is primary but MEGA also exists, store it for manual fallback.
    ...(source.sourceType === 'DRIVE' && megaUrl ? { fallbackMegaUrl: megaUrl } : {}),
    introStartMs: null,  // uses catalog default
    introEndMs: null,
    creditsStartMs: null,
    durationMs: null,
    thumbnailUrl: null,
    postUrl: post.link,
  };
}

/**
 * Very rough season mapping for One Piece anime seasons.
 * Each "season" on most streaming services corresponds to a major arc.
 * For simplicity we use blocks of 50 episodes. You can refine this manually.
 */
function episodeToSeason(ep) {
  if (ep <= 61)   return 1;  // East Blue
  if (ep <= 130)  return 2;  // Alabasta
  if (ep <= 195)  return 3;  // Skypiea / G-8
  if (ep <= 230)  return 4;  // Long Ring Long Land
  if (ep <= 325)  return 5;  // Water 7 / Enies Lobby
  if (ep <= 381)  return 6;  // Thriller Bark
  if (ep <= 516)  return 7;  // Summit War
  if (ep <= 578)  return 8;  // Fishman Island
  if (ep <= 654)  return 9;  // Punk Hazard
  if (ep <= 746)  return 10; // Dressrosa
  if (ep <= 782)  return 11; // Zou
  if (ep <= 877)  return 12; // Whole Cake Island
  if (ep <= 1085) return 13; // Wano
  return 14;                 // Egghead +
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { done, episodes: existingEpisodes } = loadProgress();
  if (RESUME && existingEpisodes.length > 0) {
    console.log(`Resuming: ${existingEpisodes.length} episodes already processed, ${done.size} post IDs skipped.\n`);
  }

  const posts = await collectPostList();
  const pending = posts.filter(p => !done.has(p.id));
  console.log(`Phase 2: processing ${pending.length} episode pages (${DELAY_MS}ms between requests)…`);
  console.log(`Estimated time: ~${Math.round(pending.length * DELAY_MS / 60_000)} minutes\n`);

  const episodes = [...existingEpisodes];
  let fetched = 0;

  for (const post of pending) {
    try {
      const ep = await processPost(post);
      if (ep) {
        episodes.push(ep);
        console.log(`  ✓ ep${post.number.toString().padStart(4, ' ')} – ${ep.sourceType}`);
      } else {
        console.log(`  ✗ ep${post.number.toString().padStart(4, ' ')} – no video links found`);
      }
      done.add(post.id);
    } catch (e) {
      console.error(`  ✗ ep${post.number} – ERROR: ${e.message}`);
    }

    fetched++;
    // Save progress every 50 episodes in case of interruption.
    if (fetched % 50 === 0) {
      saveProgress(done, episodes);
      console.log(`  [Progress saved: ${episodes.length} episodes]`);
    }

    await sleep(DELAY_MS);
  }

  // Sort and deduplicate by episode number.
  const seen = new Set();
  const unique = episodes
    .filter(e => { if (seen.has(e.number)) return false; seen.add(e.number); return true; })
    .sort((a, b) => a.number - b.number);

  const catalog = {
    version: 1,
    updatedAt: Date.now(),
    defaults: {
      introStartMs: DEFAULT_INTRO_START_MS,
      introEndMs: DEFAULT_INTRO_END_MS,
      creditsStartMs: null,
    },
    episodes: unique,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`\n✅ Wrote ${unique.length} episodes to ${OUTPUT_JSON}`);

  // Copy to Android assets folder.
  try {
    fs.copyFileSync(OUTPUT_JSON, ASSETS_DEST);
    console.log(`✅ Copied to ${ASSETS_DEST}`);
  } catch {
    console.warn(`⚠️  Could not copy to assets (path not found). Copy manually:\n   ${OUTPUT_JSON}\n → ${ASSETS_DEST}`);
  }

  saveProgress(done, unique);
  console.log('\nDone! Review output/episodes.json and fill in missing arc names if desired.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
