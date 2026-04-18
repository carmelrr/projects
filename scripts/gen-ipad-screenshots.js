#!/usr/bin/env node
/**
 * Generates iPad 13" App Store screenshots (2048 × 2732 px)
 * Re-uses the same screen designs from the iPhone screenshots.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const W = 2048;
const H = 2732;
const OUT = path.resolve(__dirname, '..', 'assets', 'store-listing', 'ios-ipad');

const brand = {
  bg: '#f5f0ff', card: '#ffffff',
  violet500: '#7c3aed', violet600: '#6d28d9', violet700: '#5b21b6', violet800: '#4c1d95',
  amber500: '#f59e0b', green500: '#22c55e', green600: '#16a34a',
  blue500: '#3b82f6', red500: '#ef4444',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray900: '#111827', white: '#ffffff',
};

const baseCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: ${W}px; height: ${H}px;
    font-family: 'Inter', -apple-system, sans-serif;
    background: linear-gradient(170deg, ${brand.violet600} 0%, ${brand.violet800} 50%, #1e1044 100%);
    display: flex; flex-direction: column; align-items: center;
    overflow: hidden;
  }
  .headline {
    color: #fff; text-align: center;
    margin-top: 100px; margin-bottom: 50px;
    padding: 0 120px;
  }
  .headline h1 { font-size: 84px; font-weight: 800; line-height: 1.15; letter-spacing: -1px; }
  .headline p { font-size: 42px; font-weight: 400; color: rgba(255,255,255,0.75); margin-top: 20px; line-height: 1.4; }
  .tablet {
    width: 1700px;
    background: #000; border-radius: 48px;
    padding: 14px;
    box-shadow: 0 60px 120px rgba(0,0,0,0.5);
    flex: 1; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .screen {
    flex: 1; background: ${brand.bg}; border-radius: 36px;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .status-bar {
    height: 70px; padding: 20px 40px 0;
    display: flex; justify-content: space-between; align-items: center;
    color: ${brand.gray900}; font-size: 26px; font-weight: 600;
  }
  .status-icons { display:flex; gap:12px; align-items:center; font-size:22px; }
  .content { flex: 1; padding: 30px 50px; overflow: hidden; }
  .tab-bar {
    height: 110px; background: ${brand.white};
    border-top: 2px solid ${brand.gray200};
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 40px 20px;
  }
  .tab { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .tab-emoji { font-size: 36px; }
  .tab-label { font-size: 20px; color: ${brand.gray400}; font-weight: 500; }
  .tab.active .tab-label { color: ${brand.violet600}; font-weight: 600; }
  .card {
    background: ${brand.white}; border-radius: 20px;
    padding: 28px; margin-bottom: 20px;
    border: 2px solid ${brand.gray200};
  }
  .card-title { font-size: 30px; font-weight: 700; color: ${brand.gray900}; margin-bottom: 6px; }
  .badge { display: inline-block; padding: 5px 16px; border-radius: 50px; font-size: 20px; font-weight: 600; color: #fff; }
  .greeting { font-size: 40px; font-weight: 700; color: ${brand.gray900}; margin-bottom: 6px; }
  .date-text { font-size: 26px; color: ${brand.gray500}; margin-bottom: 28px; }
  .section-title { font-size: 28px; font-weight: 700; color: ${brand.gray700}; margin-bottom: 16px; }
`;

function tabBar(active) {
  const tabs = [
    { emoji: '📋', label: 'Today' }, { emoji: '📊', label: 'Metrics' },
    { emoji: '🌱', label: 'Habits' }, { emoji: '💬', label: 'Messages' },
    { emoji: '🔔', label: 'Alerts' }, { emoji: '👤', label: 'Profile' },
  ];
  return `<div class="tab-bar">${tabs.map(t =>
    `<div class="tab ${t.label === active ? 'active' : ''}">
      <span class="tab-emoji">${t.emoji}</span>
      <span class="tab-label">${t.label}</span>
    </div>`).join('')}</div>`;
}

function statusBar() {
  return `<div class="status-bar"><span>9:41</span><div class="status-icons"><span>📶</span><span>🔋</span></div></div>`;
}

const screenshots = [
  {
    name: '01-today',
    headline: 'Your Daily<br>Workout Plan',
    sub: 'See today\'s workouts at a glance',
    activeTab: 'Today',
    html: () => `<div class="content">
      <div class="greeting">Good morning, Alex 👋</div>
      <div class="date-text">Friday, April 18</div>
      <div class="section-title">Today's Workouts</div>
      <div style="display:flex; gap:24px;">
        <div class="card" style="flex:1; border-color:#bfdbfe; background:#eff6ff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span class="card-title" style="margin:0;">Upper Body Strength</span>
            <span class="badge" style="background:${brand.blue500};">Scheduled</span>
          </div>
          <div style="display:flex; gap:14px; font-size:24px; color:${brand.gray500};">
            <span>6 exercises</span><span>·</span><span>45 min</span><span>·</span><span>Strength</span>
          </div>
          <div style="margin-top:16px; background:${brand.violet600}; color:#fff; border-radius:14px; padding:16px; text-align:center; font-size:28px; font-weight:700;">Start Workout →</div>
        </div>
        <div class="card" style="flex:1; border-color:#bbf7d0; background:#f0fdf4;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span class="card-title" style="margin:0;">Morning Mobility</span>
            <span class="badge" style="background:${brand.green600};">Completed</span>
          </div>
          <div style="display:flex; gap:14px; font-size:24px; color:${brand.gray500};">
            <span>8 exercises</span><span>·</span><span>20 min</span><span>·</span><span>Mobility</span>
          </div>
        </div>
      </div>
      <div class="card" style="border-color:${brand.gray200};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span class="card-title" style="margin:0;">Evening HIIT</span>
          <span class="badge" style="background:${brand.gray400};">6:00 PM</span>
        </div>
        <div style="display:flex; gap:14px; font-size:24px; color:${brand.gray500};">
          <span>10 exercises</span><span>·</span><span>30 min</span><span>·</span><span>HIIT</span>
        </div>
      </div>
    </div>`,
  },
  {
    name: '02-metrics',
    headline: 'Track Your<br>Progress',
    sub: 'Custom metrics with visual charts',
    activeTab: 'Metrics',
    html: () => `<div class="content">
      <div class="greeting">Metrics</div>
      <div class="date-text">Track what matters to you</div>
      <div style="display:flex; gap:24px;">
        <div class="card" style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div><div class="card-title">Body Weight</div><div style="font-size:44px; font-weight:800; color:${brand.violet600};">82.5 <span style="font-size:26px; color:${brand.gray400};">kg</span></div></div>
            <div style="background:${brand.green500}20; color:${brand.green600}; padding:6px 18px; border-radius:50px; font-size:24px; font-weight:600;">↓ 1.2 kg</div>
          </div>
          <svg viewBox="0 0 800 200" style="width:100%; height:100px;">
            <polyline points="0,180 100,160 200,150 300,130 400,120 500,100 600,85 700,70 800,60" fill="none" stroke="${brand.violet600}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="800" cy="60" r="10" fill="${brand.violet600}"/>
          </svg>
        </div>
        <div class="card" style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div><div class="card-title">Bench Press 1RM</div><div style="font-size:44px; font-weight:800; color:${brand.amber500};">105 <span style="font-size:26px; color:${brand.gray400};">kg</span></div></div>
            <div style="background:${brand.green500}20; color:${brand.green600}; padding:6px 18px; border-radius:50px; font-size:24px; font-weight:600;">↑ 5 kg</div>
          </div>
          <svg viewBox="0 0 800 200" style="width:100%; height:100px;">
            <polyline points="0,170 100,165 200,150 300,140 400,120 500,110 600,90 700,75 800,50" fill="none" stroke="${brand.amber500}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="800" cy="50" r="10" fill="${brand.amber500}"/>
          </svg>
        </div>
      </div>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><div class="card-title">Sleep Quality</div><div style="font-size:44px; font-weight:800; color:${brand.blue500};">8.2 <span style="font-size:26px; color:${brand.gray400};">hrs</span></div></div>
          <div style="background:${brand.green500}20; color:${brand.green600}; padding:6px 18px; border-radius:50px; font-size:24px; font-weight:600;">↑ 0.5 hr</div>
        </div>
      </div>
    </div>`,
  },
  {
    name: '03-habits',
    headline: 'Build Better<br>Habits Daily',
    sub: 'Stay consistent, stay accountable',
    activeTab: 'Habits',
    html: () => {
      const habits = [
        { name: '💧 Drink 3L Water', target: '3L', current: '2.1L', pct: 70, done: false },
        { name: '🧘 Morning Stretch', target: null, current: null, pct: 100, done: true },
        { name: '💊 Take Creatine', target: null, current: null, pct: 100, done: true },
        { name: '📖 Read 20 minutes', target: '20 min', current: '20 min', pct: 100, done: true },
        { name: '🚶 10,000 Steps', target: '10,000', current: '7,450', pct: 74, done: false },
      ];
      return `<div class="content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
          <div><div class="greeting">Habits</div><div class="date-text">Friday, April 18</div></div>
          <div style="background:${brand.violet600}; color:#fff; border-radius:18px; padding:14px 24px; font-size:30px; font-weight:700;">3/5</div>
        </div>
        ${habits.map(h => `
          <div style="background:${h.done ? '#f0fdf4' : brand.white}; border:2px solid ${h.done ? '#bbf7d0' : brand.gray200}; border-radius:18px; padding:22px 26px; margin-bottom:14px; display:flex; align-items:center; gap:20px;">
            <div style="flex:1;">
              <div style="font-size:28px; font-weight:600; color:${h.done ? brand.green600 : brand.gray900}; ${h.done ? 'text-decoration:line-through;' : ''}">${h.name}</div>
              ${h.target ? `<div style="margin-top:8px;"><div style="background:${brand.gray200}; border-radius:50px; height:12px; overflow:hidden;"><div style="background:${h.done ? brand.green500 : brand.violet600}; height:100%; width:${h.pct}%; border-radius:50px;"></div></div><div style="font-size:20px; color:${brand.gray500}; margin-top:4px;">${h.current} / ${h.target}</div></div>` : ''}
            </div>
            <div style="width:54px; height:54px; border-radius:50%; background:${h.done ? brand.green500 : brand.white}; border:3px solid ${h.done ? brand.green500 : brand.gray200}; display:flex; align-items:center; justify-content:center; font-size:26px; color:#fff; font-weight:700;">${h.done ? '✓' : ''}</div>
          </div>`).join('')}
      </div>`;
    },
  },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  for (const shot of screenshots) {
    console.log(`  Rendering ${shot.name}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
      <div class="headline"><h1>${shot.headline}</h1><p>${shot.sub}</p></div>
      <div class="tablet"><div class="screen">
        ${statusBar()}${shot.html()}${shot.activeTab ? tabBar(shot.activeTab) : ''}
      </div></div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ Generated ${screenshots.length} iPad screenshots in ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
