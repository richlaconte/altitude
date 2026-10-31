// Deterministic contracts run in CI. Agent generations are an explicit separate experiment.
import { execFileSync } from 'node:child_process';
const steps=[
 ['build/checks/semantics.mjs'],
 ['build/checks/semantics.mjs', {ALT_REACT19:'1'}],
 ['build/checks/pattern-types.mjs'],
 ['build/checks/pattern-workflows.mjs'],
 ['build/checks/guidance.mjs'],
 ['build/checks/agent-setup.mjs'],
 ['build/checks/package-consumer.mjs'],
 ['evals/framework/harness.test.mjs'],
 ['evals/framework/evaluator/assess.test.mjs'],
 ['evals/distinctiveness/briefs.test.mjs'],
 ['scripts/measure-framework.mjs'],
];
for(const [file,extra] of steps)execFileSync(process.execPath,[...(file.endsWith('.test.mjs')?['--test']:[]),file],{stdio:'inherit',env:{...process.env,...extra}});
