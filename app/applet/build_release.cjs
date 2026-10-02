const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = '/app/applet';
const RELEASE_NAME = 'MedCare-HMS-v1.0.0';
const RELEASE_DIR = path.join(WORKSPACE_ROOT, RELEASE_NAME);
const ZIP_NAME = 'MedCare-HMS-v1.0.0.zip';
const ZIP_PATH = path.join(WORKSPACE_ROOT, ZIP_NAME);

console.log('=== BUILD RELEASE SCRIPT START ===');
console.log('Workspace Root:', WORKSPACE_ROOT);
console.log('Release Dir:', RELEASE_DIR);
console.log('ZIP Path:', ZIP_PATH);

if (fs.existsSync(RELEASE_DIR)) {
  fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
}
if (fs.existsSync(ZIP_PATH)) {
  fs.rmSync(ZIP_PATH, { force: true });
}

fs.mkdirSync(RELEASE_DIR, { recursive: true });

const whitelist = [
  'package.json',
  'package-lock.json',
  'bun.lock',
  'server.ts',
  'index.html',
  'metadata.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  '.oxlintrc.json',
  '.env.example',
  'src',
  'backend',
  'public',
  'README.md',
  'INSTALLATION.md',
  'USER_GUIDE.md',
  'CUSTOMIZATION.md',
  'TROUBLESHOOTING.md',
  'SECURITY.md',
  'LICENSE_NOTICES.md',
  'ENVATO_SUBMISSION_CHECKLIST.md',
  'CHANGELOG.md',
  'RELEASE_NOTES.md',
  'FINAL_RELEASE_CHECKLIST.md',
  'DESIGN_SYSTEM.md',
  'FIGMA_UI_KIT.md',
  'RELEASE_MANIFEST.md',
  'PACKAGE_CHECKLIST.md',
  'README_FIRST.txt'
];

function copyEntry(src, dest) {
  let stats;
  try {
    stats = fs.lstatSync(src);
  } catch (e) {
    return;
  }

  if (stats.isSymbolicLink()) {
    return;
  }

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (let entry of entries) {
      if (['node_modules', 'dist', '.git', 'coverage', '.DS_Store', RELEASE_NAME, ZIP_NAME, 'tmp_extract'].includes(entry)) continue;
      copyEntry(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stats.isFile()) {
    const base = path.basename(src);
    if (base === '.env' || base === '.env.local' || base.endsWith('.log')) return;
    fs.copyFileSync(src, dest);
  }
}

for (let item of whitelist) {
  const src = path.join(WORKSPACE_ROOT, item);
  const dest = path.join(RELEASE_DIR, item);
  if (fs.existsSync(src)) {
    copyEntry(src, dest);
    console.log(`Copied: ${item}`);
  } else {
    console.warn(`Warning: Missing whitelisted item: ${item}`);
  }
}

console.log('Creating ZIP archive...');
execSync(`zip -r ${ZIP_NAME} ${RELEASE_NAME}`, { cwd: WORKSPACE_ROOT });
console.log('ZIP archive created successfully.');

function getFolderStats(dir) {
  let size = 0;
  let count = 0;
  function walk(current) {
    const items = fs.readdirSync(current);
    for (let item of items) {
      const full = path.join(current, item);
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        size += st.size;
        count++;
      }
    }
  }
  walk(dir);
  return { size, count };
}

const stats = getFolderStats(RELEASE_DIR);
const zipStats = fs.statSync(ZIP_PATH);
const topDirs = fs.readdirSync(RELEASE_DIR).filter(f => fs.statSync(path.join(RELEASE_DIR, f)).isDirectory());

console.log(`Uncompressed size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
console.log(`ZIP size: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB (${zipStats.size} bytes)`);
console.log(`File count: ${stats.count}`);
console.log(`Top-level directories: ${topDirs.join(', ')}`);

const extractDir = path.join(WORKSPACE_ROOT, 'tmp_extract');
if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
fs.mkdirSync(extractDir, { recursive: true });
execSync(`unzip -q ${ZIP_NAME} -d ${extractDir}`, { cwd: WORKSPACE_ROOT });

const extractedRoot = path.join(extractDir, RELEASE_NAME);
const validation = {
  readmeFirst: fs.existsSync(path.join(extractedRoot, 'README_FIRST.txt')),
  readme: fs.existsSync(path.join(extractedRoot, 'README.md')),
  installation: fs.existsSync(path.join(extractedRoot, 'INSTALLATION.md')),
  envExample: fs.existsSync(path.join(extractedRoot, '.env.example')),
  src: fs.existsSync(path.join(extractedRoot, 'src')),
  backend: fs.existsSync(path.join(extractedRoot, 'backend')),
  manifest: fs.existsSync(path.join(extractedRoot, 'RELEASE_MANIFEST.md')),
  checklist: fs.existsSync(path.join(extractedRoot, 'PACKAGE_CHECKLIST.md')),
  noEnv: !fs.existsSync(path.join(extractedRoot, '.env')),
  noNodeModules: !fs.existsSync(path.join(extractedRoot, 'node_modules')),
  noDist: !fs.existsSync(path.join(extractedRoot, 'dist'))
};

console.log('Extraction validation checks:', validation);

fs.rmSync(extractDir, { recursive: true, force: true });
console.log('=== BUILD RELEASE SCRIPT COMPLETED SUCCESSFULLY ===');
