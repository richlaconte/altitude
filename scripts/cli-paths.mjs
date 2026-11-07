// Node-only path helpers for the CLI. Platform-aware: pass node:path.win32 or .posix to test another platform.
import * as nodePath from 'node:path';
/** True when `file` lies strictly inside `dir`, judged with the platform's own separators and drive rules. */
export function inside(dir, file, path = nodePath) {
  const rel = path.relative(dir, file);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}
