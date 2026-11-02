import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const roundTo2 = value => Math.round((Number(value) || 0) * 100) / 100;

export const distributeEvenly = (total, count) => {
  if (!count || count <= 0) return [];

  const totalCents = Math.round((Number(total) || 0) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from(
    { length: count },
    (_, index) =>
      (index === count - 1 ? baseCents + remainderCents : baseCents) / 100
  );
};

export const generateMonthRange = (startPeriod, endPeriod) => {
  const start = dayjs(startPeriod, 'MM.YYYY', true);
  const end = dayjs(endPeriod, 'MM.YYYY', true);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'month')) {
    return [];
  }

  const months = [];
  let cursor = start;
  while (cursor.isBefore(end, 'month') || cursor.isSame(end, 'month')) {
    months.push(cursor.format('MM.YYYY'));
    cursor = cursor.add(1, 'month');
  }

  return months;
};
