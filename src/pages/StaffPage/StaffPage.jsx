import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import { Tooltip, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import DocTitle from '../../components/DocTitle/DocTitle';
import Form from '../../components/Form/Form';
import Icon from '../../components/Icon/Icon';
import Loader from '../../components/Loader/Loader';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import StaffRateDrawer from '../../components/StaffRateDrawer/StaffRateDrawer';
import style from './StaffPage.module.css';
import { FILTER_ALL } from '../../helpers/status';
import { getEmployeeLookups, getEmployees } from '../../helpers/axios/employees';
import {
  buildEmployeeFieldOptions,
  buildEmployeeOptions,
  employeeFields,
  formatRate,
  getMissingConfigFields,
  isEmployeeConfigured,
  normalizeEmployee,
} from '../../helpers/employees';

const withAllOption = options => [
  { value: FILTER_ALL, label: 'Усі' },
  ...options,
];

// Unit/Department/Subdivision/Position/Графік/Керівник/Валюта належать
// призначенню, не людині — якщо в співробітника кілька керівників,
// фільтр має спрацьовувати, коли значення є ХОЧА Б в одному з призначень
// (а не лише в найстарішому, яке лежить сплющеним в employee.*).
const employeeAssignments = employee =>
  employee.assignments?.length ? employee.assignments : [employee];

const matchesAnyAssignment = (employee, field, value) =>
  employeeAssignments(employee).some(assignment => assignment[field] === value);

// Порядок і набір колонок для сторінки фінансиста — частина полів спільна
// з карткою співробітника (employeeFields), частина ще не існує в моделі.
const staffColumnKeys = [
  'status',
  'local_full_name',
  'unit',
  'department',
  'subdivision',
  'position',
  'payment_form',
  'payment_details',
  'tax_id',
  'gender',
  'work_schedule',
  'manager',
  'currency',
  'rate',
];

// Перші дві колонки зафіксовані (fixedFirstColumn={2} у Table) — ховати їх
// через фільтр колонок не можна, тож у списку хідебл-колонок їх не буде.
const fixedColumnKeys = staffColumnKeys.slice(0, 2);
const hideableColumnKeys = staffColumnKeys.filter(
  key => !fixedColumnKeys.includes(key)
);

// Ці поля належать конкретному призначенню (керівнику), не людині — якщо в
// співробітника кілька призначень і значення в них різні, показуємо рядок
// нижче основного при розгортанні (той самий підхід, що на "Співробітниках").
const ASSIGNMENT_DISPLAY_FIELD_KEYS = [
  'unit',
  'department',
  'subdivision',
  'position',
  'work_schedule',
  'manager',
];

const newStaffFieldLabels = {
  status: 'Статус',
  currency: 'Валюта',
  rate: 'Ставка',
};

// "Статус" — не сире поле employee, а обчислене (isEmployeeConfigured), тому
// список значень фіксований, а не будується з даних, як інші фільтри.
const statusFilterOptions = [
  { value: FILTER_ALL, label: 'Усі' },
  { value: 'configured', label: 'Налаштовано' },
  { value: 'not_configured', label: 'Не налаштовано' },
];

const employeeFieldByKey = employeeFields.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

const StaffPage = () => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(FILTER_ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_ALL);
  const [selectedSubdivision, setSelectedSubdivision] = useState(FILTER_ALL);
  const [selectedPosition, setSelectedPosition] = useState(FILTER_ALL);
  const [selectedPaymentForm, setSelectedPaymentForm] = useState(FILTER_ALL);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(FILTER_ALL);
  const [selectedCurrency, setSelectedCurrency] = useState(FILTER_ALL);
  const [selectedStatus, setSelectedStatus] = useState(FILTER_ALL);
  const [selectedGender, setSelectedGender] = useState(FILTER_ALL);
  const [selectedWorkSchedule, setSelectedWorkSchedule] = useState(FILTER_ALL);
  const [selectedManager, setSelectedManager] = useState(FILTER_ALL);
  const [taxIdSearch, setTaxIdSearch] = useState('');
  const [showAllFilters, setShowAllFilters] = useState(false);
  // Форми-селекти фільтрів беруть defaultValues лише при монтуванні (react-hook-form) —
  // щоб після скидання вони й візуально показали "Усі", примусово ремаунтимо їх,
  // змінюючи key на кожен селект-компонент.
  const [filtersResetKey, setFiltersResetKey] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  // Відкриває дровер ставки одразу на вкладці потрібного керівника —
  // ставка/валюта/дата тепер належать конкретному призначенню.
  const openRateDrawer = (employee, assignmentId) => {
    setSelectedEmployee(employee);
    setSelectedAssignmentId(assignmentId ?? employee.assignments?.[0]?.id ?? null);
  };
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    const saved = localStorage.getItem('staffVisibleColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const [isColumnsModalOpen, setColumnsModalOpen] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set());
  // Повний довідник керівників (усі, хто може бути призначений керівником,
  // незалежно від того, чи є в них зараз хоч один співробітник) — для
  // фільтра "Керівник", на відміну від решти фільтрів, які будуються з
  // даних поточної таблиці.
  const [managerDirectory, setManagerDirectory] = useState([]);

  const toggleRowExpand = employeeId => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const handleColumnToggle = accessorKey => {
    setVisibleColumnKeys(prev => {
      const current = prev === 'All' ? hideableColumnKeys : prev;
      const updated = current.includes(accessorKey)
        ? current.filter(key => key !== accessorKey)
        : [...current, accessorKey];
      const next =
        updated.length === hideableColumnKeys.length ? 'All' : updated;
      localStorage.setItem('staffVisibleColumns', JSON.stringify(next));
      return next;
    });
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await getEmployees();
      const list = Array.isArray(response) ? response : response?.employees ?? [];
      // Спочатку "Не налаштовано" (потребують уваги фінансиста), далі
      // "Налаштовано". Всередині кожної групи — щойно додані HR зверху.
      const normalized = list
        .map(normalizeEmployee)
        .sort((a, b) => {
          const aConfigured = isEmployeeConfigured(a) ? 1 : 0;
          const bConfigured = isEmployeeConfigured(b) ? 1 : 0;
          if (aConfigured !== bConfigured) return aConfigured - bConfigured;
          return (b.id || 0) - (a.id || 0);
        });
      setEmployees(normalized);
    } catch {
      Notify.failure(t('notifications.genericError'));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const unitOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'unit')),
    [employees]
  );
  const departmentOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'department')),
    [employees]
  );
  const subdivisionOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'subdivision')),
    [employees]
  );
  const positionOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'position')),
    [employees]
  );
  const paymentFormOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'payment_form')),
    [employees]
  );
  const paymentDetailsOptions = useMemo(
    () =>
      withAllOption(buildEmployeeFieldOptions(employees, 'payment_details')),
    [employees]
  );
  const currencyOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'currency')),
    [employees]
  );
  const genderOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'gender')),
    [employees]
  );
  const workScheduleOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'work_schedule')),
    [employees]
  );
  const managerOptions = useMemo(
    () =>
      withAllOption(
        buildEmployeeOptions(managerDirectory.map(manager => manager.name))
      ),
    [managerDirectory]
  );

  useEffect(() => {
    fetchEmployees();
    getEmployeeLookups()
      .then(result => setManagerDirectory(result?.managers || []))
      .catch(() => setManagerDirectory([]));
  }, [fetchEmployees]);

  // Поки активний фільтр по полю, що належить призначенню (не людині) —
  // автоматично розгортаємо рядки з кількома призначеннями, інакше збіг
  // може ховатись у згорнутому підрядку, і незрозуміло, чому рядок узагалі
  // потрапив у вибірку.
  const hasActiveAssignmentFilter = [
    selectedUnit,
    selectedDepartment,
    selectedSubdivision,
    selectedPosition,
    selectedWorkSchedule,
    selectedManager,
    selectedCurrency,
    selectedStatus,
  ].some(value => value !== FILTER_ALL);

  const columns = useMemo(
    () =>
      staffColumnKeys.map(key => ({
        accessorKey: key,
        header: employeeFieldByKey[key]?.label || newStaffFieldLabels[key],
        cell: ({ row }) => {
          const employee = row.original;
          const assignments = employee.assignments || [];
          const hasMultipleAssignments = assignments.length > 1;
          const isExpanded =
            expandedRowIds.has(employee.id) ||
            (hasActiveAssignmentFilter && hasMultipleAssignments);

          // Ставка/валюта/дата тепер належать конкретному призначенню
          // (керівнику) — бекенд завжди віддає хоча б одне, тож для
          // employee з одним призначенням це просто один "слот", для
          // кількох — по одному на кожного керівника.
          const rateSlots = assignments.length ? assignments : [employee];

          if (key === 'status') {
            return (
              <div className={style.multiValueCell}>
                {rateSlots.map((assignment, index) => {
                  if (index > 0 && !isExpanded) return null;
                  const missingFields = getMissingConfigFields(employee, assignment);
                  const configured = missingFields.length === 0;
                  const rowClassName =
                    index === 0 ? style.multiValuePrimary : style.multiValueExtra;
                  const badge = (
                    <span
                      className={`${style.statusBadge} ${
                        configured ? style.statusConfigured : style.statusNotConfigured
                      }`}
                    >
                      <span className={style.statusDot} />
                      {configured ? 'Налаштовано' : 'Не налаштовано'}
                    </span>
                  );
                  return (
                    <div key={assignment?.id ?? index} className={rowClassName}>
                      {configured ? (
                        badge
                      ) : (
                        <Tooltip
                          title={`Незаповнені поля: ${missingFields.join(', ')}`}
                          arrow
                        >
                          {badge}
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (key === 'local_full_name') {
            const value = employee[key] || '-';
            return (
              <div className={style.multiValueCell}>
                <div className={style.multiValuePrimary}>
                  {hasMultipleAssignments && (
                    <button
                      type="button"
                      className={style.rowExpandToggle}
                      onClick={event => {
                        event.stopPropagation();
                        toggleRowExpand(employee.id);
                      }}
                    >
                      <Icon
                        id="chevron-up"
                        className={`${style.multiValueChevron} ${
                          isExpanded ? '' : style.multiValueChevronCollapsed
                        }`}
                      />
                    </button>
                  )}
                  <span>{value}</span>
                  {/* Для кількох призначень редагування — лише через рядки
                      в колонці "Ставка" нижче, щоб не було неоднозначності,
                      якого саме керівника відкриває ця іконка. */}
                  {!hasMultipleAssignments && employee.rate && (
                    <Tooltip title="Редагувати ставку" arrow>
                      <button
                        type="button"
                        className={style.rateEditBtn}
                        onClick={event => {
                          event.stopPropagation();
                          openRateDrawer(employee, assignments[0]?.id);
                        }}
                      >
                        <Icon id="edit" className={style.rateEditIcon} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          }

          if (key === 'currency') {
            return (
              <div className={style.multiValueCell}>
                {rateSlots.map((assignment, index) => {
                  if (index > 0 && !isExpanded) return null;
                  const rowClassName =
                    index === 0 ? style.multiValuePrimary : style.multiValueExtra;
                  return (
                    <div key={assignment?.id ?? index} className={rowClassName}>
                      {assignment.currency || '-'}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (key === 'rate') {
            return (
              <div className={style.multiValueCell}>
                {rateSlots.map((assignment, index) => {
                  if (index > 0 && !isExpanded) return null;
                  const rowClassName =
                    index === 0 ? style.multiValuePrimary : style.multiValueExtra;
                  return (
                    <div key={assignment?.id ?? index} className={rowClassName}>
                      {assignment.rate ? (
                        <div className={style.rateValueCell}>
                          <span>{formatRate(assignment.rate, assignment.currency)}</span>
                          <Tooltip title="Редагувати ставку" arrow>
                            <button
                              type="button"
                              className={style.rateEditBtn}
                              onClick={event => {
                                event.stopPropagation();
                                openRateDrawer(employee, assignment?.id);
                              }}
                            >
                              <Icon id="edit" className={style.rateEditIcon} />
                            </button>
                          </Tooltip>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={style.addRateBtn}
                          onClick={event => {
                            event.stopPropagation();
                            openRateDrawer(employee, assignment?.id);
                          }}
                        >
                          <Icon id="add" className={style.addRateIcon} />
                          Додати ставку
                        </button>
                      )}
                      {index === 0 && hasMultipleAssignments && (
                        <button
                          type="button"
                          className={style.rowExpandToggle}
                          onClick={event => {
                            event.stopPropagation();
                            toggleRowExpand(employee.id);
                          }}
                        >
                          <Icon
                            id="chevron-up"
                            className={`${style.multiValueChevron} ${
                              isExpanded ? '' : style.multiValueChevronCollapsed
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (ASSIGNMENT_DISPLAY_FIELD_KEYS.includes(key) && hasMultipleAssignments) {
            const uniqueValues = [
              ...new Set(assignments.map(item => item?.[key] || '-')),
            ];
            const extraValues = uniqueValues.length > 1 ? uniqueValues.slice(1) : [];
            return (
              <div className={style.multiValueCell}>
                <div className={style.multiValuePrimary}>
                  <span>{uniqueValues[0]}</span>
                </div>
                {isExpanded &&
                  extraValues.map((value, index) => (
                    <div key={index} className={style.multiValueExtra}>
                      {value}
                    </div>
                  ))}
              </div>
            );
          }

          return (
            <div className={style.multiValueCell}>
              <div className={style.multiValuePrimary}>{employee[key] || '-'}</div>
            </div>
          );
        },
      })),
    [expandedRowIds, hasActiveAssignmentFilter]
  );

  const filteredColumns = useMemo(() => {
    if (visibleColumnKeys === 'All') return columns;
    return columns.filter(
      col =>
        fixedColumnKeys.includes(col.accessorKey) ||
        visibleColumnKeys.includes(col.accessorKey)
    );
  }, [columns, visibleColumnKeys]);

  const hideableColumns = useMemo(
    () => columns.filter(col => hideableColumnKeys.includes(col.accessorKey)),
    [columns]
  );

  const filteredEmployees = useMemo(() => {
    let rows = employees;

    if (selectedUnit !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'unit', selectedUnit)
      );
    }
    if (selectedDepartment !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'department', selectedDepartment)
      );
    }
    if (selectedSubdivision !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'subdivision', selectedSubdivision)
      );
    }
    if (selectedPosition !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'position', selectedPosition)
      );
    }
    if (selectedPaymentForm !== FILTER_ALL) {
      rows = rows.filter(
        employee => employee.payment_form === selectedPaymentForm
      );
    }
    if (selectedPaymentDetails !== FILTER_ALL) {
      rows = rows.filter(
        employee => employee.payment_details === selectedPaymentDetails
      );
    }
    if (selectedCurrency !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'currency', selectedCurrency)
      );
    }
    if (selectedStatus !== FILTER_ALL) {
      rows = rows.filter(employee => {
        // "Налаштовано" — усі призначення налаштовані (нема жодного, що
        // потребує уваги); "Не налаштовано" — є хоча б одне таке.
        const fullyConfigured = employeeAssignments(employee).every(
          assignment => isEmployeeConfigured(employee, assignment)
        );
        return selectedStatus === 'configured'
          ? fullyConfigured
          : !fullyConfigured;
      });
    }
    if (selectedGender !== FILTER_ALL) {
      rows = rows.filter(employee => employee.gender === selectedGender);
    }
    if (selectedWorkSchedule !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'work_schedule', selectedWorkSchedule)
      );
    }
    if (selectedManager !== FILTER_ALL) {
      rows = rows.filter(employee =>
        matchesAnyAssignment(employee, 'manager', selectedManager)
      );
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(employee =>
        (employee.local_full_name || '').toLowerCase().includes(query)
      );
    }

    const taxIdQuery = taxIdSearch.trim();
    if (taxIdQuery) {
      rows = rows.filter(employee =>
        String(employee.tax_id ?? '').includes(taxIdQuery)
      );
    }

    return rows;
  }, [
    employees,
    search,
    taxIdSearch,
    selectedUnit,
    selectedDepartment,
    selectedSubdivision,
    selectedPosition,
    selectedPaymentForm,
    selectedPaymentDetails,
    selectedCurrency,
    selectedStatus,
    selectedGender,
    selectedWorkSchedule,
    selectedManager,
  ]);

  const activeAdditionalFiltersCount =
    [
      selectedPosition,
      selectedPaymentForm,
      selectedPaymentDetails,
      selectedCurrency,
      selectedStatus,
      selectedGender,
      selectedWorkSchedule,
      selectedManager,
    ].filter(value => value !== FILTER_ALL).length +
    (taxIdSearch.trim() !== '' ? 1 : 0);

  const hiddenColumnsCount =
    visibleColumnKeys === 'All'
      ? 0
      : hideableColumnKeys.length - visibleColumnKeys.length;

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedUnit !== FILTER_ALL ||
    selectedDepartment !== FILTER_ALL ||
    selectedSubdivision !== FILTER_ALL ||
    activeAdditionalFiltersCount > 0;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedUnit(FILTER_ALL);
    setSelectedDepartment(FILTER_ALL);
    setSelectedSubdivision(FILTER_ALL);
    setSelectedPosition(FILTER_ALL);
    setSelectedPaymentForm(FILTER_ALL);
    setSelectedPaymentDetails(FILTER_ALL);
    setSelectedCurrency(FILTER_ALL);
    setSelectedStatus(FILTER_ALL);
    setSelectedGender(FILTER_ALL);
    setSelectedWorkSchedule(FILTER_ALL);
    setSelectedManager(FILTER_ALL);
    setTaxIdSearch('');
    setFiltersResetKey(prev => prev + 1);
  };

  return (
    <section className={style.mainContainer}>
      <DocTitle>Staff</DocTitle>
      <div className={style.headerText}>
        <h1 className={style.title}>Співробітники</h1>
        <p className={style.subtitle}>
          Управління фінансовими ставками та контрактними даними штату.
        </p>
      </div>

      <div className={style.filterContainer}>
        <div className={style.formsContainer}>
          <form className={style.searchContainer}>
            <label className={style.labelContainer}>
              <input
                type="text"
                name="search"
                className={style.inputContainer}
                placeholder="Пошук за іменем співробітника"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </form>
          <div className={style.selectSlot}>
            <Form
              key={`unit-${filtersResetKey}`}
              fields={[
                {
                  type: 'select',
                  name: 'unit',
                  label: 'Unit',
                  options: unitOptions,
                  onChange: value => setSelectedUnit(value),
                },
              ]}
              defaultValues={{ unit: selectedUnit }}
            />
          </div>
          <div className={style.selectSlot}>
            <Form
              key={`department-${filtersResetKey}`}
              fields={[
                {
                  type: 'select',
                  name: 'department',
                  label: 'Department',
                  options: departmentOptions,
                  onChange: value => setSelectedDepartment(value),
                },
              ]}
              defaultValues={{ department: selectedDepartment }}
            />
          </div>
          <div className={style.selectSlot}>
            <Form
              key={`subdivision-${filtersResetKey}`}
              fields={[
                {
                  type: 'select',
                  name: 'subdivision',
                  label: 'Subdivision',
                  options: subdivisionOptions,
                  onChange: value => setSelectedSubdivision(value),
                },
              ]}
              defaultValues={{ subdivision: selectedSubdivision }}
            />
          </div>
        </div>

        {showAllFilters && (
          <div className={style.formsContainer}>
            <div className={style.selectSlot}>
              <Form
                key={`position-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'position',
                    label: 'Position',
                    options: positionOptions,
                    onChange: value => setSelectedPosition(value),
                  },
                ]}
                defaultValues={{ position: selectedPosition }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`payment_form-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'payment_form',
                    label: 'Форма оплати',
                    options: paymentFormOptions,
                    onChange: value => setSelectedPaymentForm(value),
                  },
                ]}
                defaultValues={{ payment_form: selectedPaymentForm }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`payment_details-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'payment_details',
                    label: 'Реквізити',
                    options: paymentDetailsOptions,
                    onChange: value => setSelectedPaymentDetails(value),
                  },
                ]}
                defaultValues={{ payment_details: selectedPaymentDetails }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`currency-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'currency',
                    label: 'Валюта',
                    options: currencyOptions,
                    onChange: value => setSelectedCurrency(value),
                  },
                ]}
                defaultValues={{ currency: selectedCurrency }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`status-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'status',
                    label: 'Статус',
                    options: statusFilterOptions,
                    onChange: value => setSelectedStatus(value),
                  },
                ]}
                defaultValues={{ status: selectedStatus }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`gender-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'gender',
                    label: 'Стать',
                    options: genderOptions,
                    onChange: value => setSelectedGender(value),
                  },
                ]}
                defaultValues={{ gender: selectedGender }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`work_schedule-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'work_schedule',
                    label: 'Графік роботи',
                    options: workScheduleOptions,
                    onChange: value => setSelectedWorkSchedule(value),
                  },
                ]}
                defaultValues={{ work_schedule: selectedWorkSchedule }}
              />
            </div>
            <div className={style.selectSlot}>
              <Form
                key={`manager-${filtersResetKey}`}
                fields={[
                  {
                    type: 'select',
                    name: 'manager',
                    label: 'Керівник',
                    options: managerOptions,
                    onChange: value => setSelectedManager(value),
                  },
                ]}
                defaultValues={{ manager: selectedManager }}
              />
            </div>
            <div className={style.selectSlot}>
              <label className={style.labelContainer}>
                <input
                  type="text"
                  name="tax_id"
                  className={style.inputContainer}
                  placeholder="Пошук за ІПН"
                  value={taxIdSearch}
                  onChange={e => setTaxIdSearch(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <div className={style.buttonsRow}>
          <button
            type="button"
            className={style.filterBtn}
            onClick={() => setColumnsModalOpen(true)}
          >
            <Icon id="filter_list" className={style.filterIcon} />
            Фільтр колонок
            {hiddenColumnsCount > 0 && (
              <span className={style.filterCountBadge}>
                {hiddenColumnsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={style.filterBtn}
            onClick={() => setShowAllFilters(prev => !prev)}
          >
            <Icon id="filter_list" className={style.filterIcon} />
            {showAllFilters ? 'Сховати фільтри' : 'Більше фільтрів'}
            {activeAdditionalFiltersCount > 0 && (
              <span className={style.filterCountBadge}>
                {activeAdditionalFiltersCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className={style.resetFiltersBtn}
              onClick={handleResetFilters}
            >
              <Icon id="close" className={style.filterIcon} />
              Скинути всі фільтри
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <Table
          data={filteredEmployees}
          columns={filteredColumns}
          fixedFirstColumn={2}
          styles="staffTable"
          visibleColumns={25}
          visibleColumnsMobile={2}
          enableHorizontalScroll={isMobile ? false : true}
          onRowClick={employee => {
            if ((employee.assignments || []).length > 1) {
              toggleRowExpand(employee.id);
            }
          }}
        />
      )}

      <StaffRateDrawer
        key={`${selectedEmployee?.id}-${selectedAssignmentId}`}
        isOpen={!!selectedEmployee}
        employee={selectedEmployee}
        initialAssignmentId={selectedAssignmentId}
        onClose={() => {
          setSelectedEmployee(null);
          setSelectedAssignmentId(null);
        }}
        onSaved={fetchEmployees}
      />

      <ModalWindow
        isModalOpen={isColumnsModalOpen}
        onCloseModal={() => setColumnsModalOpen(false)}
      >
        <ModalColumnsForm
          columns={hideableColumns}
          visibleColumns={visibleColumnKeys}
          handleColumnToggle={handleColumnToggle}
        />
      </ModalWindow>
    </section>
  );
};

export default StaffPage;
