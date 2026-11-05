export type IsoDate = string;

export type Rule<T> = {
  id: string;
  value: T;
  unit: string;
  effectiveFrom: IsoDate;
  /** Inclusive. Omitted while no end date has been announced. */
  effectiveTo?: IsoDate;
  /** Source id from SPEC.md section 12. */
  sourceId: string;
  lastVerified: IsoDate;
};
