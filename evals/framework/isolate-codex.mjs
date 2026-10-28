// Official per-skill overrides; never modify HOME, CODEX_HOME or a user's global configuration.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { skillPaths, skillOverride } from './support.mjs';
const cwd=mkdtempSync(join(tmpdir(),'altitude-skill-preflight-'));
try {
 execFileSync('git',['init','-q'],{cwd});
 const before=execFileSync('codex',['debug','prompt-input','Inspect the workspace.'],{cwd,encoding:'utf8',timeout:30000,maxBuffer:16e6});
 const codexDirectory=process.env.CODEX_HOME||join(homedir(),'.codex');
 const roots=[join(homedir(),'.agents/skills'),join(codexDirectory,'skills'),join(codexDirectory,'plugins/cache')].filter(existsSync);
 const disk=roots.length?execFileSync('rg',['--files','--hidden','--follow','-g','SKILL.md',...roots],{encoding:'utf8',maxBuffer:16e6}).trim().split('\n').filter(Boolean):[];
 const paths=[...new Set([...skillPaths(before),...disk])].sort(),config=skillOverride(paths);
 const after=execFileSync('codex',['-c',config,'debug','prompt-input','Inspect the workspace.'],{cwd,encoding:'utf8',timeout:30000,maxBuffer:16e6});
 const remaining=skillPaths(after);
 if(remaining.length)throw Error(`Skill isolation failed: ${remaining.length} skills remain in model-visible catalog`);
 const evidence={paths,inventoryRoots:roots,inventoryReason:'The debug command can omit default plugin skills that actual exec loads with ignore-user-config; include every on-disk SKILL.md as well.',remaining,config,toolVersion:execFileSync('codex',['--version'],{encoding:'utf8'}).trim(),documentation:['https://learn.chatgpt.com/docs/build-skills','https://learn.chatgpt.com/docs/config-file/config-reference'],verifiedAt:new Date().toISOString(),scope:'All skills in a fresh external project catalog excluded using exact file paths. Project AGENTS.md remains active; global configs/files and HOME/CODEX_HOME unchanged.'};
 const output=resolve(process.argv[2]||'build/test/codex-skill-exclusions.json');writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
 console.log(`${paths.length} excluded; ${remaining.length} remain. ${output}`);
}finally{rmSync(cwd,{recursive:true,force:true});}
