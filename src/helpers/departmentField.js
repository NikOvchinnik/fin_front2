import { isFinanceRole } from './roles';

const DEPARTMENT_KEY = 'department';
const SUBDIVISION_KEY = 'subdivision';

export const mapSubdivisionOptions = subdivisions =>
  (subdivisions || []).map(subdivision => ({
    value: subdivision.id,
    label: subdivision.name,
  }));

export const getSubdivisionName = record => {
  if (typeof record?.subdivision === 'string') return record.subdivision;
  return record?.subdivision?.name ?? '';
};

export const getSubdivisionId = record => {
  return record?.subdivision_id ?? '';
};

export const filterDepartmentColumns = (columns, userRole) =>
  columns.filter(({ accessorKey }) => {
    if (accessorKey === DEPARTMENT_KEY) return false;
    if (accessorKey === SUBDIVISION_KEY) return isFinanceRole(userRole);
    return true;
  });

export const normalizeDepartmentVisibleColumns = (visibleColumns, userRole) => {
  if (visibleColumns === 'All') return visibleColumns;
  if (!Array.isArray(visibleColumns)) return 'All';

  return visibleColumns.filter(key => {
    if (key === DEPARTMENT_KEY) return false;
    if (key === SUBDIVISION_KEY) return isFinanceRole(userRole);
    return true;
  });
};
