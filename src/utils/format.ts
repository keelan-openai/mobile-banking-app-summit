export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const percent = (value: number) => `${Math.round(value)}%`;

export const signedCurrency = (value: number) => {
  if (value >= 0) {
    return `+${currency.format(value)}`;
  }
  return `-${currency.format(Math.abs(value))}`;
};

export const timeStampLabel = () => {
  const date = new Date();
  const hh = date.getHours() % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, '0');
  const suffix = date.getHours() >= 12 ? 'PM' : 'AM';
  return `Today • ${hh}:${mm} ${suffix}`;
};
