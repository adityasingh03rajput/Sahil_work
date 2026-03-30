/**
 * Fiscal year boundaries (India: April 1 to March 31)
 */
export function getCurrentFiscalYearRange(date = new Date()) {
  const currentMonth = date.getMonth(); // 0-indexed: 0=Jan, 3=April
  const currentYear = date.getFullYear();

  let startYear, endYear;
  if (currentMonth >= 3) { // After April 1 (inclusive)
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // Format as YYYY-MM-DD
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;
  const label = `${startYear}-${String(endYear).slice(2)}`;

  return { startDate, endDate, label };
}

export function getFiscalYearFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  
  const { label } = getCurrentFiscalYearRange(d);
  return label;
}
