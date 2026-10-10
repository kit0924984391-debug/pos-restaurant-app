export interface ThaiBankInfo {
  code: string;
  name: string;
  short: string;
  color: string;
}

export const THAI_BANKS: ThaiBankInfo[] = [
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย (KBANK)', short: 'กสิกรไทย', color: '#138f2d' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์ (SCB)', short: 'ไทยพาณิชย์', color: '#4e2a84' },
  { code: 'BBL', name: 'ธนาคารกรุงเทพ (BBL)', short: 'กรุงเทพ', color: '#1e3a8a' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย (KTB)', short: 'กรุงไทย', color: '#00a3e0' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา (BAY)', short: 'กรุงศรีอยุธยา', color: '#fdb913' },
  { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต (ttb)', short: 'ทีทีบี', color: '#002d62' },
  { code: 'GSB', name: 'ธนาคารออมสิน (GSB)', short: 'ออมสิน', color: '#eb1985' },
  { code: 'BAAC', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)', short: 'ธ.ก.ส.', color: '#006837' },
  { code: 'UOB', name: 'ธนาคารยูโอบี (UOB)', short: 'ยูโอบี', color: '#002f6c' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบี ไทย (CIMB)', short: 'ซีไอเอ็มบี', color: '#7d0000' },
  { code: 'OTHER', name: 'ธนาคารอื่นๆ', short: 'อื่นๆ', color: '#64748b' },
];

/**
 * Normalizes a bank account number by keeping only digits.
 */
export function cleanBankAccount(accountNo: string): string {
  if (!accountNo) return '';
  return String(accountNo).replace(/\D/g, '');
}

/**
 * Validates whether the bank account number has 10 to 12 digits.
 */
export function isValidThaiBankAccount(accountNo: string): boolean {
  const clean = cleanBankAccount(accountNo);
  return /^\d{10,12}$/.test(clean);
}
