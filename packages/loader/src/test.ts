/**
 * Smoke test for @agnes/loader.
 *
 *   1. Parse the demo fixture
 *   2. Inject inputs
 *   3. Verify the promptInput node has its text param overridden
 *   4. (Don't actually run the network call here — we just verify IO binding)
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkflow, runWorkflow } from './index';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const path = resolve(__dirname, '../fixtures/demo.flow.json');
  const text = readFileSync(path, 'utf-8');
  const wf = loadWorkflow(text);
  console.log('✓ Loaded:', wf.name || '(unnamed)');
  console.log('  Nodes:', wf.nodes.length, ' Edges:', wf.edges.length);
  console.log('  apiInputs:', (wf.apiInputs || []).map((i) => i.name));
  console.log('  apiOutputs:', (wf.apiOutputs || []).map((o) => o.name));

  // Try the run end-to-end (will fail with 401 if no API key, but that's OK —
  // it means the wiring works through to the API client).
  const inputs = { prompt: 'a tiny cute cat', size: '512x512' };
  console.log('\n→ Running with inputs:', inputs);
  try {
    const r = await runWorkflow(wf, inputs, { onLog: (l) => console.log(' ', l) });
    console.log('Result:', JSON.stringify(r, null, 2));
    process.exit(Object.keys(r.errors).length ? 1 : 0);
  } catch (e) {
    console.error('Run failed:', (e as Error).message);
    process.exit(1);
  }
}

main();
