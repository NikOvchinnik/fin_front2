import dayjs from 'dayjs';

export const generateDefaultPeriods = (monthsAhead = 12) => {
  const periods = [];
  const now = dayjs();

  for (let i = 0; i < monthsAhead; i++) {
    const date = now.add(i, 'month');
    const value = date.format('MM.YYYY');
    periods.push({ value, label: value });
  }

  return periods;
};