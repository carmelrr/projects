#!/usr/bin/env node
/**
 * Generates App Store screenshots (1284×2778 px — iPhone 6.7")
 * using Puppeteer to render HTML templates.
 *
 * Usage:  node scripts/gen-appstore-screenshots.js
 * Output: assets/store-listing/ios/
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const W = 1284;
const H = 2778;
const OUT = path.resolve(__dirname, '..', 'assets', 'store-listing', 'ios');

// ── Brand tokens ───────────────────────────────────────────────────────────
const brand = {
  bg: '#f5f0ff',        // light violet bg
  card: '#ffffff',
  violet500: '#7c3aed',
  violet600: '#6d28d9',
  violet700: '#5b21b6',
  violet800: '#4c1d95',
  amber500: '#f59e0b',
  green500: '#22c55e',
  green600: '#16a34a',
  blue500: '#3b82f6',
  red500: '#ef4444',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
};

// ── Shared CSS ─────────────────────────────────────────────────────────────
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
    margin-top: 120px; margin-bottom: 60px;
    padding: 0 80px;
  }
  .headline h1 {
    font-size: 72px; font-weight: 800; line-height: 1.15;
    letter-spacing: -1px;
  }
  .headline p {
    font-size: 38px; font-weight: 400; color: rgba(255,255,255,0.75);
    margin-top: 20px; line-height: 1.4;
  }
  .phone {
    width: 1020px; 
    background: #000; border-radius: 72px;
    padding: 18px;
    box-shadow: 0 60px 120px rgba(0,0,0,0.5);
    flex: 1; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .screen {
    flex: 1; background: ${brand.bg}; border-radius: 56px;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .status-bar {
    height: 88px; padding: 30px 50px 0;
    display: flex; justify-content: space-between; align-items: center;
    color: ${brand.gray900}; font-size: 28px; font-weight: 600;
  }
  .status-icons { display:flex; gap:12px; align-items:center; font-size:24px; }
  .notch {
    width: 240px; height: 60px; background: #000;
    border-radius: 0 0 30px 30px; margin: -58px auto 0; position: relative; z-index: 10;
  }
  .content { flex: 1; padding: 30px 40px; overflow: hidden; }
  .tab-bar {
    height: 140px; background: ${brand.white};
    border-top: 2px solid ${brand.gray200};
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 20px 30px;
  }
  .tab { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .tab-emoji { font-size: 42px; }
  .tab-label { font-size: 22px; color: ${brand.gray400}; font-weight: 500; }
  .tab.active .tab-label { color: ${brand.violet600}; font-weight: 600; }

  /* ── Card primitives ── */
  .card {
    background: ${brand.white}; border-radius: 24px;
    padding: 32px; margin-bottom: 24px;
    border: 2px solid ${brand.gray200};
  }
  .card-title { font-size: 34px; font-weight: 700; color: ${brand.gray900}; margin-bottom: 8px; }
  .card-subtitle { font-size: 26px; color: ${brand.gray500}; }
  .badge {
    display: inline-block; padding: 6px 18px; border-radius: 50px;
    font-size: 22px; font-weight: 600; color: #fff;
  }
  .greeting { font-size: 44px; font-weight: 700; color: ${brand.gray900}; margin-bottom: 8px; }
  .date-text { font-size: 28px; color: ${brand.gray500}; margin-bottom: 32px; }
  .section-title { font-size: 30px; font-weight: 700; color: ${brand.gray700}; margin-bottom: 20px; }
`;

// ── Tab bar HTML helper ────────────────────────────────────────────────────
function tabBar(active) {
  const tabs = [
    { emoji: '📋', label: 'Today' },
    { emoji: '📊', label: 'Metrics' },
    { emoji: '🌱', label: 'Habits' },
    { emoji: '💬', label: 'Messages' },
    { emoji: '🔔', label: 'Alerts' },
    { emoji: '👤', label: 'Profile' },
  ];
  return `<div class="tab-bar">${tabs
    .map(
      (t) =>
        `<div class="tab ${t.label === active ? 'active' : ''}">
          <span class="tab-emoji">${t.emoji}</span>
          <span class="tab-label">${t.label}</span>
        </div>`
    )
    .join('')}</div>`;
}

function statusBar() {
  return `
    <div class="status-bar">
      <span>9:41</span>
      <div class="status-icons">
        <span>📶</span><span>🔋</span>
      </div>
    </div>
    <div class="notch"></div>`;
}

// ── Screenshots ────────────────────────────────────────────────────────────

const screenshots = [
  {
    name: '01-today',
    headline: 'Your Daily\nWorkout Plan',
    sub: 'See today\'s workouts at a glance',
    html: () => `
      <div class="content">
        <div class="greeting">Good morning, Alex 👋</div>
        <div class="date-text">Friday, April 18</div>
        <div class="section-title">Today's Workouts</div>

        <div class="card" style="border-color: #bfdbfe; background: #eff6ff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="card-title" style="margin:0;">Upper Body Strength</span>
            <span class="badge" style="background:${brand.blue500};">Scheduled</span>
          </div>
          <div style="display:flex; gap:16px; font-size:26px; color:${brand.gray500};">
            <span>6 exercises</span><span>·</span><span>45 min</span><span>·</span><span>Strength</span>
          </div>
          <div style="margin-top:20px; background:${brand.violet600}; color:#fff; border-radius:16px; padding:18px; text-align:center; font-size:30px; font-weight:700;">
            Start Workout →
          </div>
        </div>

        <div class="card" style="border-color: #bbf7d0; background: #f0fdf4;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="card-title" style="margin:0;">Morning Mobility</span>
            <span class="badge" style="background:${brand.green600};">Completed</span>
          </div>
          <div style="display:flex; gap:16px; font-size:26px; color:${brand.gray500};">
            <span>8 exercises</span><span>·</span><span>20 min</span><span>·</span><span>Mobility</span>
          </div>
        </div>

        <div class="card" style="border-color: ${brand.gray200};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="card-title" style="margin:0;">Evening HIIT</span>
            <span class="badge" style="background:${brand.gray400};">6:00 PM</span>
          </div>
          <div style="display:flex; gap:16px; font-size:26px; color:${brand.gray500};">
            <span>10 exercises</span><span>·</span><span>30 min</span><span>·</span><span>HIIT</span>
          </div>
        </div>
      </div>
    `,
    activeTab: 'Today',
  },
  {
    name: '02-log-workout',
    headline: 'Log Every\nSet & Rep',
    sub: 'Track your progress in real-time',
    html: () => `
      <div class="content" style="background: #fff; border-radius: 0;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:32px;">
          <span style="font-size:32px;">← Back</span>
          <span style="font-size:36px; font-weight:700; color:${brand.gray900};">Upper Body Strength</span>
          <span style="font-size:28px; color:${brand.violet600}; font-weight:600;">Save</span>
        </div>

        <div style="background:${brand.gray100}; border-radius:20px; padding:28px; margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px;">
            <div style="width:80px; height:80px; background:${brand.violet600}; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:32px; font-weight:700;">A1</div>
            <div>
              <div style="font-size:32px; font-weight:700; color:${brand.gray900};">Bench Press</div>
              <div style="font-size:24px; color:${brand.gray500};">Barbell · Chest</div>
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <tr style="font-size:24px; color:${brand.gray400}; text-align:left;">
              <th style="padding:8px 0; width:80px;">Set</th>
              <th style="padding:8px 0;">Target</th>
              <th style="padding:8px 0;">Weight</th>
              <th style="padding:8px 0;">Reps</th>
              <th style="padding:8px 0; width:60px;">✓</th>
            </tr>
            ${[1, 2, 3, 4]
              .map(
                (s, i) => `
              <tr style="font-size:28px; color:${brand.gray900}; border-top:2px solid ${brand.gray200};">
                <td style="padding:16px 0; font-weight:600;">${s}</td>
                <td style="padding:16px 0;">8 × 80kg</td>
                <td style="padding:16px 0;">${i < 2 ? '80' : ''}</td>
                <td style="padding:16px 0;">${i < 2 ? '8' : ''}</td>
                <td style="padding:16px 0;">${
                  i < 2
                    ? `<span style="width:44px;height:44px;background:${brand.green500};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:24px;">✓</span>`
                    : `<span style="width:44px;height:44px;border:3px solid ${brand.gray200};border-radius:50%;display:inline-block;"></span>`
                }</td>
              </tr>`
              )
              .join('')}
          </table>
        </div>

        <div style="background:${brand.gray100}; border-radius:20px; padding:28px; margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:20px;">
            <div style="width:80px; height:80px; background:${brand.violet600}; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:32px; font-weight:700;">A2</div>
            <div>
              <div style="font-size:32px; font-weight:700; color:${brand.gray900};">Bent-Over Row</div>
              <div style="font-size:24px; color:${brand.gray500};">Barbell · Back</div>
            </div>
          </div>
        </div>
      </div>
    `,
    activeTab: null,
  },
  {
    name: '03-metrics',
    headline: 'Track Your\nProgress',
    sub: 'Custom metrics with visual charts',
    html: () => `
      <div class="content">
        <div class="greeting">Metrics</div>
        <div class="date-text">Track what matters to you</div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <div class="card-title">Body Weight</div>
              <div style="font-size:48px; font-weight:800; color:${brand.violet600};">82.5 <span style="font-size:28px; color:${brand.gray400};">kg</span></div>
            </div>
            <div style="background:${brand.green500}20; color:${brand.green600}; padding:8px 20px; border-radius:50px; font-size:26px; font-weight:600;">↓ 1.2 kg</div>
          </div>
          <svg viewBox="0 0 800 200" style="width:100%; height:120px;">
            <polyline points="0,180 100,160 200,150 300,130 400,120 500,100 600,85 700,70 800,60" fill="none" stroke="${brand.violet600}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="0,180 100,160 200,150 300,130 400,120 500,100 600,85 700,70 800,60" fill="url(#grad)" stroke="none"/>
            <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${brand.violet600}" stop-opacity="0.3"/><stop offset="100%" stop-color="${brand.violet600}" stop-opacity="0"/></linearGradient></defs>
            <circle cx="800" cy="60" r="10" fill="${brand.violet600}"/>
          </svg>
        </div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <div class="card-title">Bench Press 1RM</div>
              <div style="font-size:48px; font-weight:800; color:${brand.amber500};">105 <span style="font-size:28px; color:${brand.gray400};">kg</span></div>
            </div>
            <div style="background:${brand.green500}20; color:${brand.green600}; padding:8px 20px; border-radius:50px; font-size:26px; font-weight:600;">↑ 5 kg</div>
          </div>
          <svg viewBox="0 0 800 200" style="width:100%; height:120px;">
            <polyline points="0,170 100,165 200,150 300,140 400,120 500,110 600,90 700,75 800,50" fill="none" stroke="${brand.amber500}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="800" cy="50" r="10" fill="${brand.amber500}"/>
          </svg>
        </div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="card-title">Sleep Quality</div>
              <div style="font-size:48px; font-weight:800; color:${brand.blue500};">8.2 <span style="font-size:28px; color:${brand.gray400};">hrs</span></div>
            </div>
            <div style="background:${brand.green500}20; color:${brand.green600}; padding:8px 20px; border-radius:50px; font-size:26px; font-weight:600;">↑ 0.5 hr</div>
          </div>
        </div>
      </div>
    `,
    activeTab: 'Metrics',
  },
  {
    name: '04-habits',
    headline: 'Build Better\nHabits Daily',
    sub: 'Stay consistent, stay accountable',
    html: () => {
      const habits = [
        { name: '💧 Drink 3L Water', target: '3L', current: '2.1L', pct: 70, done: false },
        { name: '🧘 Morning Stretch', target: null, current: null, pct: 100, done: true },
        { name: '💊 Take Creatine', target: null, current: null, pct: 100, done: true },
        { name: '📖 Read 20 minutes', target: '20 min', current: '20 min', pct: 100, done: true },
        { name: '🚶 10,000 Steps', target: '10,000', current: '7,450', pct: 74, done: false },
        { name: '🥗 Eat 5 Servings Veggies', target: '5', current: '3', pct: 60, done: false },
      ];
      return `
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <div>
              <div class="greeting">Habits</div>
              <div class="date-text">Friday, April 18</div>
            </div>
            <div style="background:${brand.violet600}; color:#fff; border-radius:20px; padding:16px 28px; font-size:32px; font-weight:700;">
              4/6
            </div>
          </div>
          ${habits
            .map(
              (h) => `
            <div style="background:${h.done ? '#f0fdf4' : brand.white}; border:2px solid ${h.done ? '#bbf7d0' : brand.gray200}; border-radius:20px; padding:24px 28px; margin-bottom:16px; display:flex; align-items:center; gap:24px;">
              <div style="flex:1;">
                <div style="font-size:30px; font-weight:600; color:${h.done ? brand.green600 : brand.gray900}; ${h.done ? 'text-decoration:line-through;' : ''}">${h.name}</div>
                ${
                  h.target
                    ? `<div style="margin-top:10px;">
                    <div style="background:${brand.gray200}; border-radius:50px; height:14px; overflow:hidden;">
                      <div style="background:${h.done ? brand.green500 : brand.violet600}; height:100%; width:${h.pct}%; border-radius:50px;"></div>
                    </div>
                    <div style="font-size:22px; color:${brand.gray500}; margin-top:6px;">${h.current} / ${h.target}</div>
                  </div>`
                    : ''
                }
              </div>
              <div style="width:60px; height:60px; border-radius:50%; background:${h.done ? brand.green500 : brand.white}; border:3px solid ${h.done ? brand.green500 : brand.gray200}; display:flex; align-items:center; justify-content:center; font-size:28px; color:#fff; font-weight:700;">
                ${h.done ? '✓' : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    },
    activeTab: 'Habits',
  },
  {
    name: '05-messages',
    headline: 'Chat With\nYour Coach',
    sub: 'Real-time messaging & support',
    html: () => `
      <div class="content" style="display:flex; flex-direction:column; padding:0;">
        <div style="padding:30px 40px;">
          <div class="greeting">Messages</div>
        </div>
        <div style="flex:1; padding:0 40px;">
          ${[
            { name: 'Coach Sarah', initials: 'SM', msg: 'Great work on today\'s session! Let\'s increase the weight next week 💪', time: '2m', unread: 2, color: brand.violet600 },
            { name: 'Coach Mike', initials: 'MR', msg: 'Don\'t forget to log your mobility work', time: '1h', unread: 0, color: brand.blue500 },
            { name: 'Coach Lisa', initials: 'LT', msg: 'Your nutrition plan for next week is ready', time: '3h', unread: 1, color: brand.amber500 },
            { name: 'Coach David', initials: 'DK', msg: 'Assessment results look good — keep it up!', time: '1d', unread: 0, color: brand.green500 },
          ]
            .map(
              (t) => `
            <div style="display:flex; align-items:center; gap:24px; padding:24px 0; border-bottom:2px solid ${brand.gray100};">
              <div style="width:80px; height:80px; border-radius:50%; background:${t.color}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:28px; font-weight:700; flex-shrink:0;">
                ${t.initials}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:30px; font-weight:700; color:${brand.gray900};">${t.name}</span>
                  <span style="font-size:24px; color:${brand.gray400};">${t.time}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:26px; color:${t.unread ? brand.gray900 : brand.gray500}; font-weight:${t.unread ? '600' : '400'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:620px;">${t.msg}</span>
                  ${t.unread ? `<span style="background:${brand.violet600}; color:#fff; border-radius:50%; min-width:40px; height:40px; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; flex-shrink:0;">${t.unread}</span>` : ''}
                </div>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `,
    activeTab: 'Messages',
  },
  {
    name: '06-coach-dashboard',
    headline: 'Built for\nCoaches Too',
    sub: 'Web dashboard for program design',
    html: () => `
      <div class="content" style="background: #f8fafc;">
        <div style="margin-bottom:24px;">
          <div class="greeting">Coach Dashboard</div>
          <div class="date-text">4 active clients today</div>
        </div>

        <div class="section-title">Needs Attention</div>
        ${[
          { name: 'Alex Johnson', status: 'Missed 3 workouts', color: brand.red500, compliance: '45%' },
          { name: 'Emma Wilson', status: 'No log in 2 days', color: brand.amber500, compliance: '72%' },
        ]
          .map(
            (c) => `
          <div class="card" style="border-left:6px solid ${c.color}; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:30px; font-weight:700; color:${brand.gray900};">${c.name}</div>
                <div style="font-size:24px; color:${c.color}; margin-top:6px;">${c.status}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:40px; font-weight:800; color:${c.color};">${c.compliance}</div>
                <div style="font-size:20px; color:${brand.gray400};">compliance</div>
              </div>
            </div>
          </div>`
          )
          .join('')}

        <div class="section-title" style="margin-top:24px;">Recent Completions</div>
        ${[
          { name: 'James Lee', workout: 'Push Day A', time: '35 min ago', compliance: '94%' },
          { name: 'Mia Chen', workout: 'Cardio + Core', time: '1h ago', compliance: '88%' },
        ]
          .map(
            (c) => `
          <div class="card" style="border-left:6px solid ${brand.green500}; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:30px; font-weight:700; color:${brand.gray900};">${c.name}</div>
                <div style="font-size:24px; color:${brand.gray500}; margin-top:6px;">✅ ${c.workout} · ${c.time}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:40px; font-weight:800; color:${brand.green600};">${c.compliance}</div>
                <div style="font-size:20px; color:${brand.gray400};">compliance</div>
              </div>
            </div>
          </div>`
          )
          .join('')}
      </div>
    `,
    activeTab: null,
  },
];

// ── Renderer ───────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const shot of screenshots) {
    console.log(`  Rendering ${shot.name}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    const headlineHtml = shot.headline.replace(/\n/g, '<br>');

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>${baseCss}</style>
    </head><body>
      <div class="headline">
        <h1>${headlineHtml}</h1>
        <p>${shot.sub}</p>
      </div>
      <div class="phone">
        <div class="screen">
          ${statusBar()}
          ${shot.html()}
          ${shot.activeTab ? tabBar(shot.activeTab) : ''}
        </div>
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: path.join(OUT, `${shot.name}.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: W, height: H },
    });
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ Generated ${screenshots.length} screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
