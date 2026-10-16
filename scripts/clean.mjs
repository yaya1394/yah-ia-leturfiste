import { rm } from 'node:fs/promises';

await Promise.all(['dist', 'server.js'].map((target) => rm(target, { recursive: true, force: true })));
