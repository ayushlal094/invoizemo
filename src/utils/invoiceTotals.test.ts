import { describe, it, expect } from 'vitest';
import {
  computeLineItemAmount,
  computeInvoiceTotals,
  normalizeLineItems,
} from '../modules/invoices/invoice.model.js';

describe('invoice totals', () => {
  it('computes line item amount in cents', () => {
    expect(computeLineItemAmount(2, 1500)).toBe(3000);
    expect(computeLineItemAmount(1.5, 1000)).toBe(1500);
  });

  it('computes invoice totals with tax', () => {
    const items = normalizeLineItems([
      { description: 'Design', quantity: 1, unitPriceCents: 10000 },
      { description: 'Dev', quantity: 2, unitPriceCents: 5000 },
    ]);
    const totals = computeInvoiceTotals(items, 0.1);
    expect(totals.subtotalCents).toBe(20000);
    expect(totals.taxCents).toBe(2000);
    expect(totals.totalCents).toBe(22000);
  });
});

describe('safeCompare', () => {
  it('compares tokens safely', async () => {
    const { safeCompare } = await import('./tokenCompare.js');
    expect(safeCompare('abc', 'abc')).toBe(true);
    expect(safeCompare('abc', 'abd')).toBe(false);
    expect(safeCompare('abc', 'abcd')).toBe(false);
  });
});
