import { describe, expect, it } from "vitest";
import { calculateKrCustoms, type KrGoodsCategory } from "@/domain/kr-customs";
import oracle from "./cases.json";

type OracleCase = {
  id: string;
  usdKrw?: number;
  officialTaxableKrw?: number;
  goods?: [string, number][];
  perfume?: [number, number][];
  alcohol?: [number, number][];
  officialTaxKrw: number;
};

const toBottle = ([paidKrw, ml]: [number, number]) => ({ paidKrw, ml });

describe("official customs calculator", () => {
  it.each(oracle.cases as OracleCase[])("matches $id", (item) => {
    const { withoutRefundProof } = calculateKrCustoms({
      usdKrw: item.usdKrw ?? oracle.usdKrw,
      goods: (item.goods ?? []).map(([category, paidKrw]) => ({
        category: category as KrGoodsCategory,
        paidKrw,
      })),
      perfume: item.perfume?.map(toBottle),
      alcohol: item.alcohol?.map(toBottle),
    });

    expect(withoutRefundProof.tax).toMatchObject({
      status: "calculated",
      declaredKrw: item.officialTaxKrw,
    });

    if (item.officialTaxableKrw !== undefined) {
      expect(withoutRefundProof.overLimitKrw).toBe(item.officialTaxableKrw);
    }
  });
});
