// eas-build-pre-install: runs on EAS Build worker BEFORE `pnpm install`.
// Purpose: ensure all uploaded directories are writable. This project is
// stored on OneDrive on Windows, which can export directories with
// restricted mode bits that break pnpm's mkdir of node_modules on the
// Mac/Linux worker (seen as EACCES on apps/web/node_modules).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const root = findRepoRoot(process.cwd()) || findRepoRoot(__dirname);
if (!root) {
  console.log('[eas-pre-install] repo root not found, skipping.');
  process.exit(0);
}

try {
  execSync('chmod -R u+rwX "' + root + '"', { stdio: 'inherit' });
  console.log('[eas-pre-install] chmod u+rwX applied to ' + root);
} catch (e) {
  console.log('[eas-pre-install] chmod warning: ' + e.message);
}
