export const deletedFilterTabs = [
  { value: 'false', label: 'Активні' },
  { value: 'true', label: 'Видалені' },
  { value: 'all', label: 'Всі' },
];

export const getDeletedFilterParam = value => {
  if (value === 'all') return 'all';
  if (value === 'true') return 'true';
  return 'false';
};

export const isDeletedRecord = record => record?.is_deleted ?? false;
