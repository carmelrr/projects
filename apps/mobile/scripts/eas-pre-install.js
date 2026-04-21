// Runs on the EAS Build worker before `pnpm install`.
// Fixes two issues common to OneDrive-synced monorepos:
//  1. Restrictive file permissions copied from Windows ACLs (EACCES during install).
//  2. Prisma engine / native binary executability.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const root =
  findRepoRoot(process.cwd()) ||
  findRepoRoot(__dirname) ||
  process.cwd();

try {
  execSync(`chmod -R u+rwX "${root}"`, { stdio: 'inherit' });
  console.log(`[eas-pre-install] chmod u+rwX applied to ${root}`);
} catch (e) {
  console.log(`[eas-pre-install] chmod warning: ${e.message}`);
}

// Sanity check: surface the file EAS complained about.
const mobilePkg = path.join(root, 'apps', 'mobile', 'package.json');
console.log(
  `[eas-pre-install] apps/mobile/package.json exists: ${fs.existsSync(mobilePkg)}`,
);
