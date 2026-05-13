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
 * Checks if a trade's advances exceed 75% of the budget and sends an alert.
 */
export const checkAndSendAlert = async (trade: Trade, newPaymentAmount: number) => {
  if (trade.amount <= 0) return;

  const previousTotal = trade.totalAdvances;
  const newTotal = previousTotal + newPaymentAmount;
  
  const previousRatio = previousTotal / trade.amount;
  const newRatio = newTotal / trade.amount;

  // Trigger email only if it CROSSES the 75% threshold with this payment
  if (previousRatio <= 0.75 && newRatio > 0.75) {
    try {
      const templateParams = {
        to_name: 'Admin',
        trade_name: trade.designation,
        supplier_name: trade.supplierName || 'Unknown',
        budget: trade.amount.toLocaleString(),
        total_advances: newTotal.toLocaleString(),
        percentage: Math.round(newRatio * 100),
        message: `Warning: Advances for ${trade.designation} have exceeded 75% of the allocated budget.`,
      };

      // Disable actual sending if keys are not set to prevent errors during development
      if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        console.log('Email alert sent successfully!');
      } else {
        console.log('🔔 [MOCK EMAIL ALERT]: Threshold exceeded! Configure EmailJS credentials in src/services/email.ts to send real emails.');
        console.log('Template Params:', templateParams);
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }
};
