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

export interface Travaux {
  id: string;
  projectId: string;
  designation: string;
  budget: number;
  totalClientAdvances: number;
  totalMainDoeuvre: number;
  totalFourniture: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export type PaymentType = 'client_advance' | 'main_doeuvre' | 'fourniture';
export type PaymentMethod = 'especes' | 'virement' | 'cheque';

export interface Payment {
  id: string;
  projectId: string;
  tradeId: string; // travaux ID (kept as tradeId for Firestore backward compat)
  date: Date;
  amount: number;
  type: PaymentType;
  designation?: string;
  workerName?: string;       // for main_doeuvre
  paymentMethod?: PaymentMethod; // for client_advance
  blReference?: string;      // for fourniture (bon de livraison)
  receiptUrl?: string;
  createdAt: Date;
  ownerId: string;
}

// Backward compat: old Trade type alias
export type Trade = Travaux;

// Helper: compute balance for a travaux
export function travauxBalance(t: Travaux): number {
  return t.totalClientAdvances - t.totalMainDoeuvre - t.totalFourniture;
}

// Helper: compute total spending for a travaux
export function travauxSpending(t: Travaux): number {
  return t.totalMainDoeuvre + t.totalFourniture;
}

// Time period filter options
export type PeriodKey = '7d' | '14d' | '1m' | '6m' | '1y' | 'all' | 'custom';

export interface PeriodOption {
  key: PeriodKey;
  labelEn: string;
  labelFr: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: '7d',  labelEn: '7 Days',     labelFr: '7 Jours' },
  { key: '14d', labelEn: '14 Days',    labelFr: '14 Jours' },
  { key: '1m',  labelEn: 'Last Month', labelFr: 'Dernier Mois' },
  { key: '6m',  labelEn: '6 Months',   labelFr: '6 Mois' },
  { key: '1y',  labelEn: 'This Year',  labelFr: "Cette Année" },
  { key: 'all', labelEn: 'All Time',   labelFr: 'Tout' },
  { key: 'custom', labelEn: 'Custom',  labelFr: 'Personnalisé' },
];

export function getPeriodDates(key: PeriodKey, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (key) {
    case '7d':
      return { start: new Date(now.getTime() - 7 * 86400000), end };
    case '14d':
      return { start: new Date(now.getTime() - 14 * 86400000), end };
    case '1m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), end };
    case '6m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), end };
    case '1y':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case 'custom':
      return {
        start: customStart || new Date(now.getFullYear(), 0, 1),
        end: customEnd || end,
      };
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end };
  }
}
