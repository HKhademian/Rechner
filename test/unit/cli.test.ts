import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('Headless CLI Scenario Runner (src/cli/runner.ts)', () => {
  it('executes full headless comparison simulation via CLI and returns 0 exit code', async () => {
    const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', '-f', 'summary']);
    assert.equal(stderr, '');
    assert.ok(stdout.includes('GERMAN ELTERNGELD SIMULATION KPI SCORECARD'));
    assert.ok(stdout.includes('Scenario A (Status Quo)'));
    assert.ok(stdout.includes('Scenario B (Unoptimized)'));
    assert.ok(stdout.includes('Scenario C (Optimized)'));
    assert.ok(stdout.includes('Net Optimization Advantage (Scenario C vs B)'));
  });

  it('outputs valid, structured JSON ledger when --format json is provided', async () => {
    const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', '--format', 'json', '-d', '24']);
    assert.equal(stderr, '');

    const data = JSON.parse(stdout);
    assert.equal(data.options.duration, 24);
    assert.ok(data.scenarioA);
    assert.ok(data.scenarioB);
    assert.ok(data.scenarioC);
    assert.equal(data.scenarioC.months.length, 24);
    assert.ok(data.scenarioC.summary.grandTotal > 0);
  });

  it('supports custom salary raises and displays milestone breakdown', async () => {
    const { stdout, stderr } = await execFileAsync('node', [
      'src/cli/runner.ts',
      '-s',
      'C',
      '-r',
      '0.05',
      '-d',
      '36',
      '-f',
      'milestones'
    ]);
    assert.equal(stderr, '');
    assert.ok(stdout.includes('Key Life Milestones & Special Events Timeline (36 Months)'));
    assert.ok(stdout.includes('Mutterschutz'));
  });
});
