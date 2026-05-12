import emailjs from '@emailjs/browser';
import { Trade } from '../types';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID; 
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Initializes EmailJS with the public key.
 */
export const initEmailService = () => {
  emailjs.init(EMAILJS_PUBLIC_KEY);
};

/**
 * Checks if a trade's expenses exceed the budget and sends an alert.
 */
export const checkAndSendAlert = async (trade: Trade, newExpenseAmount: number) => {
  const budget = trade.budget || trade.amount || 0;
  if (budget <= 0) return;

  const currentExpenses = (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
  const newTotalExpenses = currentExpenses + newExpenseAmount;
  
  const previousRatio = currentExpenses / budget;
  const newRatio = newTotalExpenses / budget;

  // Trigger email only if it CROSSES the 100% threshold (budget exceeded)
  // or crosses 75% as previously
  if (previousRatio <= 1.0 && newRatio > 1.0) {
    try {
      const templateParams = {
        to_name: 'Admin',
        trade_name: trade.designation,
        supplier_name: trade.supplierName || 'Unknown',
        budget: budget.toLocaleString(),
        total_expenses: newTotalExpenses.toLocaleString(),
        percentage: Math.round(newRatio * 100),
        message: `CRITICAL: Expenses for ${trade.designation} have EXCEEDED the allocated budget!`,
      };

      if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        console.log('Email alert sent successfully!');
      } else {
        console.log('🔔 [MOCK EMAIL ALERT]: Budget exceeded! Configure EmailJS credentials in src/services/email.ts to send real emails.');
        console.log('Template Params:', templateParams);
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  } else if (previousRatio <= 0.75 && newRatio > 0.75) {
     // Still keep the 75% warning but for expenses
     try {
      const templateParams = {
        to_name: 'Admin',
        trade_name: trade.designation,
        supplier_name: trade.supplierName || 'Unknown',
        budget: budget.toLocaleString(),
        total_expenses: newTotalExpenses.toLocaleString(),
        percentage: Math.round(newRatio * 100),
        message: `Warning: Expenses for ${trade.designation} have reached ${Math.round(newRatio * 100)}% of the budget.`,
      };

      if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      } else {
        console.log('🔔 [MOCK EMAIL ALERT]: 75% threshold reached!', templateParams);
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }
};
