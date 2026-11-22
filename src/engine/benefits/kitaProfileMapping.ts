import {
  FederalStateKitaPresetId,
} from "#engine/types";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";

/** Maps a Unified Life Profile German federal state to its corresponding municipal Kita preset. */
export function mapFederalStateToKitaPreset(
  federalState: GermanFederalState,
): FederalStateKitaPresetId {
  switch (federalState) {
    case GermanFederalState.Berlin:
      return FederalStateKitaPresetId.Berlin;
    case GermanFederalState.NordrheinWestfalen:
      return FederalStateKitaPresetId.NrwDuesseldorf;
    case GermanFederalState.Bayern:
      return FederalStateKitaPresetId.BavariaMunich;
    case GermanFederalState.BadenWuerttemberg:
      return FederalStateKitaPresetId.BwStuttgart;
    case GermanFederalState.Hamburg:
      return FederalStateKitaPresetId.Hamburg;
    default:
      return FederalStateKitaPresetId.Custom;
  }
}
