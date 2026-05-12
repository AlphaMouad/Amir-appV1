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
