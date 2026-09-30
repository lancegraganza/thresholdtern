import { cp, mkdir } from 'node:fs/promises';
await mkdir('public/zk/thresholdtern', { recursive: true });
for (const folder of ['keys', 'zkir']) {
  await cp(`managed/thresholdtern/${folder}`, `public/zk/thresholdtern/${folder}`, { recursive: true });
}
