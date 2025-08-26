export const yearsOptions = (range = 10) => {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let y = currentYear + 1; y >= currentYear - range; y--) {
    years.push({ label: String(y), value: y });
  }

  return years;
};
