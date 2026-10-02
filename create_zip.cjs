const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = '/app/applet';
const releaseDirName = 'MedCare-HMS-v1.0.0';
const releaseDirPath = path.join(rootDir, releaseDirName);
const zipFileName = 'MedCare-HMS-v1.0.0.zip';
const zipFilePath = path.join(rootDir, zipFileName);

console.log('Creating release directory and populating files in:', rootDir);

if (fs.existsSync(releaseDirPath)) {
  fs.rmSync(releaseDirPath, { recursive: true, force: true });
}
if (fs.existsSync(zipFilePath)) {
  fs.rmSync(zipFilePath, { force: true });
}

fs.mkdirSync(releaseDirPath, { recursive: true });

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
  if (stats.isSymbolicLink()) return;

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (let entry of fs.readdirSync(src)) {
      if (['node_modules', 'dist', '.git', 'coverage', '.DS_Store', releaseDirName, zipFileName, 'tmp_extract', 'app'].includes(entry)) continue;
      copyEntry(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stats.isFile()) {
    const base = path.basename(src);
    if (base === '.env' || base === '.env.local' || base.endsWith('.log')) return;
    fs.copyFileSync(src, dest);
  }
}

for (let item of whitelist) {
  const src = path.join(rootDir, item);
  const dest = path.join(releaseDirPath, item);
  if (fs.existsSync(src)) {
    copyEntry(src, dest);
    console.log(`Copied: ${item}`);
  } else {
    console.warn(`Warning: Missing ${item}`);
  }
}

console.log('Generating ZIP using adm-zip...');
const zip = new AdmZip();
zip.addLocalFolder(releaseDirPath, releaseDirName);
zip.writeZip(zipFilePath);
console.log('ZIP generated successfully.');

function getFolderStats(dir) {
  let size = 0, count = 0;
  function walk(current) {
    for (let item of fs.readdirSync(current)) {
      const full = path.join(current, item);
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) { size += st.size; count++; }
    }
  }
  walk(dir);
  return { size, count };
}

const stats = getFolderStats(releaseDirPath);
const zipStats = fs.statSync(zipFilePath);
const topDirs = fs.readdirSync(releaseDirPath).filter(f => fs.statSync(path.join(releaseDirPath, f)).isDirectory());

console.log(JSON.stringify({
  releaseDir: releaseDirPath,
  zipPath: zipFilePath,
  uncompressedBytes: stats.size,
  uncompressedMB: (stats.size / 1024 / 1024).toFixed(2),
  zipBytes: zipStats.size,
  zipMB: (zipStats.size / 1024 / 1024).toFixed(2),
  fileCount: stats.count,
  topLevelDirectories: topDirs
}, null, 2));

// Test extraction
const extractDir = path.join(rootDir, 'tmp_extract');
if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
fs.mkdirSync(extractDir, { recursive: true });

const extractZip = new AdmZip(zipFilePath);
extractZip.extractAllTo(extractDir, true);

const extractedRoot = path.join(extractDir, releaseDirName);
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
console.log('ZIP verification complete.');
