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
