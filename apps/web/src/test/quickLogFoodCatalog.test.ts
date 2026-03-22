import { describe, expect, it } from "vitest";
import { findQuickLogFoodByBarcode, searchQuickLogFoods } from "@/lib/quickLogFoodCatalog";

describe("quickLogFoodCatalog", () => {
  it("finds item by local barcode", () => {
    const item = findQuickLogFoodByBarcode("840000000101");

    expect(item?.name).toMatch(/pollo/i);
    expect(item?.per100.protein).toBeGreaterThan(20);
  });

  it("returns fuzzy matches for text search", () => {
    const items = searchQuickLogFoods("arroz");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.name.toLowerCase()).toContain("arroz");
  });
});
