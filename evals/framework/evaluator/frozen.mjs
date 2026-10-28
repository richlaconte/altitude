// The assessor is frozen before generation: run.mjs records this fingerprint and assess.mjs reports any later change as post-hoc.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const assessorVersion='2.0.1';
export const assessorFiles=['assess.mjs','rubric.json','frozen.mjs'];
export function assessorFingerprint() {
 const hash=createHash('sha256');
 for(const file of assessorFiles)hash.update(file).update(readFileSync(new URL('./'+file,import.meta.url)));
 return {version:assessorVersion,sha256:hash.digest('hex'),files:assessorFiles};
}
