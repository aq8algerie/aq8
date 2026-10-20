export function historicalMeasurementFields(row, sha256) {
  const a = row.cells;
  const result = {};
  const positive = (index, max = 400) => {
    const value = Number(a[index]);
    return Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
  };
  for (const [key, index] of Object.entries({ waist: 7, leftArm: 10, lowerAbdomen: 11, navel: 12, thighHigh: 13, thighMid: 14 })) {
    const value = positive(index);
    if (value !== undefined) result[key] = value;
  }
  const height = Number(a[6]);
  if (height >= 1 && height <= 2.5) result.heightCm = Math.round(height * 10000) / 100;
  else if (height >= 100 && height <= 250) result.heightCm = height;
  const target = Number(a[15]);
  if (Number.isFinite(target) && target >= 30 && target <= 300) result.targetWeight = target;
  result.historicalMeasurements = {
    height: a[6], waist: a[7], leftArm: a[10], lowerAbdomen: a[11], navel: a[12],
    thighHigh: a[13], thighMid: a[14], targetWeight: a[15], measuredAt: a[4],
    sourceSha256: sha256, sourcePage: row.page,
  };
  return result;
}

// Only absent keys are eligible: zero, null and manually supplied values are preserved.
export function absentHistoricalFields(current, sourceFields) {
  return Object.fromEntries(Object.entries(sourceFields).filter(([key]) => !Object.hasOwn(current, key)));
}
