export const COUNTRY_RULES = {
  US: { dutyRate: 0, vatRate: 0, handlingUSD: 0 },
  GH: { dutyRate: 0.10, vatRate: 0.15, handlingUSD: 15 },
  CI: { dutyRate: 0.08, vatRate: 0.18, handlingUSD: 18 },
  SN: { dutyRate: 0.08, vatRate: 0.18, handlingUSD: 18 }
};

/**
 * Estimate landed cost in USD.
 * Replace these placeholder rules with validated rates/logic.
 */
export function estimateLandedCostUSD({ itemPriceUSD, shipUSD = 0, country }) {
  const r = COUNTRY_RULES[country] || COUNTRY_RULES.GH;

  const subtotal = (itemPriceUSD || 0) + (shipUSD || 0);
  const duty = subtotal * r.dutyRate;
  const vatBase = subtotal + duty;
  const vat = vatBase * r.vatRate;
  const total = subtotal + duty + vat + r.handlingUSD;

  return { subtotal, duty, vat, handlingUSD: r.handlingUSD, total };
}
