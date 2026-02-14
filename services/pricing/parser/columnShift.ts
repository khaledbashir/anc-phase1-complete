/**
 * Column Shift — fallback column alignment logic when standard parsing yields no sections
 */

import { ColumnMap } from "./columnDetection";
import { parseNumber } from "./rowParser";

/**
 * Derive a shifted column map if data appears offset from headers.
 * Only used as a fallback when standard parsing yields no sections.
 */
export function deriveBestShiftedColumnMap(
  data: any[][],
  headerRowIdx: number,
  baseMap: ColumnMap
): ColumnMap | null {
  const shifts = [0, -1, 1, -2, 2];
  const start = Math.max(headerRowIdx + 1, 0);
  const end = Math.min(data.length, start + 40);

  const isTextLabel = (v: any) =>
    typeof v === "string" && /[a-z]/i.test(v) && v.trim().length > 0;
  const isNumeric = (v: any) => Number.isFinite(parseNumber(v));

  let bestShift = 0;
  let bestScore = -Infinity;

  for (const shift of shifts) {
    const labelIdx = baseMap.label + shift;
    const costIdx = baseMap.cost + shift;
    const sellIdx = baseMap.sell + shift;
    const marginIdx = baseMap.margin + shift;
    const marginPctIdx = baseMap.marginPct + shift;

    if (labelIdx < 0 || costIdx < 0 || sellIdx < 0 || marginIdx < 0 || marginPctIdx < 0) continue;

    let labelText = 0;
    let labelNumeric = 0;
    let costNumeric = 0;
    let sellNumeric = 0;

    for (let i = start; i < end; i++) {
      const row = data[i] || [];
      const labelVal = row[labelIdx];
      if (isTextLabel(labelVal)) labelText++;
      else if (isNumeric(labelVal)) labelNumeric++;

      if (isNumeric(row[costIdx])) costNumeric++;
      if (isNumeric(row[sellIdx])) sellNumeric++;
    }

    const score = labelText * 5 + (costNumeric + sellNumeric) - labelNumeric * 2;
    if (score > bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }

  if (bestScore === -Infinity) return null;

  return {
    label: baseMap.label + bestShift,
    cost: baseMap.cost + bestShift,
    sell: baseMap.sell + bestShift,
    margin: baseMap.margin + bestShift,
    marginPct: baseMap.marginPct + bestShift,
  };
}
