import axios from 'axios';

const GSTIN_API_KEY = process.env.GSTIN_API_KEY;
const GSTIN_BASE_URL = 'https://sheet.gstincheck.co.in/check';

export function canCheckGstin() {
  return Boolean(GSTIN_API_KEY);
}

export async function fetchGstinDetails(gstin) {
  if (!GSTIN_API_KEY) throw new Error('GSTIN_API_KEY not configured');
  const cleaned = String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) throw new Error('GSTIN is required');
  const url = `${GSTIN_BASE_URL}/${GSTIN_API_KEY}/${cleaned}`;
  const res = await axios.get(url, { timeout: 10000 });
  if (!res.data?.flag) {
    throw new Error(res.data?.message || 'GSTIN not found');
  }
  const d = res.data.data;
  return {
    gstin: d.gstin,
    legalName: d.lgnm,
    tradeName: d.tradeNam,
    status: d.sts,
    registrationDate: d.rgdt,
    businessType: d.ctb,
    natureOfBusinessActivities: Array.isArray(d.nba) ? d.nba : [],
    address: d.pradr?.adr || '',
    addressParts: d.pradr?.addr || {},
    stateJurisdiction: d.stj || '',
    centerJurisdiction: d.ctj || '',
  };
}
