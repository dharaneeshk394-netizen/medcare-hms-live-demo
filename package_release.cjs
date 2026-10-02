const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = '/';
const releaseDirName = 'MedCare-HMS-v1.0.0';
const releaseDirPath = path.join(rootDir, releaseDirName);
const zipFileName = 'MedCare-HMS-v1.0.0.zip';
const zipFilePath = path.join(rootDir, zipFileName);

console.log('Starting release package creation...');

if (fs.existsSync(releaseDirPath)) {
  fs.rmSync(releaseDirPath, { recursive: true, force: true });
}
if (fs.existsSync(zipFilePath)) {
  fs.rmSync(zipFilePath, { force: true });
}

fs.mkdirSync(releaseDirPath, { recursive: true });

const excludeDirs = ['node_modules', 'dist', 'MedCare-HMS-v1.0.0', '.git', 'coverage', '.idea', '.vscode', 'cloudsql', 'tmp_medcare_extract'];
const excludeFiles = ['.env', '.env.local', '.DS_Store', 'Thumbs.db', 'MedCare-HMS-v1.0.0.zip'];

function copyRecursive(src, dest) {
  const basename = path.basename(src);
  if (excludeDirs.includes(basename)) return;
  if (excludeFiles.includes(basename) || basename.endsWith('.log')) return;
  if (basename.startsWith('.env') && basename !== '.env.example') return;
  if (basename.startsWith('.s.PGSQL')) return;

  let stats;
  try {
    stats = fs.lstatSync(src);
  } catch (e) {
    return;
  }

  if (stats.isSymbolicLink()) {
    return; // skip symlinks / socket files
  }

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (let entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stats.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

const rootEntries = fs.readdirSync(rootDir);
for (let entry of rootEntries) {
  if (excludeDirs.includes(entry) || excludeFiles.includes(entry)) continue;
  if (entry === releaseDirName || entry === zipFileName) continue;
  const srcPath = path.join(rootDir, entry);
  const destPath = path.join(releaseDirPath, entry);
  copyRecursive(srcPath, destPath);
}

console.log('Files copied to release directory successfully.');

console.log('Creating ZIP archive...');
execSync(`zip -r ${zipFileName} ${releaseDirName}`, { cwd: rootDir });
console.log('ZIP archive created successfully.');

function getDirectorySize(dirPath) {
  let size = 0;
  let fileCount = 0;
  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath);
    for (let entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        traverse(fullPath);
      } else {
        size += stats.size;
        fileCount++;
      }
    }
  }
  traverse(dirPath);
  return { size, fileCount };
}

const dirStats = getDirectorySize(releaseDirPath);
const zipStats = fs.statSync(zipFilePath);
const topLevelDirs = fs.readdirSync(releaseDirPath).filter(f => fs.statSync(path.join(releaseDirPath, f)).isDirectory());

console.log(`Uncompressed size: ${(dirStats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`ZIP size: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`File count: ${dirStats.fileCount}`);
console.log(`Top-level directories: ${topLevelDirs.join(', ')}`);

const extractTestDir = path.join(rootDir, 'tmp_medcare_extract');
if (fs.existsSync(extractTestDir)) {
  fs.rmSync(extractTestDir, { recursive: true, force: true });
}
fs.mkdirSync(extractTestDir, { recursive: true });
execSync(`unzip -q ${zipFilePath} -d ${extractTestDir}`, { cwd: rootDir });

const extractedRoot = path.join(extractTestDir, releaseDirName);
const checks = {
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

console.log('Extraction validation checks:', checks);

fs.rmSync(extractTestDir, { recursive: true, force: true });
console.log('Package creation and validation completed successfully!');
