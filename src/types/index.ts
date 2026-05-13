export interface Project {
  id: string;
  name: string;
  clientName: string;
  contractorName?: string;
  status: 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Trade {
  id: string;
  projectId: string;
  designation: string;
  supplierName?: string;
  quantity?: number;
  /** @deprecated use budget */
  amount: number;
  budget: number;
  /** @deprecated use totalClientAdvances */
  totalAdvances: number;
  totalClientAdvances: number;
  totalLaborExpenses: number;
  totalMaterialExpenses: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export type PaymentType = 'client_advance' | 'labor_expense' | 'material_expense' | 'advance' | 'expense' | 'income';

export interface Payment {
  id: string;
  projectId: string;
  tradeId: string;
  date: Date;
  amount: number;
  type: PaymentType;
  designation?: string;
  workerNames?: string;
  receiptUrl?: string;
  createdAt: Date;
  ownerId: string;
}

export type PeriodKey = '7d' | '14d' | '1m' | '6m' | '1y' | 'all' | 'custom';

export const PERIOD_OPTIONS = [
  { key: '7d', labelEn: 'Last 7 Days', labelFr: '7 Derniers Jours' },
  { key: '14d', labelEn: 'Last 14 Days', labelFr: '14 Derniers Jours' },
  { key: '1m', labelEn: 'Last 1 Month', labelFr: '1 Dernier Mois' },
  { key: '6m', labelEn: 'Last 6 Months', labelFr: '6 Derniers Mois' },
  { key: '1y', labelEn: 'Last 1 Year', labelFr: '1 Dernière Année' },
  { key: 'all', labelEn: 'All Time', labelFr: 'Tout le Temps' },
  { key: 'custom', labelEn: 'Custom', labelFr: 'Personnalisé' }
] as const;

export function getPeriodDates(period: PeriodKey, customStart?: Date, customEnd?: Date): { start: Date, end: Date } {
  const end = new Date();
  let start = new Date(0); // Epoch

  if (period === '7d') {
    start = new Date(end);
    start.setDate(end.getDate() - 7);
  } else if (period === '14d') {
    start = new Date(end);
    start.setDate(end.getDate() - 14);
  } else if (period === '1m') {
    start = new Date(end);
    start.setMonth(end.getMonth() - 1);
  } else if (period === '6m') {
    start = new Date(end);
    start.setMonth(end.getMonth() - 6);
  } else if (period === '1y') {
    start = new Date(end);
    start.setFullYear(end.getFullYear() - 1);
  } else if (period === 'custom') {
    start = customStart || new Date(0);
    if (customEnd) {
      end.setTime(customEnd.getTime());
      end.setHours(23, 59, 59, 999);
    }
  }
  
  return { start, end };
}
