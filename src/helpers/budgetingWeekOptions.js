import dayjs from 'dayjs';

export const ensureCurrentWeekOption = (weeks = [], currentWeek = '') => {
  if (!currentWeek) return weeks;
  if (weeks.some(week => week.value === currentWeek)) return weeks;

  const currentWeekLabel = formatWeekLabel(currentWeek);

  return [
    ...weeks,
    {
      value: currentWeek,
      label: currentWeekLabel || currentWeek,
    },
  ];
};

const DATE_REGEXP = /\d{4}-\d{2}-\d{2}/g;

const formatWeekRange = weekOption => {
  if (!weekOption?.start || !weekOption?.end) return '';

  const start = dayjs(weekOption.start);
  const end = dayjs(weekOption.end);
  if (!start.isValid() || !end.isValid()) return '';

  return `${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}`;
};

const formatWeekLabel = rawWeek => {
  const rangeDates = String(rawWeek).match(DATE_REGEXP) || [];
  if (rangeDates.length < 2) return '';

  const start = dayjs(rangeDates[0], 'YYYY-MM-DD', true);
  const end = dayjs(rangeDates[1], 'YYYY-MM-DD', true);
  if (!start.isValid() || !end.isValid()) return '';

  return `${start.format('DD.MM')} - ${end.format('DD.MM')}`;
};

export const getWeeksOfMonth = period => {
  if (!period) return [];

  const [month, year] = period.split('.');
  const startOfMonth = dayjs(`${year}-${month}-01`);
  const endOfMonth = startOfMonth.endOf('month');

  const weeks = [];
  let currentStart = startOfMonth;

  if (currentStart.day() !== 1) {
    const offset = currentStart.day() === 0 ? 6 : currentStart.day() - 1;
    currentStart = currentStart.subtract(offset, 'day');
    if (currentStart.isBefore(startOfMonth)) currentStart = startOfMonth;
  }

  while (
    currentStart.isBefore(endOfMonth) ||
    currentStart.isSame(endOfMonth, 'day')
  ) {
    let weekStart = currentStart;
    let weekEnd = weekStart.add(6 - weekStart.day() + 1, 'day');
    if (weekEnd.isAfter(endOfMonth)) weekEnd = endOfMonth;

    weeks.push({ start: weekStart, end: weekEnd });

    currentStart = weekEnd.add(1, 'day');
  }

  const hasTueOrThu = week => {
    for (
      let d = week.start;
      d.isBefore(week.end) || d.isSame(week.end, 'day');
      d = d.add(1, 'day')
    ) {
      const dow = d.day();
      if (dow === 2 || dow === 4) return true;
    }
    return false;
  };

  const adjusted = [];
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    if (!hasTueOrThu(week)) {
      if (i > 0) {
        adjusted[adjusted.length - 1].end = week.end;
      } else if (weeks[i + 1]) {
        weeks[i + 1].start = week.start;
      }
    } else {
      adjusted.push(week);
    }
  }

  return adjusted.map(week => {
    const weekRange = formatWeekRange(week);
    return {
      value: weekRange,
      label: formatWeekLabel(weekRange),
      start: week.start,
      end: week.end,
    };
  });
};

export const resolveWeekValue = (weeks = [], rawWeek = '') => {
  if (!rawWeek) return '';

  const normalizedRawWeek = String(rawWeek).trim();
  if (weeks.some(week => week.value === normalizedRawWeek)) {
    return normalizedRawWeek;
  }

  const rangeDates = normalizedRawWeek.match(DATE_REGEXP) || [];
  if (rangeDates.length >= 2) {
    return `${rangeDates[0]}_${rangeDates[1]}`;
  }

  return '';
};

export const resolveWeekRangeValue = (weeks = [], rawWeek = '') => {
  if (!rawWeek) return '';

  const matchedWeek = weeks.find(week => week.value === rawWeek);
  const matchedWeekRange = formatWeekRange(matchedWeek);
  if (matchedWeekRange) return matchedWeekRange;

  const rangeDates = String(rawWeek).match(DATE_REGEXP) || [];
  if (rangeDates.length >= 2) {
    return `${rangeDates[0]}_${rangeDates[1]}`;
  }

  return rawWeek;
};
