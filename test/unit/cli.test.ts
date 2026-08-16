import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseMonthArg, parseFieldArg } from '#cli/runner';
import { FieldColumnKey } from '#engine/types';

const execFileAsync = promisify(execFile);

describe('Headless CLI Scenario Runner & Explainer (src/cli/runner.ts)', () => {
  describe('Argument Parsers (parseMonthArg & parseFieldArg)', () => {
    it('parses various month string formats cleanly', () => {
      assert.equal(parseMonthArg('M21'), 21);
      assert.equal(parseMonthArg('m21'), 21);
      assert.equal(parseMonthArg('21'), 21);
      assert.equal(parseMonthArg('Month 14'), 14);
      assert.throws(() => parseMonthArg('invalid'), /Invalid month argument/);
      assert.throws(() => parseMonthArg('125'), /Invalid month argument/);
    });

    it('resolves field aliases to canonical FieldColumnKeys', () => {
      assert.equal(parseFieldArg('partner'), FieldColumnKey.HusbandElterngeld);
      assert.equal(parseFieldArg('father'), FieldColumnKey.HusbandElterngeld);
      assert.equal(parseFieldArg('husbandElterngeld'), FieldColumnKey.HusbandElterngeld);
      assert.equal(parseFieldArg('mother'), FieldColumnKey.WifeElterngeld);
      assert.equal(parseFieldArg('wifeElterngeld'), FieldColumnKey.WifeElterngeld);
      assert.equal(parseFieldArg('egplus'), FieldColumnKey.WifeElterngeld);
      assert.equal(parseFieldArg('mutterschutz'), FieldColumnKey.Mutterschutz);
      assert.equal(parseFieldArg('maternity'), FieldColumnKey.Mutterschutz);
      assert.equal(parseFieldArg('husband'), FieldColumnKey.HusbandSalary);
      assert.equal(parseFieldArg('wife'), FieldColumnKey.WifeSalary);
      assert.equal(parseFieldArg('taxClass'), FieldColumnKey.TaxClass);
      assert.equal(parseFieldArg('kindergeld'), FieldColumnKey.Kindergeld);
      assert.equal(parseFieldArg('special'), FieldColumnKey.SpecialEvents);
      assert.equal(parseFieldArg('net'), FieldColumnKey.NetInflow);
      assert.equal(parseFieldArg('cumulative'), FieldColumnKey.CumulativeTotal);
      assert.throws(() => parseFieldArg('unknown_field'), /Unknown explanation field/);
    });
  });

  describe('CLI Execution', () => {
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

    it('explains full monthly audit when "explain M21" command is invoked', async () => {
      const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', 'explain', 'M21']);
      assert.equal(stderr, '');
      assert.ok(stdout.includes('FULL MONTHLY AUDIT: Month 21'));
      assert.ok(stdout.includes('Monthly Net Inflow:'));
      assert.ok(stdout.includes('Itemized Cash Flow Breakdown:'));
      assert.ok(stdout.includes("Husband's Salary"));
      assert.ok(stdout.includes("Mother's ElterngeldPlus"));
      assert.ok(stdout.includes("Father's Elterngeld / Partner Bonus"));
      assert.ok(stdout.includes('Kindergeld'));
    });

    it('explains specific field step-by-step calculation when "explain M21 field partner" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', 'explain', 'M21', 'field', 'partner']);
      assert.equal(stderr, '');
      assert.ok(stdout.includes("FIELD EXPLANATION: Father's Partner Months"));
      assert.ok(stdout.includes('Value:'));
      assert.ok(stdout.includes('150'));
      assert.ok(stdout.includes('Legal Citation:'));
      assert.ok(stdout.includes('BEEG § 4 Abs. 3'));
      assert.ok(stdout.includes('Contributing Parameters / Factors:'));
      assert.ok(stdout.includes('Step-by-Step Calculation Breakdown:'));
    });

    it('explains Mother ElterngeldPlus replacement calculation when "explain M19 field mother" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', 'explain', 'M19', 'field', 'mother']);
      assert.equal(stderr, '');
      assert.ok(stdout.includes("FIELD EXPLANATION: Mother's ElterngeldPlus"));
      assert.ok(stdout.includes('900'));
      assert.ok(stdout.includes('Pre-Birth Assessment Net'));
      assert.ok(stdout.includes('Statutory Replacement Rate'));
      assert.ok(stdout.includes('Step-by-Step Calculation Breakdown:'));
    });

    it('outputs structured JSON when "explain M21 field partner -f json" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync('node', ['src/cli/runner.ts', 'explain', 'M21', 'field', 'partner', '-f', 'json']);
      assert.equal(stderr, '');

      const parsed = JSON.parse(stdout);
      assert.equal(parsed.simulationMonth, 21);
      assert.equal(parsed.fieldKey, 'husbandElterngeld');
      assert.ok(parsed.explanation.valueFormatted.includes('150'));
      assert.ok(parsed.explanation.contributingFactors.length >= 3);
      assert.ok(parsed.explanation.calculationSteps.length >= 2);
    });
  });
});
