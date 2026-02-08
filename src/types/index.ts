export type TabKey = 'dashboard' | 'accounts' | 'card' | 'activity' | 'transfer';

export type AccountType = 'Checking' | 'Savings' | 'Brokerage' | 'Credit';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  subtitle: string;
};

export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  dateLabel: string;
  amount: number;
};

export type ActivityTone = 'neutral' | 'positive' | 'warning';

export type ActivityEvent = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: ActivityTone;
};

export type Payee = {
  id: string;
  name: string;
  mask: string;
};
