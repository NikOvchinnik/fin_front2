export const mapDepartmentOptions = departments =>
  (departments || []).map(department => ({
    value: department.id,
    label: department.name,
  }));

export const getDepartmentName = record => {
  return record?.department?.name ?? '';
};

export const getDepartmentId = record => {
  return record?.department_id ?? '';
};
