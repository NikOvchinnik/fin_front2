import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const getValidPaymentDatesOfMonth = period => {
  const monthStart = dayjs(period, 'MM.YYYY', true);
  if (!monthStart.isValid()) return [];

  const monthEnd = monthStart.endOf('month');
  const today = dayjs().startOf('day');

  const dates = [];
  let cursor = monthStart.startOf('month');
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    const dow = cursor.day();
    if ((dow === 2 || dow === 4) && cursor.isAfter(today)) {
      dates.push({
        value: cursor.format('YYYY-MM-DD'),
        label: cursor.format('DD.MM.YYYY') + (dow === 2 ? ', вт' : ', чт'),
      });
    }
    cursor = cursor.add(1, 'day');
  }

  return dates;
};
