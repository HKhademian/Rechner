import {
  type CalculatorAppDefinition,
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
} from "#/apps/appDefinition.ts";

export const munichMapApp = {
  id: AppId.MunichMap,
  title: "Munich Map",
  description: "Explore markets, events, and landmarks around Munich and see what’s close to home or work.",
  category: CalculatorCategory.Everyday,
  releaseStatus: CalculatorReleaseStatus.Published,
  features: ["Markets and event venues", "Landmarks and transit stops", "Personal pins and distance rings"],
  keywords: ["München", "Munich", "Flohmarkt", "Christkindlmarkt", "Tollwood", "concert", "map", "ÖPNV"],
} satisfies CalculatorAppDefinition;
