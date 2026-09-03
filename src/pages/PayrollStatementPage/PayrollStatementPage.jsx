import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import { Checkbox, Tooltip, useMediaQuery } from '@mui/material';
import DocTitle from '../../components/DocTitle/DocTitle';
import Icon from '../../components/Icon/Icon';
import Form from '../../components/Form/Form';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import BulkEditPayrollForm from '../../components/Forms/BulkEditPayrollForm/BulkEditPayrollForm';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import {
  getMyTeamEmployees,
  updateEmployeePayrollEntry,
  updateEmployeePayrollEntryStatus,
} from '../../helpers/axios/employees';
import { FILTER_ALL } from '../../helpers/status';
import {
  buildEmployeeFieldOptions,
  clampToRange,
  employeeFields,
  formatRate,
} from '../../helpers/employees';
import style from './PayrollStatementPage.module.css';

const withAllOption = options => [
  { value: FILTER_ALL, label: 'Усі' },
  ...options,
];

// "Статус" тут (фільтр над таблицею) — поки лише візуальний елемент: коли
// статуси нижче стабілізуються, фільтр підключимо окремо.
const statusFilterOptions = [{ value: FILTER_ALL, label: 'Усі' }];

// Статуси узгодження зарплатної відомості (значення синхронізовані з
// PayrollEntryStatus у fin_bk_back/utils/enums.py). NULL в базі = "Чернетка".
const PAYROLL_ENTRY_STATUS = {
  DRAFT: 1,
  SENT_FOR_REVIEW: 2,
  NEEDS_REVISION: 3,
  APPROVED: 4,
};

const PAYROLL_ENTRY_STATUS_META = {
  [PAYROLL_ENTRY_STATUS.DRAFT]: { label: 'Чернетка', color: '#6c757d' },
  [PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW]: {
    label: 'Відправлено на перевірку',
    color: '#c79a1b',
  },
  // Ці два статуси поки нема кому виставляти (чекає на бухгалтерську
  // сторону флоу) — кольори/назви готові наперед, дії в "Дія" для них нема.
  [PAYROLL_ENTRY_STATUS.NEEDS_REVISION]: {
    label: 'Повернуто на доопрацювання',
    color: '#c74736',
  },
  [PAYROLL_ENTRY_STATUS.APPROVED]: {
    label: 'Затверджено бухгалтерією',
    color: '#6b9429',
  },
};

const getPayrollEntryStatus = employee =>
  employee?.payroll_entry?.status ?? PAYROLL_ENTRY_STATUS.DRAFT;

// Заблоковано для inline/масового редагування — дані вже відправлені й
// очікують рішення бухгалтерії.
const isPayrollEntryLocked = employee =>
  getPayrollEntryStatus(employee) !== PAYROLL_ENTRY_STATUS.DRAFT;

const employeeFieldByKey = employeeFields.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

// Колонки, специфічні лише для «Зарплатної відомості» — не є полями Employee,
// тому не заведені в спільному helpers/employees.js.
const payrollFieldLabels = {
  rate: 'Ставка',
  distribution: 'Розподіл',
  month_working_days: 'Робочі дні місяця',
  worked_days: 'Відпрацьовані робочі дні',
  accrued: 'Нараховано',
  vacation_compensation: 'Компенсація відпустки',
  bonus: 'Бонус',
  taxes: 'Податки',
  total_accrued_currency: 'Всього у валюті нарахування',
  // TODO: назви цих 3 колонок мають, ймовірно, формуватись динамічно (за
  // підрозділом/статтею бюджету), а не бути статичними — поки лишили як у
  // макеті, узгодити з бізнесом пізніше.
  salary_brand_management: 'ЗП персоналу Brand Management / Salary Brand Management',
  performance_bonus_brand_management:
    'Бонус за результат Brand Management / Performance bonus Brand Management',
  benefits: "Бенефіти (моб.зв'язок, податки..) / Benefits (mobile communication, taxes..)",
  total_payout: 'Всього до виплати на руки',
  currency: 'Валюта',
  payment_form: 'Форма оплати',
  payment_details: 'Реквізити',
  // Навмисно НЕ "status" — це поле вже існує на Employee (окремий, не
  // пов'язаний з узгодженням зарплати статус), використання того самого
  // ключа випадково показало б його значення в цій колонці.
  payroll_status: 'Статус',
  action: 'Дія',
};

const payrollColumnKeys = [
  'unit',
  'department',
  'subdivision',
  'local_full_name',
  'tax_id',
  'rate',
  'distribution',
  'month_working_days',
  'worked_days',
  'accrued',
  'vacation_compensation',
  'bonus',
  'taxes',
  'total_accrued_currency',
  'salary_brand_management',
  'performance_bonus_brand_management',
  'benefits',
  'total_payout',
  'currency',
  'payment_form',
  'payment_details',
  'payroll_status',
  'action',
];

// Перші 5 колонок зафіксовані (fixedFirstColumn={5} у Table) — ховати їх
// через фільтр колонок не можна (інакше «прилипне» вже інша колонка на їхньому
// місці), тож у списку хідебл-колонок їх не буде. Той самий підхід, що й на
// «Співробітниках» (fixedColumnKeys = staffColumnKeys.slice(0, 2)).
const fixedColumnKeys = ['select', 'unit', 'department', 'subdivision', 'local_full_name'];
const hideableColumnKeys = payrollColumnKeys.filter(
  key => !fixedColumnKeys.includes(key)
);

// За замовчуванням (поки немає збереженого вибору в localStorage) ці
// колонки вимкнені — решта увімкнена.
const DEFAULT_HIDDEN_COLUMN_KEYS = ['tax_id', 'month_working_days'];
const defaultVisibleColumnKeys = hideableColumnKeys.filter(
  key => !DEFAULT_HIDDEN_COLUMN_KEYS.includes(key)
);

const VISIBLE_COLUMNS_STORAGE_KEY = 'payrollVisibleColumns';

// Поля, які керівник може редагувати inline прямо в комірці таблиці.
const EDITABLE_PAYROLL_FIELDS = [
  'distribution',
  'worked_days',
  'vacation_compensation',
  'bonus',
];

const UNSAVED_EDIT_WARNING =
  'Завершіть редагування: збережіть або скасуйте зміни перед переходом до іншої комірки';

// "Податки" в масовому редагуванні поки не входить сюди — немає відповідного
// поля в EmployeePayrollEntry на бекенді, ігноруємо його при збереженні.
const BULK_EDIT_SAVE_FIELDS = ['distribution', 'worked_days', 'bonus'];

// TODO: поки статичне значення за замовчуванням — коли з'явиться реальний
// розрахунок робочих днів місяця, замінити на нього (і в колонці "Робочі дні
// місяця", і в розрахунку "Нараховано").
const DEFAULT_MONTH_WORKING_DAYS = 22;

const PayrollStatementPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(FILTER_ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_ALL);
  const [selectedSubdivision, setSelectedSubdivision] = useState(FILTER_ALL);
  const [selectedCurrency, setSelectedCurrency] = useState(FILTER_ALL);
  const [selectedPaymentForm, setSelectedPaymentForm] = useState(FILTER_ALL);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(FILTER_ALL);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filtersResetKey, setFiltersResetKey] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    const saved = localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultVisibleColumnKeys;
  });
  const [isColumnsModalOpen, setColumnsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, field } | null
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const editingCellRef = useRef(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => new Set());
  const [isBulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [isBulkSaving, setBulkSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const monthParam = startDate.format('MM.YYYY');

  const handleColumnToggle = accessorKey => {
    setVisibleColumnKeys(prev => {
      const current = prev === 'All' ? hideableColumnKeys : prev;
      const updated = current.includes(accessorKey)
        ? current.filter(key => key !== accessorKey)
        : [...current, accessorKey];
      const next =
        updated.length === hideableColumnKeys.length ? 'All' : updated;
      localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const fetchMyTeam = async () => {
      try {
        const result = await getMyTeamEmployees(monthParam);
        setEmployees(result?.employees || []);
      } catch {
        Notify.failure('Не вдалося завантажити список співробітників.');
      }
    };

    fetchMyTeam();
  }, [monthParam]);

  // Вибір рядків скидається при зміні місяця — обране стосується конкретної
  // відомості, не має "переживати" перехід в інший місяць.
  useEffect(() => {
    setSelectedEmployeeIds(new Set());
  }, [monthParam]);

  // Поки одна комірка редагується — клік будь-де поза нею (інша комірка,
  // фільтр, перемикач місяців тощо) блокується попередженням, а не мовчки
  // скидає незбережені зміни. Перехоплюємо і mousedown, і click: сам по собі
  // preventDefault/stopPropagation на mousedown НЕ скасовує наступний click —
  // кнопки з onClick (наприклад, стрілки DateNavigator) все одно спрацьовували б.
  useEffect(() => {
    if (!editingCell) return undefined;

    const handleOutsideInteraction = event => {
      if (
        editingCellRef.current &&
        !editingCellRef.current.contains(event.target)
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'mousedown') {
          Notify.warning(UNSAVED_EDIT_WARNING);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideInteraction, true);
    document.addEventListener('click', handleOutsideInteraction, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction, true);
      document.removeEventListener('click', handleOutsideInteraction, true);
    };
  }, [editingCell]);

  const handleStartEdit = (employeeId, field, currentValue) => {
    if (editingCell) {
      Notify.warning(UNSAVED_EDIT_WARNING);
      return;
    }
    const employee = employees.find(item => item.id === employeeId);
    if (employee && isPayrollEntryLocked(employee)) {
      Notify.warning('Рядок заблокований — дані вже відправлені на перевірку.');
      return;
    }
    setEditingCell({ employeeId, field });
    setEditingValue(currentValue ?? '');
  };

  // Єдина дія, доступна керівнику зараз: відправити на перевірку або
  // скасувати відправку. "Повернуто на доопрацювання"/"Затверджено" — це
  // рішення бухгалтерії, звідси їх виставити не можна (бекенд це теж
  // перевіряє й відхилить будь-який інший перехід).
  const handleChangeEntryStatus = async (employee, newStatus) => {
    setStatusUpdatingId(employee.id);
    try {
      const result = await updateEmployeePayrollEntryStatus(employee.id, {
        month: monthParam,
        status: newStatus,
      });
      setEmployees(prev =>
        prev.map(item =>
          item.id === employee.id
            ? { ...item, payroll_entry: result?.payroll_entry }
            : item
        )
      );
      if (newStatus !== PAYROLL_ENTRY_STATUS.DRAFT) {
        setSelectedEmployeeIds(prev => {
          if (!prev.has(employee.id)) return prev;
          const next = new Set(prev);
          next.delete(employee.id);
          return next;
        });
        Notify.success('Відправлено на перевірку.');
      } else {
        Notify.success('Відправку скасовано.');
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        Notify.warning('Статус уже змінився — онови сторінку.');
      } else {
        Notify.failure('Не вдалося змінити статус.');
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      const result = await updateEmployeePayrollEntry(editingCell.employeeId, {
        month: monthParam,
        field: editingCell.field,
        value: editingValue,
      });
      setEmployees(prev =>
        prev.map(employee =>
          employee.id === editingCell.employeeId
            ? { ...employee, payroll_entry: result?.payroll_entry }
            : employee
        )
      );
      setEditingCell(null);
      setEditingValue('');
    } catch {
      Notify.failure('Не вдалося зберегти значення.');
    } finally {
      setSavingCell(false);
    }
  };

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
  const currencyOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'currency')),
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

  const filteredEmployees = useMemo(() => {
    let rows = employees;

    if (selectedUnit !== FILTER_ALL) {
      rows = rows.filter(employee => employee.unit === selectedUnit);
    }
    if (selectedDepartment !== FILTER_ALL) {
      rows = rows.filter(
        employee => employee.department === selectedDepartment
      );
    }
    if (selectedSubdivision !== FILTER_ALL) {
      rows = rows.filter(
        employee => employee.subdivision === selectedSubdivision
      );
    }
    if (selectedCurrency !== FILTER_ALL) {
      rows = rows.filter(employee => employee.currency === selectedCurrency);
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

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(employee =>
        (employee.local_full_name || '').toLowerCase().includes(query)
      );
    }

    return rows;
  }, [
    employees,
    search,
    selectedUnit,
    selectedDepartment,
    selectedSubdivision,
    selectedCurrency,
    selectedPaymentForm,
    selectedPaymentDetails,
  ]);

  const toggleEmployeeSelection = employeeId => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  // Заблоковані (відправлені на перевірку) рядки не беруть участі в
  // "вибрати все" — їх все одно не можна масово редагувати.
  const selectableEmployees = useMemo(
    () => filteredEmployees.filter(employee => !isPayrollEntryLocked(employee)),
    [filteredEmployees]
  );

  const isAllSelected =
    selectableEmployees.length > 0 &&
    selectableEmployees.every(employee => selectedEmployeeIds.has(employee.id));
  const isSomeSelected =
    !isAllSelected &&
    selectableEmployees.some(employee => selectedEmployeeIds.has(employee.id));

  const toggleAllSelected = () => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        selectableEmployees.forEach(employee => next.delete(employee.id));
      } else {
        selectableEmployees.forEach(employee => next.add(employee.id));
      }
      return next;
    });
  };

  const handleCloseSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  const selectedEmployeesList = useMemo(
    () => employees.filter(employee => selectedEmployeeIds.has(employee.id)),
    [employees, selectedEmployeeIds]
  );

  // Одне введене в модалці значення застосовується до всіх обраних, тому
  // межа — найменше "Робочі дні місяця" серед них (щоб лишалось валідним
  // для кожного співробітника, навіть коли це значення стане різним).
  const selectedMaxWorkedDays = useMemo(() => {
    if (selectedEmployeesList.length === 0) return DEFAULT_MONTH_WORKING_DAYS;
    return Math.min(
      ...selectedEmployeesList.map(
        employee => employee.month_working_days ?? DEFAULT_MONTH_WORKING_DAYS
      )
    );
  }, [selectedEmployeesList]);

  // Видалення зі списку через хрестик на чіпі в модалці — знімає вибір лише
  // з цього співробітника; якщо це був останній — закриваємо й модалку,
  // бо редагувати "обраних" з нуля співробітників сенсу не має.
  const handleRemoveFromBulkSelection = employeeId => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      next.delete(employeeId);
      if (next.size === 0) {
        setBulkEditModalOpen(false);
      }
      return next;
    });
  };

  // Поля пишуться по одному per-employee запитом (бекенд апсертить лише
  // одне поле за раз) — послідовно для кожного співробітника, щоб два
  // запити з різними полями того самого рядка не перезаписали одне одного.
  const handleBulkSave = async fieldValues => {
    const fieldsToSave = BULK_EDIT_SAVE_FIELDS.filter(
      field => fieldValues[field] !== ''
    );
    if (fieldsToSave.length === 0) return;

    setBulkSaving(true);
    try {
      for (const employee of selectedEmployeesList) {
        let latestEntry;
        for (const field of fieldsToSave) {
          const result = await updateEmployeePayrollEntry(employee.id, {
            month: monthParam,
            field,
            value: fieldValues[field],
          });
          latestEntry = result?.payroll_entry;
        }
        setEmployees(prev =>
          prev.map(item =>
            item.id === employee.id
              ? { ...item, payroll_entry: latestEntry }
              : item
          )
        );
      }
      Notify.success('Значення збережено.');
      setBulkEditModalOpen(false);
      setSelectedEmployeeIds(new Set());
    } catch {
      Notify.failure(
        'Не вдалося зберегти значення для всіх обраних співробітників.'
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'select',
        header: (
          <Checkbox
            checked={isAllSelected}
            indeterminate={isSomeSelected}
            onChange={toggleAllSelected}
            onClick={e => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedEmployeeIds.has(row.original.id)}
            disabled={isPayrollEntryLocked(row.original)}
            onChange={() => toggleEmployeeSelection(row.original.id)}
            onClick={e => e.stopPropagation()}
          />
        ),
      },
      ...payrollColumnKeys.map(key => ({
        accessorKey: key,
        header:
          key === 'accrued' ? (
            <Tooltip title="Ставка × (Розподіл / 100) × Відпрацьовані робочі дні / Робочі дні місяця">
              <span className={style.headerWithHint}>
                {payrollFieldLabels[key]}
                <Icon id="info" className={style.headerHintIcon} />
              </span>
            </Tooltip>
          ) : (
            employeeFieldByKey[key]?.label || payrollFieldLabels[key]
          ),
        cell: ({ row }) => {
          const employee = row.original;
          const value = employee[key];

          if (key === 'rate') {
            return value ? formatRate(value, employee.currency) : '-';
          }
          if (key === 'month_working_days') {
            return value ?? DEFAULT_MONTH_WORKING_DAYS;
          }

          if (key === 'accrued') {
            const rateValue = employee.rate;
            const distributionValue = employee.payroll_entry?.distribution;
            const workedDaysValue = employee.payroll_entry?.worked_days;

            const missingFields = [];
            if (!rateValue) missingFields.push('Ставка');
            if (distributionValue === null || distributionValue === undefined) {
              missingFields.push('Розподіл');
            }
            if (workedDaysValue === null || workedDaysValue === undefined) {
              missingFields.push('Відпрацьовані робочі дні');
            }

            if (missingFields.length > 0) {
              return (
                <Tooltip title={`Немає даних: ${missingFields.join(', ')}`}>
                  <span className={style.accruedMissingBadge}>-</span>
                </Tooltip>
              );
            }

            const accrued =
              (rateValue * (distributionValue / 100) * workedDaysValue) /
              DEFAULT_MONTH_WORKING_DAYS;

            return formatRate(Math.round(accrued * 100) / 100, employee.currency);
          }

          if (EDITABLE_PAYROLL_FIELDS.includes(key)) {
            const isEditing =
              editingCell?.employeeId === employee.id &&
              editingCell?.field === key;
            const savedValue = employee.payroll_entry?.[key];

            // "Розподіл" — відсоток (0-100), "Відпрацьовані робочі дні" — не
            // може перевищувати "Робочі дні місяця" цього співробітника
            // (поки завжди DEFAULT_MONTH_WORKING_DAYS, але читаємо з поля,
            // щоб підхопити реальне значення, коли воно з'явиться).
            const editLimits =
              key === 'distribution'
                ? { min: 0, max: 100 }
                : key === 'worked_days'
                ? {
                    min: 0,
                    max: employee.month_working_days ?? DEFAULT_MONTH_WORKING_DAYS,
                  }
                : null;

            if (isEditing) {
              return (
                <div ref={editingCellRef} className={style.editCellContainer}>
                  <input
                    type="number"
                    className={style.editCellInput}
                    value={editingValue}
                    autoFocus
                    disabled={savingCell}
                    min={editLimits?.min}
                    max={editLimits?.max}
                    onChange={e =>
                      setEditingValue(
                        editLimits
                          ? clampToRange(e.target.value, editLimits.min, editLimits.max)
                          : e.target.value
                      )
                    }
                  />
                  <Tooltip title="Зберегти">
                    <span>
                      <button
                        type="button"
                        className={style.editCellSaveBtn}
                        onClick={handleSaveEdit}
                        disabled={savingCell}
                      >
                        <Icon id="check" className={style.editCellIcon} />
                      </button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Скасувати">
                    <span>
                      <button
                        type="button"
                        className={style.editCellCancelBtn}
                        onClick={handleCancelEdit}
                        disabled={savingCell}
                      >
                        <Icon id="x" className={style.editCellIcon} />
                      </button>
                    </span>
                  </Tooltip>
                </div>
              );
            }

            const displayValue =
              savedValue === null || savedValue === undefined
                ? '-'
                : key === 'distribution'
                ? `${savedValue}%`
                : savedValue;

            return (
              <div className={style.viewCellContainer}>
                <span>{displayValue}</span>
                {!isPayrollEntryLocked(employee) && (
                  <button
                    type="button"
                    className={style.rateEditBtn}
                    onClick={() =>
                      handleStartEdit(employee.id, key, savedValue)
                    }
                  >
                    <Icon id="edit" className={style.rateEditIcon} />
                  </button>
                )}
              </div>
            );
          }

          if (key === 'payroll_status') {
            const statusMeta =
              PAYROLL_ENTRY_STATUS_META[getPayrollEntryStatus(employee)];
            return (
              <span
                className={style.statusBadge}
                style={{
                  borderLeft: `4px solid ${statusMeta.color}`,
                  color: statusMeta.color,
                }}
              >
                {statusMeta.label}
              </span>
            );
          }

          // Керівник поки може лише відправити на перевірку або скасувати
          // відправку — "Повернуто на доопрацювання"/"Затверджено" виставляє
          // бухгалтерія, цього флоу ще нема, тому дій для них немає.
          if (key === 'action') {
            const statusValue = getPayrollEntryStatus(employee);
            const isUpdating = statusUpdatingId === employee.id;

            if (statusValue === PAYROLL_ENTRY_STATUS.DRAFT) {
              return (
                <div className={style.actionContainer}>
                  <Tooltip title="Відправити на перевірку">
                    <span>
                      <button
                        type="button"
                        className={style.sendReviewBtn}
                        disabled={isUpdating}
                        onClick={() =>
                          handleChangeEntryStatus(
                            employee,
                            PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW
                          )
                        }
                      >
                        <Icon id="paper-plane" className={style.editIcon} />
                      </button>
                    </span>
                  </Tooltip>
                </div>
              );
            }

            if (statusValue === PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW) {
              return (
                <div className={style.actionContainer}>
                  <Tooltip title="Скасувати відправку">
                    <span>
                      <button
                        type="button"
                        className={style.cancelReviewBtn}
                        disabled={isUpdating}
                        onClick={() =>
                          handleChangeEntryStatus(
                            employee,
                            PAYROLL_ENTRY_STATUS.DRAFT
                          )
                        }
                      >
                        <Icon id="x" className={style.editIcon} />
                      </button>
                    </span>
                  </Tooltip>
                </div>
              );
            }

            return <div className={style.actionContainer}>-</div>;
          }

          return value || '-';
        },
      })),
    ],
    [
      editingCell,
      editingValue,
      savingCell,
      selectedEmployeeIds,
      isAllSelected,
      isSomeSelected,
      statusUpdatingId,
    ]
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

  const visibleColumnsCount =
    visibleColumnKeys === 'All'
      ? hideableColumnKeys.length
      : visibleColumnKeys.length;

  // "Статус" сюди не входить — поки він лише візуальний і завжди FILTER_ALL.
  const activeAdditionalFiltersCount = [
    selectedCurrency,
    selectedPaymentForm,
    selectedPaymentDetails,
  ].filter(value => value !== FILTER_ALL).length;

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
    setSelectedCurrency(FILTER_ALL);
    setSelectedPaymentForm(FILTER_ALL);
    setSelectedPaymentDetails(FILTER_ALL);
    setFiltersResetKey(prev => prev + 1);
  };

  return (
    <section className={style.mainContainer}>
      <DocTitle>Зарплатні відомості</DocTitle>

      <div className={style.header}>
        <div>
          <h1 className={style.title}>Зарплатні відомості</h1>
          <p className={style.subtitle}>
            Щомісячне нарахування та узгодження виплат підрозділу.
          </p>
        </div>

        <div className={style.headerActions}>
          <DateNavigator
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onLoading={() => {}}
          />
          <button type="button" className={style.primaryBtn}>
            <span className={style.plus}>+</span>
            Додати співробітника
          </button>
        </div>
      </div>

      <div className={style.filterContainer}>
        <div className={style.formsContainer}>
          <form className={style.searchContainer}>
            <label className={style.labelContainer}>
              <input
                type="text"
                name="search"
                className={style.inputContainer}
                placeholder="Пошук за ПІБ"
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
                fields={[
                  {
                    type: 'select',
                    name: 'status',
                    label: 'Статус',
                    options: statusFilterOptions,
                    readOnly: true,
                  },
                ]}
                defaultValues={{ status: FILTER_ALL }}
              />
            </div>
          </div>
        )}
      </div>

      <div className={style.columnsFilterRow}>
        <button
          type="button"
          className={style.filterBtn}
          onClick={() => setColumnsModalOpen(true)}
        >
          <Icon id="filter_list" className={style.filterIcon} />
          Фільтр колонок:
        </button>
        <span className={style.displayedCountText}>
          відображено
          <span className={style.displayedCountBadge}>
            {visibleColumnsCount}/{hideableColumnKeys.length}
          </span>
        </span>
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

      <Table
        data={filteredEmployees}
        columns={filteredColumns}
        styles="analyticTable"
        fixedFirstColumn={isMobile ? true : 5}
        visibleColumns={25}
        visibleColumnsMobile={2}
        enableHorizontalScroll={isMobile ? false : true}
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

      {selectedEmployeeIds.size > 0 && (
        <div className={style.bulkBar}>
          <span className={style.bulkBarText}>
            Обрано: {selectedEmployeeIds.size}{' '}
            {selectedEmployeeIds.size === 1 ? 'співробітника' : 'співробітників'}
          </span>
          <button
            type="button"
            className={style.bulkBarEditBtn}
            onClick={() => setBulkEditModalOpen(true)}
          >
            Редагувати обрані
          </button>
          <button
            type="button"
            className={style.bulkBarCloseBtn}
            onClick={handleCloseSelection}
          >
            <Icon id="x" className={style.bulkBarCloseIcon} />
          </button>
        </div>
      )}

      <ModalWindow
        isModalOpen={isBulkEditModalOpen}
        onCloseModal={() => setBulkEditModalOpen(false)}
      >
        <BulkEditPayrollForm
          employees={selectedEmployeesList}
          onRemoveEmployee={handleRemoveFromBulkSelection}
          onSave={handleBulkSave}
          saving={isBulkSaving}
          maxWorkedDays={selectedMaxWorkedDays}
          onClose={() => setBulkEditModalOpen(false)}
        />
      </ModalWindow>
    </section>
  );
};

export default PayrollStatementPage;
