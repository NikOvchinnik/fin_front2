export const translateOptions = (options, t) =>
  (options || []).map(option => ({
    ...option,
    label: option.labelKey ? t(option.labelKey) : option.label,
  }));
