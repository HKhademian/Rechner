import {
  ChristmasMarketIcon,
  ChristmasOutingIcon,
} from "#components/Icons";
import {
  MapCategory,
  categoryStyle,
} from "./places.ts";

export function seasonalSymbol(
  category: MapCategory,
  size: number,
) {
  switch (category) {
    case MapCategory.ChristmasMarket:
      return <ChristmasMarketIcon size={size} />;
    case MapCategory.LocalChristmasEvent:
    case MapCategory.ChristmasOuting:
      return <ChristmasOutingIcon size={size} />;
    default:
      return undefined;
  }
}

export function mapSymbol(
  category: MapCategory,
  size: number,
) {
  return seasonalSymbol(category, size) ?? categoryStyle[category].code ?? "";
}
