import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const windows = process.platform === 'win32';
function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Compiler command failed');
  return result.stdout.trim();
}
const compact = windows ? run('wsl.exe', ['bash', '-lc', 'command -v compact']) : 'compact';
const path = (p) => windows ? run('wsl.exe', ['wslpath', '-u', resolve(p).replaceAll('\\', '/')]) : resolve(p);
const args = ['compile', '+0.31.1', path('contracts/thresholdtern.compact'), path('managed/thresholdtern')];
const result = spawnSync(windows ? 'wsl.exe' : compact, windows ? [compact, ...args] : args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./copy-artifacts.mjs');
const {readFile}=await import('node:fs/promises');
const info=JSON.parse(await readFile('managed/thresholdtern/compiler/contract-info.json','utf8'));
console.log('Compact 0.31.1 compiled successfully. Generated verify and close circuits, prover and verifier keys.');
console.log(`Contract metadata: ${Object.keys(info).join(', ')}`);
