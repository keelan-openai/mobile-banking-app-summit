import { Account, ActivityEvent, Payee, Transaction } from '../types';

export const USER_NAME = 'Customer';

export const ACCOUNTS: Account[] = [
  {
    id: 'acct-checking',
    name: 'Everyday Checking',
    type: 'Checking',
    balance: 8452.18,
    subtitle: 'Available $8,291.04',
  },
  {
    id: 'acct-savings',
    name: 'High-Yield Savings',
    type: 'Savings',
    balance: 21400.55,
    subtitle: 'APY 4.35%',
  },
  {
    id: 'acct-brokerage',
    name: 'Investing Brokerage',
    type: 'Brokerage',
    balance: 12580.4,
    subtitle: 'Available to transfer $12,580.40',
  },
  {
    id: 'acct-credit',
    name: 'Rewards Card',
    type: 'Credit',
    balance: -1294.33,
    subtitle: 'Payment due Feb 20',
  },
];

export const CARD_DETAILS = {
  name: 'Everyday Debit',
  holder: 'Alex Morgan',
  last4: '4829',
  expiry: '09/29',
  network: 'VISA',
};

export const TRANSACTIONS: Transaction[] = [
  { id: 'txn-1', merchant: 'Whole Harvest Market', category: 'Groceries', dateLabel: 'Today', amount: -62.39 },
  { id: 'txn-2', merchant: 'Northline Payroll', category: 'Income', dateLabel: 'Today', amount: 3240.0 },
  { id: 'txn-3', merchant: 'CityRide', category: 'Transport', dateLabel: 'Yesterday', amount: -18.75 },
  { id: 'txn-4', merchant: 'Lumen Fitness', category: 'Health', dateLabel: 'Yesterday', amount: -72.0 },
  { id: 'txn-5', merchant: 'Aster Coffee', category: 'Dining', dateLabel: 'Feb 5', amount: -9.2 },
  { id: 'txn-6', merchant: 'Apple', category: 'Digital', dateLabel: 'Feb 5', amount: -12.99 },
  { id: 'txn-7', merchant: 'Rent Transfer', category: 'Housing', dateLabel: 'Feb 3', amount: -1850.0 },
];

export const SPENDING_BY_DAY = [72, 48, 121, 66, 154, 89, 63];

export const INSIGHTS = {
  monthlySpend: 2489.2,
  monthlyBudget: 3000,
  savingsGoal: 78,
};

export const PAYEES: Payee[] = [
  { id: 'payee-1', name: 'Jordan Lee', mask: 'Checking ••2198' },
  { id: 'payee-2', name: 'Taylor Brooks', mask: 'Savings ••0032' },
  { id: 'payee-3', name: 'Avery Carter', mask: 'Business ••8820' },
];

export const QUICK_AMOUNTS = [25, 50, 100, 250];

export const INITIAL_ACTIVITY: ActivityEvent[] = [
  {
    id: 'evt-1',
    title: 'Payroll deposited',
    detail: 'Northline Payroll • +$3,240.00',
    timeLabel: 'Today • 8:15 AM',
    tone: 'positive',
  },
  {
    id: 'evt-2',
    title: 'Card used in person',
    detail: 'Whole Harvest Market • -$62.39',
    timeLabel: 'Today • 11:42 AM',
    tone: 'neutral',
  },
  {
    id: 'evt-3',
    title: 'Large purchase alert acknowledged',
    detail: 'Rent Transfer • -$1,850.00',
    timeLabel: 'Feb 3 • 9:05 AM',
    tone: 'warning',
  },
];
