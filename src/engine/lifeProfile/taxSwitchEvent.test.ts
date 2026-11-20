import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  TaxClassCombination,
  taxClassSwitchModule,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  TimelineRecordStatus,
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";

it("validates tax.class-switch payloads and decodes cleanly", () => {
  const payload = taxClassSwitchModule.parsePayload({
    combination: TaxClassCombination.III_V,
    note: "Prepare for parental allowance",
  });
  assert.equal(payload.combination, TaxClassCombination.III_V);
  assert.throws(() => taxClassSwitchModule.parsePayload({ combination: "I/II" }));

  const decoded = decodeTimelineRecord(JSON.stringify({
    version: 2,
    events: [
      {
        id: "tax-1",
        kind: taxClassSwitchModule.kind,
        personId: "p1",
        date: "2026-04-01",
        status: "planned",
        payload,
      },
    ],
  }), lifeEventCatalog);
  assert.equal(decoded.status, TimelineRecordStatus.Valid);
});
