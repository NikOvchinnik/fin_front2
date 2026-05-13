export const deletedFilterTabs = [
  { value: 'false', label: 'Активні', labelKey: 'filters.active' },
  { value: 'true', label: 'Видалені', labelKey: 'filters.deleted' },
  { value: 'all', label: 'Всі', labelKey: 'filters.all' },
];

export const getDeletedFilterParam = value => {
  if (value === 'all') return 'all';
  if (value === 'true') return 'true';
  return 'false';
};

export const isDeletedRecord = record => record?.is_deleted ?? false;
