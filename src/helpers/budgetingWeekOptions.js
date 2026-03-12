import dayjs from 'dayjs';

export const ensureCurrentWeekOption = (weeks = [], currentWeek = '') => {
  if (!currentWeek) return weeks;
  if (weeks.some(week => week.value === currentWeek)) return weeks;

  return [
    ...weeks,
    {
      value: currentWeek,
      label: currentWeek,
    },
  ];
};

const WEEK_LABEL_REGEXP = /^Week\s*(\d+)$/i;
const DATE_REGEXP = /\d{4}-\d{2}-\d{2}/g;

const findWeekByDate = (weeks, date) =>
  weeks.find(week => {
    if (!week.start || !week.end) return false;
    return (
      date.isSame(week.start, 'day') ||
      date.isSame(week.end, 'day') ||
      (date.isAfter(week.start, 'day') && date.isBefore(week.end, 'day'))
    );
  });

const formatWeekRange = weekOption => {
  if (!weekOption?.start || !weekOption?.end) return '';

  const start = dayjs(weekOption.start);
  const end = dayjs(weekOption.end);
  if (!start.isValid() || !end.isValid()) return '';

  return `${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}`;
};

export const resolveWeekValue = (weeks = [], rawWeek = '') => {
  if (!rawWeek) return '';

  const normalizedWeekLabelMatch = String(rawWeek)
    .trim()
    .match(WEEK_LABEL_REGEXP);
  const normalizedWeekLabel = normalizedWeekLabelMatch
    ? `Week ${normalizedWeekLabelMatch[1]}`
    : '';
  if (
    normalizedWeekLabel &&
    weeks.some(week => week.value === normalizedWeekLabel)
  ) {
    return normalizedWeekLabel;
  }

  const [startDateRaw] = String(rawWeek).match(DATE_REGEXP) || [];
  if (!startDateRaw) return '';

  const legacyStartDate = dayjs(startDateRaw, 'YYYY-MM-DD', true);
  if (!legacyStartDate.isValid()) return '';

  const matchedWeek = findWeekByDate(weeks, legacyStartDate);
  if (matchedWeek?.value) return matchedWeek.value;

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
