// Builds the Windows installer for the Local Sync Server (pnpm --filter @clyro/backend package:win):
//   1. bundles src/server.ts into one CommonJS file (esbuild)
//   2. turns that into clyro-sync-server.exe with Node's single-executable-app support (postject),
//      using the node.exe running this script
//   3. compiles the tray app, ClyroSync.exe, with the C# compiler that ships with Windows
//   4. packages both into a setup wizard with Inno Setup 6
// Output: release/ClyroLocalSyncServer-Setup-<version>.exe. See packaging/windows/ for the sources.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import postject from 'postject';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagingDir = join(backendDir, 'packaging', 'windows');
const releaseDir = join(backendDir, 'release');
const buildDir = join(releaseDir, 'build');
const { version } = JSON.parse(readFileSync(join(backendDir, 'package.json'), 'utf8'));

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function findExisting(label, candidates, hint) {
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) fail(`${label} not found. ${hint}`);
  return found;
}

async function bundleServer() {
  await build({
    entryPoints: [join(backendDir, 'src', 'server.ts')],
    outfile: join(buildDir, 'server.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: `node${process.versions.node}`,
    logLevel: 'warning',
  });
}

// node.exe is Authenticode-signed, and injecting the app invalidates that signature. A broken
// signature looks worse to SmartScreen and antivirus than none, so drop it first: clear the PE
// header's certificate-table entry and cut the table off the end of the file.
function stripSignature(exePath) {
  const exe = readFileSync(exePath);
  const optionalHeader = exe.readUInt32LE(0x3c) + 24;
  const isPE32Plus = exe.readUInt16LE(optionalHeader) === 0x20b;
  const certificateEntry = optionalHeader + (isPE32Plus ? 112 : 96) + 4 * 8;
  const certificateOffset = exe.readUInt32LE(certificateEntry);
  const certificateSize = exe.readUInt32LE(certificateEntry + 4);
  if (certificateSize === 0) return;

  exe.writeUInt32LE(0, certificateEntry);
  exe.writeUInt32LE(0, certificateEntry + 4);
  const end = certificateOffset + certificateSize === exe.length ? certificateOffset : exe.length;
  writeFileSync(exePath, exe.subarray(0, end));
}

async function buildServerExe() {
  execFileSync(process.execPath, ['--experimental-sea-config', join(packagingDir, 'sea-config.json')], {
    cwd: backendDir,
    stdio: 'inherit',
  });

  const exePath = join(buildDir, 'clyro-sync-server.exe');
  copyFileSync(process.execPath, exePath);
  stripSignature(exePath);
  await postject.inject(exePath, 'NODE_SEA_BLOB', readFileSync(join(buildDir, 'sea-prep.blob')), {
    sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  });
}

function buildTrayApp() {
  const csc = findExisting(
    'The C# compiler (csc.exe)',
    [join(process.env.WINDIR ?? 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')],
    'It ships with the .NET Framework 4 that is part of Windows 10 and 11.'
  );

  // Gives ClyroSync.exe a readable name in Task Manager and the version in its file properties.
  const assemblyInfo = join(buildDir, 'AssemblyInfo.cs');
  writeFileSync(
    assemblyInfo,
    [
      'using System.Reflection;',
      '[assembly: AssemblyTitle("Clyro Local Sync Server")]',
      '[assembly: AssemblyProduct("Clyro Local Sync Server")]',
      `[assembly: AssemblyVersion("${version}")]`,
      `[assembly: AssemblyFileVersion("${version}")]`,
    ].join('\n')
  );

  const icon = join(packagingDir, 'clyro.ico');
  execFileSync(
    csc,
    [
      '/nologo',
      '/target:winexe',
      '/platform:x64',
      '/optimize+',
      '/codepage:65001',
      `/out:${join(buildDir, 'ClyroSync.exe')}`,
      `/win32icon:${icon}`,
      `/resource:${icon},clyro.ico`,
      '/reference:System.Windows.Forms.dll',
      '/reference:System.Drawing.dll',
      join(packagingDir, 'ClyroSync.cs'),
      assemblyInfo,
    ],
    { stdio: 'inherit' }
  );
}

function buildInstaller() {
  const iscc = findExisting(
    'Inno Setup 6 (ISCC.exe)',
    [
      process.env.ISCC,
      join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
      join(process.env['ProgramFiles(x86)'] ?? '', 'Inno Setup 6', 'ISCC.exe'),
      join(process.env.ProgramFiles ?? '', 'Inno Setup 6', 'ISCC.exe'),
    ],
    'Install it with `winget install JRSoftware.InnoSetup`, or set ISCC to its path.'
  );

  execFileSync(
    iscc,
    ['/Q', `/DAppVersion=${version}`, `/DBuildDir=${buildDir}`, `/DOutputDir=${releaseDir}`, join(packagingDir, 'installer.iss')],
    { stdio: 'inherit' }
  );
}

if (process.platform !== 'win32') fail('The Windows installer can only be built on Windows.');

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

console.log('1/4 Bundling the server...');
await bundleServer();
console.log('2/4 Building clyro-sync-server.exe...');
await buildServerExe();
console.log('3/4 Building ClyroSync.exe (tray app)...');
buildTrayApp();
console.log('4/4 Building the installer...');
buildInstaller();

console.log(`\nDone: ${join(releaseDir, `ClyroLocalSyncServer-Setup-${version}.exe`)}`);
