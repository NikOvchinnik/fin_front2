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
import PaymentChangeNote from '../../components/PaymentChangeNote/PaymentChangeNote';
import BulkEditPayrollForm from '../../components/Forms/BulkEditPayrollForm/BulkEditPayrollForm';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import {
  deleteEmployeePayrollSplit,
  getEmployeeLookups,
  getMyTeamEmployees,
  getPayrollExpenseItems,
  updateEmployeePayrollEntry,
  updateEmployeePayrollEntryStatus,
  updateEmployeePayrollExpenseValue,
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
  // APPROVED/NEEDS_REVISION виставляє фінансист на окремій сторінці огляду
  // ("Перевірка відомостей", PayrollReviewPage). NEEDS_REVISION тут, на
  // сторінці керівника, має дію-олівець (повертає запис у DRAFT, щоб
  // редагувати й надіслати повторно) — див. колонку "Дія" нижче.
  [PAYROLL_ENTRY_STATUS.NEEDS_REVISION]: {
    label: 'Повернуто на доопрацювання',
    color: '#c74736',
  },
  [PAYROLL_ENTRY_STATUS.APPROVED]: {
    label: 'Затверджено фінансистом',
    color: '#6b9429',
  },
};

// entryData — сирий запис (employee.payroll_entry або один з
// employee.extra_payroll_entries) — щоб один і той самий код визначав
// статус/блокування незалежно від того, який саме відрізок місяця це.
const getEntryStatus = entryData => entryData?.status ?? PAYROLL_ENTRY_STATUS.DRAFT;
const isEntryLocked = entryData => getEntryStatus(entryData) !== PAYROLL_ENTRY_STATUS.DRAFT;

const getPayrollEntryStatus = employee => getEntryStatus(employee?.payroll_entry);

// Клас підсвітки рядка (row.original.className, читає Table.jsx) — див.
// відповідні класи в Table.module.css. "Чернетка" навмисно без класу
// (default look).
const STATUS_ROW_CLASS_NAME = {
  [PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW]: 'statusSentForReview',
  [PAYROLL_ENTRY_STATUS.NEEDS_REVISION]: 'statusNeedsRevision',
  [PAYROLL_ENTRY_STATUS.APPROVED]: 'statusApproved',
};

const getRowClassName = employee => STATUS_ROW_CLASS_NAME[getPayrollEntryStatus(employee)];

// Заблоковано для inline/масового редагування — дані вже відправлені й
// очікують рішення бухгалтерії. Дивиться лише на ПЕРШИЙ відрізок місяця —
// вибір рядка чекбоксом і масове редагування навмисно стосуються лише його
// (див. коментар біля selectableEmployees нижче).
const isPayrollEntryLocked = employee => isEntryLocked(employee?.payroll_entry);

// Масове редагування пише лише в перший рядок — людей з кількома рядками не даємо обрати.
const isBulkSelectable = employee =>
  !isPayrollEntryLocked(employee) && !hasMultipleRows(employee);

const getSegments = employee =>
  [employee.payroll_entry, ...(employee.extra_payroll_entries || [])].filter(Boolean);

// Плоский список рядків: кожен відрізок, а під ним його рядки юнітів (split_rows).
const getEntrySlots = employee =>
  getSegments(employee).flatMap(segment => [segment, ...(segment.split_rows || [])]);

const hasMultipleRows = employee => getEntrySlots(employee).length > 1;

const getSplitUnits = employee =>
  getSegments(employee)
    .flatMap(segment => segment.split_rows || [])
    .map(row => row.unit)
    .filter(Boolean);

const hasUnitSplit = employee =>
  getSegments(employee).some(segment => (segment.split_rows || []).length > 0);

// Ключ відрізка з бекенду: null — перший, "r:<id>"/"t:<id>" — зі зміни ставки/податку.
const getPeriodKey = entryData => entryData?.period_key ?? null;

// 0 — основний рядок відрізка, 1+ — рядки юнітів.
const getSplitNo = entryData => entryData?.split_no ?? 0;
const isSplitRow = entryData => getSplitNo(entryData) > 0;

const getSlotKey = entryData => `${getPeriodKey(entryData) ?? 'primary'}:${getSplitNo(entryData)}`;

const formatPercent = value => Math.round((value ?? 0) * 100) / 100;

const getSegmentSplitProblem = segment => {
  if (!segment) return null;
  const total = segment.distribution_total ?? segment.distribution ?? 0;
  if (Math.abs(total - 100) > 1e-6) {
    return `Сума розподілу ${formatPercent(total)}% — має бути 100%`;
  }
  if ((segment.split_rows || []).some(row => !row.unit_id)) {
    return 'Оберіть юніт у кожному рядку розподілу';
  }
  return null;
};

const findSegment = (employee, periodKey) =>
  getSegments(employee).find(segment => getPeriodKey(segment) === periodKey);

const formatEffectiveDate = isoDate =>
  isoDate ? dayjs(isoDate).format('DD.MM.YYYY') : null;

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
  taxes: 'Бенефіти',
  total_accrued_currency: 'Всього у валюті нарахування',
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

// Колонки до/після блоку "статей витрат" — той блок не фіксований за
// кількістю (2-9 колонок залежно від Subdivision, з payroll_expense_items
// на бекенді, див. buildPayrollColumnKeys нижче), тому payrollColumnKeys
// більше не стала константа, а функція.
const PAYROLL_COLUMN_KEYS_BEFORE_EXPENSE_ITEMS = [
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
];
const PAYROLL_COLUMN_KEYS_AFTER_EXPENSE_ITEMS = [
  'total_payout',
  'currency',
  'payment_form',
  'payment_details',
  'payroll_status',
  'action',
];

const EXPENSE_ITEM_KEY_PREFIX = 'expense_item_';
const toExpenseItemKey = id => `${EXPENSE_ITEM_KEY_PREFIX}${id}`;

// Людські назви змінних для тултіпа з формулою на клітинці — синхронізовано
// зі словником у _formula_variables (fin_bk_back/routes/employees.py).
// "gross_factor" сюди навмисно НЕ входить — його підставляємо конкретним
// числом (чи прибираємо) для кожного співробітника окремо, до перекладу
// решти змінних, див. describeFormulaForEmployee.
const FORMULA_VARIABLE_LABELS = {
  rate: 'Ставка',
  distribution: 'Розподіл',
  worked_days: 'Відпрацьовані дні',
  vacation_compensation: 'Компенсація відпустки',
  bonus: 'Бонус',
  accrued: 'Нараховано',
  taxes: 'Бенефіти',
  month_working_days: 'Робочі дні місяця',
};

const GROSS_TAX_FORMULA = 'ставка Gross';
const GROSS_FACTOR = 0.95;

// "* gross_factor" — множення на 1 (не-Gross) прибираємо повністю замість
// показу "* 1", щоб формула читалась природно; для Gross підставляємо
// конкретне число 0.95 замість символьної назви змінної.
const resolveGrossFactor = (formula, isGross) => {
  if (!isGross) {
    return formula
      .replace(/\*\s*gross_factor\b/g, '')
      .replace(/\bgross_factor\s*\*/g, '')
      .trim();
  }
  return formula.replace(/\bgross_factor\b/g, String(GROSS_FACTOR));
};

const describeFormulaForEmployee = (formula, taxFormula) => {
  const resolved = resolveGrossFactor(formula, taxFormula === GROSS_TAX_FORMULA);
  return Object.entries(FORMULA_VARIABLE_LABELS).reduce(
    (text, [variable, label]) =>
      text.replace(new RegExp(`\\b${variable}\\b`, 'g'), label),
    resolved
  );
};

const buildPayrollColumnKeys = expenseItemKeys => [
  ...PAYROLL_COLUMN_KEYS_BEFORE_EXPENSE_ITEMS,
  ...expenseItemKeys,
  ...PAYROLL_COLUMN_KEYS_AFTER_EXPENSE_ITEMS,
];

// Перші 5 колонок зафіксовані (fixedFirstColumn={5} у Table) — ховати їх
// через фільтр колонок не можна (інакше «прилипне» вже інша колонка на їхньому
// місці), тож у списку хідебл-колонок їх не буде. Той самий підхід, що й на
// «Співробітниках» (fixedColumnKeys = staffColumnKeys.slice(0, 2)).
const fixedColumnKeys = ['select', 'unit', 'department', 'subdivision', 'local_full_name'];

// За замовчуванням (поки немає збереженого вибору в localStorage) ці
// колонки вимкнені — решта увімкнена (включно зі статтями витрат).
const DEFAULT_HIDDEN_COLUMN_KEYS = ['tax_id', 'month_working_days'];

// Новий ключ (не "payrollVisibleColumns") — семантика зберігання змінилась
// зі "список видимих" на "список схованих" (див. hiddenColumnKeys вище),
// стара збережена в браузерах команди пара ключ/значення інакше
// прочиталась би навпаки.
const HIDDEN_COLUMNS_STORAGE_KEY = 'payrollHiddenColumns';

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
// "Розподіл" — лише вручну по людині (менше 100% створює рядок юніта).
const BULK_EDIT_SAVE_FIELDS = ['worked_days', 'bonus'];

// TODO: поки статичне значення за замовчуванням — коли з'явиться реальний
// розрахунок робочих днів місяця, замінити на нього (і в колонці "Робочі дні
// місяця", і в розрахунку "Нараховано").
const DEFAULT_MONTH_WORKING_DAYS = 22;

// "Нараховано"/"Податки"/"Всього у валюті нарахування" тепер рахує бекенд
// (routes/employees.py, той самий формулу погоджено з фінансистом на
// конкретних прикладах — 734/2759 при ставці 10 000) і віддає готовими
// числами в employee.payroll_entry.{accrued,taxes,total_accrued_currency}.
// Тут лишається тільки: (1) визначити, яких вхідних даних бракує — щоб
// показати "-" з підказкою, і (2) текст для тултіпа з описом формули.
// entryData — відрізок місяця: payroll_entry або один з extra_payroll_entries.
const getAccruedMissingFieldsForEntry = entryData => {
  const missing = [];
  if (!entryData?.rate) missing.push('Ставка');
  if (entryData?.distribution == null) missing.push('Розподіл');
  if (entryData?.worked_days == null) {
    missing.push('Відпрацьовані робочі дні');
  }
  return missing;
};

const getPayrollTotalsMissingFieldsForEntry = (employee, entryData) => {
  const missing = getAccruedMissingFieldsForEntry(entryData);
  if (!employee.tax_formula) missing.push('Бенефіти');
  return missing;
};

// Людською мовою — та сама формула, що рахує бекенд.
const TAX_FORMULA_DESCRIPTIONS = {
  'ставка Nett': 'Бенефіти не нараховуються.',
  'ставка Gross': 'Бенефіти не нараховуються.',
  'ставка без КП': 'Бенефіти не нараховуються.',
  'ставка + КП (6%)':
    'Бенефіти = (Нараховано + Компенсація відпустки + Бонус) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
  'ставка + КП (6%+ЄСВ)':
    'Бенефіти = (Нараховано + Компенсація відпустки + Бонус + 1903) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
};

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
  // { [subdivisionName]: [{id, name, description}, ...] } — з бекенду
  // (payroll_expense_items), не залежить від місяця, тож завантажується
  // один раз при монтуванні.
  const [expenseItemsBySubdivision, setExpenseItemsBySubdivision] = useState({});
  // Доки не true — ще не знаємо, чи в активного Subdivision взагалі є
  // Список СХОВАНИХ (не видимих!) колонок — навмисно навпаки, ніж
  // здавалося б природним, саме через динамічні expense_item_* колонки:
  // їхні ключі (id статей) різні для кожного Subdivision/табу, тож
  // "список видимих" довелось би постійно досинхронізовувати з тим, які
  // колонки взагалі зараз існують. Список схованих натомість — стабільний:
  // нова динамічна колонка просто ніколи туди й не потрапляє, тобто вона
  // видима за замовчуванням без жодної спеціальної логіки.
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState(() => {
    const saved = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_HIDDEN_COLUMN_KEYS;
  });
  const [isColumnsModalOpen, setColumnsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, field, periodKey, splitNo } | null
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const editingCellRef = useRef(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => new Set());
  const [isBulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [isBulkSaving, setBulkSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  // Згорнуті рядки (підрядки відрізків ставки та юнітів за замовчуванням розгорнуті).
  const [collapsedRowIds, setCollapsedRowIds] = useState(() => new Set());
  const [unitLookup, setUnitLookup] = useState([]);
  const [splitSavingKey, setSplitSavingKey] = useState(null);
  const [pendingSplitDelete, setPendingSplitDelete] = useState(null); // { employee, entryData } | null

  const toggleRowExpand = employeeId => {
    setCollapsedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const monthParam = startDate.format('MM.YYYY');

  const handleColumnToggle = accessorKey => {
    setHiddenColumnKeys(prev => {
      const next = prev.includes(accessorKey)
        ? prev.filter(key => key !== accessorKey)
        : [...prev, accessorKey];
      localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Винесено з useEffect (а не inline) — потрібна ще й для повторного
  // завантаження після масового редагування, не лише при зміні місяця.
  const fetchMyTeam = async () => {
    try {
      const result = await getMyTeamEmployees(monthParam);
      const list = result?.employees || [];
      // Table (Table.jsx) читає className рядка з row.original.className —
      // саме так підсвічуємо рядки за статусом узгодження, див.
      // getRowClassName.
      setEmployees(
        list.map(employee => ({
          ...employee,
          className: getRowClassName(employee),
        }))
      );
    } catch {
      Notify.failure('Не вдалося завантажити список співробітників.');
    }
  };

  useEffect(() => {
    fetchMyTeam();
  }, [monthParam]);

  useEffect(() => {
    getPayrollExpenseItems()
      .then(result => setExpenseItemsBySubdivision(result || {}))
      .catch(() => setExpenseItemsBySubdivision({}));
    getEmployeeLookups()
      .then(result => setUnitLookup(result?.units || []))
      .catch(() => setUnitLookup([]));
  }, []);

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

  // Бекенд після кожної зміни віддає весь місяць (month_entries) — замінюємо всі відрізки разом.
  const applyMonthEntries = (employeeId, result) => {
    const monthEntries = result?.month_entries;
    if (!monthEntries) return;
    setEmployees(prev =>
      prev.map(item => {
        if (item.id !== employeeId) return item;
        const next = {
          ...item,
          payroll_entry: monthEntries.payroll_entry,
          extra_payroll_entries: monthEntries.extra_payroll_entries || [],
          combined_totals: monthEntries.combined_totals,
          rate: monthEntries.payroll_entry?.rate,
          currency: monthEntries.payroll_entry?.currency,
        };
        return { ...next, className: getRowClassName(next) };
      })
    );
  };

  const getPayrollErrorMessage = (error, fallback) =>
    error?.response?.data?.code || error?.response?.status === 400
      ? error.response.data?.message || fallback
      : fallback;

  const handleStartEdit = (employee, entryData, field, currentValue) => {
    if (editingCell) {
      Notify.warning(UNSAVED_EDIT_WARNING);
      return;
    }
    if (entryData && isEntryLocked(entryData)) {
      Notify.warning('Рядок заблокований — дані вже відправлені на перевірку.');
      return;
    }
    setEditingCell({
      employeeId: employee.id,
      periodKey: getPeriodKey(entryData),
      splitNo: getSplitNo(entryData),
      field,
    });
    setEditingValue(currentValue ?? '');
  };

  const isEditingSlot = (employee, entryData, field) =>
    editingCell?.employeeId === employee.id &&
    editingCell?.periodKey === getPeriodKey(entryData) &&
    editingCell?.splitNo === getSplitNo(entryData) &&
    editingCell?.field === field;

  // Єдина дія, доступна керівнику зараз: відправити на перевірку або
  // скасувати відправку. "Повернуто на доопрацювання"/"Затверджено" — це
  // рішення бухгалтерії, звідси їх виставити не можна (бекенд це теж
  // перевіряє й відхилить будь-який інший перехід). Кожен відрізок має власний
  // статус, спільний для всіх його рядків юнітів.
  const handleChangeEntryStatus = async (employee, periodKey, newStatus) => {
    const statusKey = `${employee.id}:${periodKey ?? 'primary'}`;
    setStatusUpdatingId(statusKey);
    try {
      const result = await updateEmployeePayrollEntryStatus(employee.id, {
        month: monthParam,
        status: newStatus,
        period_key: periodKey,
      });
      applyMonthEntries(employee.id, result);
      if (newStatus !== PAYROLL_ENTRY_STATUS.DRAFT) {
        if (periodKey === null) {
          setSelectedEmployeeIds(prev => {
            if (!prev.has(employee.id)) return prev;
            const next = new Set(prev);
            next.delete(employee.id);
            return next;
          });
        }
        Notify.success('Відправлено на перевірку.');
      } else {
        Notify.success('Можна редагувати — запис знову в чернетках.');
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        Notify.warning('Статус уже змінився — онови сторінку.');
      } else {
        Notify.failure(getPayrollErrorMessage(error, 'Не вдалося змінити статус.'));
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const countSplitRows = (employeeId, periodKey) => {
    const employee = employees.find(item => item.id === employeeId);
    return (findSegment(employee || {}, periodKey)?.split_rows || []).length;
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    setSavingCell(true);
    const { employeeId, periodKey, splitNo, field } = editingCell;
    const splitRowsBefore = countSplitRows(employeeId, periodKey);
    try {
      // Ручні статті витрат (calc_type="manual") — окремий ендпоінт, окремо для кожного рядка.
      const result = field.startsWith(EXPENSE_ITEM_KEY_PREFIX)
        ? await updateEmployeePayrollExpenseValue(employeeId, {
            month: monthParam,
            expense_item_id: Number(field.slice(EXPENSE_ITEM_KEY_PREFIX.length)),
            value: editingValue,
            period_key: periodKey,
            split_no: splitNo,
          })
        : await updateEmployeePayrollEntry(employeeId, {
            month: monthParam,
            field,
            value: editingValue,
            period_key: periodKey,
            split_no: splitNo,
          });
      applyMonthEntries(employeeId, result);
      setEditingCell(null);
      setEditingValue('');
      const splitRowsAfter = (result?.payroll_entry?.split_rows || []).length;
      if (field === 'distribution' && splitRowsAfter > splitRowsBefore) {
        Notify.info('Додано рядок із залишком розподілу — оберіть для нього юніт.');
      }
    } catch (error) {
      Notify.failure(getPayrollErrorMessage(error, 'Не вдалося зберегти значення.'));
    } finally {
      setSavingCell(false);
    }
  };

  const handleSplitUnitChange = async (employee, entryData, unitId) => {
    if (editingCell) {
      Notify.warning(UNSAVED_EDIT_WARNING);
      return;
    }
    const savingKey = `${employee.id}:${getSlotKey(entryData)}`;
    setSplitSavingKey(savingKey);
    try {
      const result = await updateEmployeePayrollEntry(employee.id, {
        month: monthParam,
        field: 'unit_id',
        value: unitId,
        period_key: getPeriodKey(entryData),
        split_no: getSplitNo(entryData),
      });
      applyMonthEntries(employee.id, result);
    } catch (error) {
      Notify.failure(getPayrollErrorMessage(error, 'Не вдалося зберегти юніт.'));
    } finally {
      setSplitSavingKey(null);
    }
  };

  const handleConfirmSplitDelete = async () => {
    if (!pendingSplitDelete) return;
    const { employee, entryData } = pendingSplitDelete;
    const savingKey = `${employee.id}:${getSlotKey(entryData)}`;
    setSplitSavingKey(savingKey);
    try {
      const result = await deleteEmployeePayrollSplit(employee.id, {
        month: monthParam,
        period_key: getPeriodKey(entryData),
        split_no: getSplitNo(entryData),
      });
      applyMonthEntries(employee.id, result);
      setPendingSplitDelete(null);
      const total = result?.payroll_entry?.distribution_total;
      if (total != null && Math.abs(total - 100) > 1e-6) {
        Notify.warning(
          `Рядок видалено. Сума розподілу тепер ${formatPercent(total)}% — розподіліть залишок вручну.`
        );
      } else {
        Notify.success('Рядок видалено.');
      }
    } catch (error) {
      Notify.failure(getPayrollErrorMessage(error, 'Не вдалося видалити рядок.'));
    } finally {
      setSplitSavingKey(null);
    }
  };

  const unitOptions = useMemo(
    () =>
      withAllOption(
        buildEmployeeFieldOptions(employees, 'unit', employees.flatMap(getSplitUnits))
      ),
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
  // Таби показуємо лише коли в команди керівника є 2+ різних Subdivision —
  // якщо він один (типовий випадок), таблиця лишається як була, без табів.
  const subdivisionTabs = useMemo(
    () => subdivisionOptions.slice(1),
    [subdivisionOptions]
  );
  const hasSubdivisionTabs = subdivisionTabs.length > 1;

  // Коли з'явились/змінились таби (інший місяць — інша команда), а поточний
  // вибір Subdivision більше не серед них (типово — щойно завантажились,
  // FILTER_ALL) — перемикаємось на перший таб, щоб одразу було видно дані,
  // а не порожню таблицю чи неактивний жоден таб.
  useEffect(() => {
    if (
      hasSubdivisionTabs &&
      !subdivisionTabs.some(tab => tab.value === selectedSubdivision)
    ) {
      setSelectedSubdivision(subdivisionTabs[0].value);
    }
  }, [hasSubdivisionTabs, subdivisionTabs]);

  // Активний Subdivision для блоку "статей витрат" (колонки з
  // payroll_expense_items): якщо табів кілька — це обраний таб (у ньому всі
  // рядки гарантовано одного Subdivision); якщо один/жодного — весь
  // fetched-список і так одного Subdivision, беремо його з першого рядка.
  const activeSubdivisionName = hasSubdivisionTabs
    ? selectedSubdivision
    : employees[0]?.subdivision || null;

  const activeExpenseItems = useMemo(
    () =>
      (activeSubdivisionName &&
        expenseItemsBySubdivision[activeSubdivisionName]) ||
      [],
    [activeSubdivisionName, expenseItemsBySubdivision]
  );
  const expenseItemKeys = useMemo(
    () => activeExpenseItems.map(item => toExpenseItemKey(item.id)),
    [activeExpenseItems]
  );
  const expenseItemByKey = useMemo(
    () =>
      Object.fromEntries(
        activeExpenseItems.map(item => [toExpenseItemKey(item.id), item])
      ),
    [activeExpenseItems]
  );

  const payrollColumnKeys = useMemo(
    () => buildPayrollColumnKeys(expenseItemKeys),
    [expenseItemKeys]
  );
  const hideableColumnKeys = useMemo(
    () => payrollColumnKeys.filter(key => !fixedColumnKeys.includes(key)),
    [payrollColumnKeys]
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
      rows = rows.filter(
        employee => employee.unit === selectedUnit || getSplitUnits(employee).includes(selectedUnit)
      );
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
    () => filteredEmployees.filter(isBulkSelectable),
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
        employee =>
          employee.payroll_entry?.month_working_days ?? DEFAULT_MONTH_WORKING_DAYS
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
        let latestResult;
        for (const field of fieldsToSave) {
          latestResult = await updateEmployeePayrollEntry(employee.id, {
            month: monthParam,
            field,
            value: fieldValues[field],
          });
        }
        applyMonthEntries(employee.id, latestResult);
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

  // Значення клітинки по всіх рядках місяця (відрізки + рядки юнітів), стеком.
  const renderStackedSlots = (employee, renderSlot) => {
    const slots = getEntrySlots(employee);
    if (slots.length <= 1) {
      return renderSlot(slots[0], false, 0);
    }
    const isExpanded = !collapsedRowIds.has(employee.id);
    return (
      <div className={style.multiValueCell}>
        {slots.map((entryData, index) => {
          if (index > 0 && !isExpanded) return null;
          const slotClassName =
            index === 0
              ? style.multiValuePrimary
              : isSplitRow(entryData)
              ? `${style.multiValueExtra} ${style.multiValueSplit}`
              : style.multiValueExtra;
          return (
            <div key={getSlotKey(entryData)} className={slotClassName}>
              {renderSlot(entryData, index > 0, index)}
            </div>
          );
        })}
      </div>
    );
  };

  // Підсумки (Всього, статті за формулою): без юнітів — одне число за місяць.
  const renderTotalCell = (employee, renderSlot, renderCombined) => {
    if (!hasMultipleRows(employee)) {
      return renderSlot(employee.payroll_entry);
    }
    // При розподілі на юніти кожен рядок має власні суми.
    if (hasUnitSplit(employee)) {
      return renderStackedSlots(employee, entryData => renderSlot(entryData));
    }
    return renderCombined(employee.combined_totals || {});
  };

  const renderEditCell = editLimits => (
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
            editLimits?.max != null
              ? clampToRange(e.target.value, editLimits.min, editLimits.max)
              : e.target.value
          )
        }
        onKeyDown={e => {
          if (e.key === 'Enter' && !savingCell) {
            e.preventDefault();
            handleSaveEdit();
          }
        }}
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
        cell: ({ row }) => {
          const checkbox = (
            <Checkbox
              checked={selectedEmployeeIds.has(row.original.id)}
              disabled={!isBulkSelectable(row.original)}
              onChange={() => toggleEmployeeSelection(row.original.id)}
              onClick={e => e.stopPropagation()}
            />
          );
          return hasMultipleRows(row.original) ? (
            <Tooltip
              title={
                hasUnitSplit(row.original)
                  ? 'Зарплата розподілена між юнітами — редагуйте вручну'
                  : 'У місяці кілька відрізків ставки/податку — редагуйте вручну'
              }
              arrow
            >
              <span>{checkbox}</span>
            </Tooltip>
          ) : (
            checkbox
          );
        },
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
          ) : key.startsWith(EXPENSE_ITEM_KEY_PREFIX) ? (
            // Динамічна колонка "статті витрат" (payroll_expense_items) —
            // назва залежить від активного Subdivision, не статична, тому
            // береться з expenseItemByKey, а не з payrollFieldLabels. Без
            // тултіпа з описом — не потрібен.
            expenseItemByKey[key]?.name
          ) : (
            employeeFieldByKey[key]?.label || payrollFieldLabels[key]
          ),
        cell: ({ row }) => {
          const employee = row.original;
          const value = employee[key];

          if (key === 'local_full_name') {
            const isExpanded = !collapsedRowIds.has(employee.id);
            const extraCount = getEntrySlots(employee).length - 1;
            return (
              <div className={style.nameCellContainer}>
                {hasMultipleRows(employee) && (
                  <Tooltip
                    title={
                      isExpanded
                        ? 'Згорнути'
                        : `Ще ${extraCount} ${extraCount === 1 ? 'рядок' : 'рядки'} (юніти / зміна ставки)`
                    }
                  >
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
                  </Tooltip>
                )}
                <span>{value || '-'}</span>
              </div>
            );
          }

          // Юніт: основний рядок — з призначення, рядки розподілу — вибір з усіх юнітів.
          if (key === 'unit' && hasUnitSplit(employee)) {
            return renderStackedSlots(employee, entryData => {
              if (!isSplitRow(entryData)) return value || '-';
              if (isEntryLocked(entryData)) {
                return entryData.unit || (
                  <span className={style.accruedMissingBadge}>Юніт не обрано</span>
                );
              }
              const isSaving = splitSavingKey === `${employee.id}:${getSlotKey(entryData)}`;
              return (
                <select
                  className={`${style.unitSelect} ${entryData.unit_id ? '' : style.unitSelectEmpty}`}
                  value={entryData.unit_id ?? ''}
                  disabled={isSaving || Boolean(editingCell)}
                  onChange={event =>
                    handleSplitUnitChange(employee, entryData, event.target.value || null)
                  }
                >
                  <option value="">Оберіть юніт</option>
                  {unitLookup.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              );
            });
          }

          if (key === 'rate') {
            return renderStackedSlots(employee, (entryData, isExtra) => (
              <>
                {entryData?.rate ? formatRate(entryData.rate, entryData.currency) : '-'}
                {isExtra && entryData?.period_effective_date && (
                  <span className={style.periodLabel}>
                    {' '}
                    з {formatEffectiveDate(entryData.period_effective_date)}
                  </span>
                )}
              </>
            ));
          }
          if (key === 'currency') {
            return renderStackedSlots(employee, entryData => entryData?.currency || '-');
          }
          if (key === 'month_working_days') {
            // Для відправлених — значення на момент відправки.
            return employee.payroll_entry?.month_working_days ?? DEFAULT_MONTH_WORKING_DAYS;
          }

          // Нараховано/Податки/Всього у валюті нарахування рахує бекенд
          // (він же "заморожує" ці числа при відправці на перевірку) —
          // тут лише показуємо готове значення з payroll_entry, або "-" з
          // підказкою, чого бракує для розрахунку.
          if (key === 'accrued') {
            return renderStackedSlots(employee, entryData => {
              const missingFields = getAccruedMissingFieldsForEntry(entryData);
              if (missingFields.length > 0) {
                return (
                  <Tooltip title={`Немає даних: ${missingFields.join(', ')}`}>
                    <span className={style.accruedMissingBadge}>-</span>
                  </Tooltip>
                );
              }
              return formatRate(
                Math.round(entryData.accrued * 100) / 100,
                entryData.currency
              );
            });
          }

          if (key === 'taxes') {
            return renderStackedSlots(employee, entryData => {
              const missingFields = getPayrollTotalsMissingFieldsForEntry(employee, entryData);
              if (missingFields.length > 0 || entryData?.taxes == null) {
                return (
                  <Tooltip title={`Немає даних: ${missingFields.join(', ')}`}>
                    <span className={style.accruedMissingBadge}>-</span>
                  </Tooltip>
                );
              }
              return (
                <Tooltip
                  title={`${employee.tax_formula}. ${TAX_FORMULA_DESCRIPTIONS[employee.tax_formula]}`}
                >
                  <span>
                    {formatRate(
                      Math.round(entryData.taxes * 100) / 100,
                      entryData.currency
                    )}
                  </span>
                </Tooltip>
              );
            });
          }

          if (key === 'total_accrued_currency') {
            return renderTotalCell(
              employee,
              entryData => {
                const missingFields = getPayrollTotalsMissingFieldsForEntry(employee, entryData);
                if (missingFields.length > 0 || entryData?.total_accrued_currency == null) {
                  return (
                    <Tooltip title={`Немає даних: ${missingFields.join(', ')}`}>
                      <span className={style.accruedMissingBadge}>-</span>
                    </Tooltip>
                  );
                }
                return formatRate(
                  Math.round(entryData.total_accrued_currency * 100) / 100,
                  entryData.currency
                );
              },
              combined => {
                if (combined.total_accrued_currency == null) {
                  const missingByPeriod = getEntrySlots(employee)
                    .map(entryData => ({
                      rate: entryData?.rate,
                      currency: entryData?.currency,
                      missing: getPayrollTotalsMissingFieldsForEntry(employee, entryData),
                    }))
                    .filter(item => item.missing.length > 0);
                  return (
                    <Tooltip
                      title={
                        <>
                          <div>Немає даних для розрахунку по одній зі ставок:</div>
                          {missingByPeriod.map((item, index) => (
                            <div key={index}>
                              {item.rate ? formatRate(item.rate, item.currency) : 'ставка не вказана'}:{' '}
                              {item.missing.join(', ')}
                            </div>
                          ))}
                        </>
                      }
                    >
                      <span className={style.accruedMissingBadge}>-</span>
                    </Tooltip>
                  );
                }
                const breakdown = combined.total_accrued_currency_breakdown || [];
                const tooltipText = `${breakdown
                  .map(item => {
                    const amount = formatRate(
                      Math.round((item.value ?? 0) * 100) / 100,
                      item.currency || employee.currency
                    );
                    const unitName = item.unit || (hasUnitSplit(employee) ? employee.unit : null);
                    return unitName ? `${amount} (${unitName})` : amount;
                  })
                  .join(' + ')} = ${formatRate(
                  Math.round(combined.total_accrued_currency * 100) / 100,
                  employee.currency
                )}`;
                return (
                  <Tooltip title={tooltipText}>
                    <span>
                      {formatRate(
                        Math.round(combined.total_accrued_currency * 100) / 100,
                        employee.currency
                      )}
                    </span>
                  </Tooltip>
                );
              }
            );
          }

          // "Всього до виплати на руки" = сума всіх колонок статей витрат
          // (тих самих expense_item_*) — рахує бекенд (_sum_expense_items),
          // тут лише показуємо готове число. Якщо хоч одна стаття ще не
          // порахована (formula без вхідних даних) — сума теж "-", не
          // занижена мовчки. При кількох ставках місяця — одне підсумкове
          // число по всіх відрізках разом (renderTotalCell).
          if (key === 'total_payout') {
            return renderTotalCell(
              employee,
              entryData => {
                const totalPayout = entryData?.total_payout;
                if (totalPayout === null || totalPayout === undefined) {
                  return (
                    <Tooltip title="Немає даних для розрахунку деяких статей витрат">
                      <span className={style.accruedMissingBadge}>-</span>
                    </Tooltip>
                  );
                }
                return formatRate(
                  Math.round(totalPayout * 100) / 100,
                  entryData.currency
                );
              },
              combined => {
                if (combined.total_payout == null) {
                  return (
                    <Tooltip title="Немає даних для розрахунку деяких статей витрат по одній зі ставок">
                      <span className={style.accruedMissingBadge}>-</span>
                    </Tooltip>
                  );
                }
                return (
                  <Tooltip title="Сума по всіх ставках місяця">
                    <span>{formatRate(Math.round(combined.total_payout * 100) / 100, employee.currency)}</span>
                  </Tooltip>
                );
              }
            );
          }

          // Статті витрат: "formula" рахує бекенд, "manual" вводиться окремо в кожному рядку.
          const expenseItemKeyId = key.startsWith(EXPENSE_ITEM_KEY_PREFIX)
            ? key.slice(EXPENSE_ITEM_KEY_PREFIX.length)
            : null;
          const expenseItem = expenseItemKeyId
            ? expenseItemByKey[key]
            : null;

          if (expenseItem && expenseItem.calc_type !== 'manual') {
            return renderTotalCell(
              employee,
              entryData => {
                const computedValue = entryData?.expense_items?.[expenseItemKeyId];
                if (
                  expenseItem.calc_type !== 'formula' ||
                  computedValue === null ||
                  computedValue === undefined
                ) {
                  return '-';
                }
                return (
                  <Tooltip
                    title={describeFormulaForEmployee(
                      expenseItem.formula,
                      employee.tax_formula
                    )}
                  >
                    <span>
                      {formatRate(
                        Math.round(computedValue * 100) / 100,
                        entryData.currency
                      )}
                    </span>
                  </Tooltip>
                );
              },
              combined => {
                const computedValue = combined.expense_items?.[expenseItemKeyId];
                if (
                  expenseItem.calc_type !== 'formula' ||
                  computedValue === null ||
                  computedValue === undefined
                ) {
                  return '-';
                }
                return (
                  <Tooltip
                    title={`Сума по всіх ставках місяця. ${describeFormulaForEmployee(
                      expenseItem.formula,
                      employee.tax_formula
                    )}`}
                  >
                    <span>{formatRate(Math.round(computedValue * 100) / 100, employee.currency)}</span>
                  </Tooltip>
                );
              }
            );
          }

          if (expenseItem && expenseItem.calc_type === 'manual') {
            return renderStackedSlots(employee, entryData => {
              const savedValue = entryData?.expense_items?.[expenseItemKeyId];
              if (isEditingSlot(employee, entryData, key)) {
                return renderEditCell({});
              }
              const displayValue = savedValue === null || savedValue === undefined ? '-' : savedValue;
              return (
                <div className={style.viewCellContainer}>
                  <span>{displayValue}</span>
                  {!isEntryLocked(entryData) && (
                    <button
                      type="button"
                      className={style.rateEditBtn}
                      onClick={() => handleStartEdit(employee, entryData, key, savedValue)}
                    >
                      <Icon id="edit" className={style.rateEditIcon} />
                    </button>
                  )}
                </div>
              );
            });
          }

          if (EDITABLE_PAYROLL_FIELDS.includes(key)) {
            return renderStackedSlots(employee, entryData => {
              const periodKey = getPeriodKey(entryData);
              const segment = findSegment(employee, periodKey);
              const savedValue = entryData?.[key];

              // Розподіл — не більше залишку до 100%, дні — не більше днів місяця.
              const editLimits =
                key === 'distribution'
                  ? {
                      min: 0,
                      max: formatPercent(
                        100 - ((segment?.distribution_total ?? 0) - (entryData?.distribution ?? 0))
                      ),
                    }
                  : key === 'worked_days'
                  ? {
                      min: 0,
                      max:
                        employee.payroll_entry?.month_working_days ??
                        DEFAULT_MONTH_WORKING_DAYS,
                    }
                  : null;

              if (isEditingSlot(employee, entryData, key)) {
                return renderEditCell(editLimits);
              }

              const displayValue =
                savedValue === null || savedValue === undefined
                  ? '-'
                  : key === 'distribution'
                  ? `${formatPercent(savedValue)}%`
                  : savedValue;

              const totalWarning =
                key === 'distribution' && !isSplitRow(entryData) && segment
                  ? getSegmentSplitProblem({ ...segment, split_rows: [] })
                  : null;

              return (
                <div className={style.viewCellContainer}>
                  <span>
                    {displayValue}
                    {totalWarning && (
                      <Tooltip title={`${totalWarning}. Розподіліть залишок вручну.`}>
                        <span className={`${style.accruedMissingBadge} ${style.distributionTotalBadge}`}>
                          Σ {formatPercent(segment.distribution_total)}%
                        </span>
                      </Tooltip>
                    )}
                  </span>
                  {!isEntryLocked(entryData) && (
                    <button
                      type="button"
                      className={style.rateEditBtn}
                      onClick={() => handleStartEdit(employee, entryData, key, savedValue)}
                    >
                      <Icon id="edit" className={style.rateEditIcon} />
                    </button>
                  )}
                </div>
              );
            });
          }

          if (key === 'payroll_status') {
            return renderStackedSlots(employee, entryData => {
              // Статус спільний для відрізка — показуємо лише в основному рядку.
              if (isSplitRow(entryData)) return <span className={style.splitRowPlaceholder} />;
              const statusMeta = PAYROLL_ENTRY_STATUS_META[getEntryStatus(entryData)];
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
            });
          }

          if (key === 'action') {
            return renderStackedSlots(employee, entryData => {
              const periodKey = getPeriodKey(entryData);
              const statusValue = getEntryStatus(entryData);
              const isUpdating =
                statusUpdatingId === `${employee.id}:${periodKey ?? 'primary'}`;

              // Рядок юніта: лише видалення в чернетці, статусом керує основний рядок.
              if (isSplitRow(entryData)) {
                if (statusValue !== PAYROLL_ENTRY_STATUS.DRAFT) {
                  return <span className={style.splitRowPlaceholder} />;
                }
                const isSaving = splitSavingKey === `${employee.id}:${getSlotKey(entryData)}`;
                return (
                  <div className={style.actionContainer}>
                    <Tooltip title="Видалити рядок юніта">
                      <span>
                        <button
                          type="button"
                          className={style.splitDeleteBtn}
                          disabled={isSaving || Boolean(editingCell)}
                          onClick={() => setPendingSplitDelete({ employee, entryData })}
                        >
                          <Icon id="trash" className={style.editIcon} />
                        </button>
                      </span>
                    </Tooltip>
                  </div>
                );
              }

              if (statusValue === PAYROLL_ENTRY_STATUS.DRAFT) {
                // Бекенд теж перевіряє; тут лише блокуємо кнопку заздалегідь.
                const splitProblem = getSegmentSplitProblem(findSegment(employee, periodKey));
                return (
                  <div className={style.actionContainer}>
                    <Tooltip title={splitProblem || 'Відправити на перевірку'}>
                      <span>
                        <button
                          type="button"
                          className={style.sendReviewBtn}
                          disabled={isUpdating || Boolean(splitProblem)}
                          onClick={() =>
                            handleChangeEntryStatus(
                              employee,
                              periodKey,
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

              // "Повернуто на доопрацювання" — олівець переводить запис
              // назад у DRAFT (розблоковує поля для редагування), а вже
              // звідти керівник надсилає повторно тією самою кнопкою вище.
              if (statusValue === PAYROLL_ENTRY_STATUS.NEEDS_REVISION) {
                return (
                  <div className={style.actionContainer}>
                    <Tooltip title="Редагувати">
                      <span>
                        <button
                          type="button"
                          className={style.rateEditBtn}
                          disabled={isUpdating}
                          onClick={() =>
                            handleChangeEntryStatus(
                              employee,
                              periodKey,
                              PAYROLL_ENTRY_STATUS.DRAFT
                            )
                          }
                        >
                          <Icon id="edit" className={style.rateEditIcon} />
                        </button>
                      </span>
                    </Tooltip>
                  </div>
                );
              }

              // "Відправлено на перевірку"/"Затверджено" — дій нема, єдиний
              // вихід тепер лише через рішення фінансиста на PayrollReviewPage.
              return <div className={style.actionContainer}>-</div>;
            });
          }

          if (key === 'payment_form' || key === 'payment_details') {
            return (
              <PaymentChangeNote field={key} notes={employee.payment_change_notes?.[key]}>
                {value || '-'}
              </PaymentChangeNote>
            );
          }

          return value || '-';
        },
      })),
    ],
    [
      payrollColumnKeys,
      expenseItemByKey,
      editingCell,
      editingValue,
      savingCell,
      selectedEmployeeIds,
      isAllSelected,
      isSomeSelected,
      statusUpdatingId,
      collapsedRowIds,
      unitLookup,
      splitSavingKey,
      // Обробники в комірках читають місяць і список — без цього вони б застарівали.
      monthParam,
      employees,
    ]
  );

  const filteredColumns = useMemo(
    () =>
      columns.filter(
        col =>
          fixedColumnKeys.includes(col.accessorKey) ||
          !hiddenColumnKeys.includes(col.accessorKey)
      ),
    [columns, hiddenColumnKeys]
  );

  const hideableColumns = useMemo(
    () => columns.filter(col => hideableColumnKeys.includes(col.accessorKey)),
    [columns, hideableColumnKeys]
  );

  // Для ModalColumnsForm — воно очікує саме СПИСОК ВИДИМИХ (той самий
  // спільний компонент, що й на "Співробітниках"), тому рахуємо тут, а не
  // зберігаємо як стейт.
  const visibleColumnKeysForModal = useMemo(
    () => hideableColumnKeys.filter(key => !hiddenColumnKeys.includes(key)),
    [hideableColumnKeys, hiddenColumnKeys]
  );

  const visibleColumnsCount = visibleColumnKeysForModal.length;

  // "Статус" сюди не входить — поки він лише візуальний і завжди FILTER_ALL.
  const activeAdditionalFiltersCount = [
    selectedCurrency,
    selectedPaymentForm,
    selectedPaymentDetails,
  ].filter(value => value !== FILTER_ALL).length;

  // Коли є таби Subdivision — вибір одного з них обов'язковий (немає режиму
  // "усі підрозділи разом"), тому це не "активний фільтр", який можна
  // скинути, а обов'язкова навігація — не враховуємо тут і не чіпаємо в
  // handleResetFilters нижче.
  const hasActiveFilters =
    search.trim() !== '' ||
    selectedUnit !== FILTER_ALL ||
    selectedDepartment !== FILTER_ALL ||
    (!hasSubdivisionTabs && selectedSubdivision !== FILTER_ALL) ||
    activeAdditionalFiltersCount > 0;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedUnit(FILTER_ALL);
    setSelectedDepartment(FILTER_ALL);
    if (!hasSubdivisionTabs) setSelectedSubdivision(FILTER_ALL);
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
          {/* Тимчасово вимкнено — кейс "співробітник на 1 місяць" відкладено
              (сама форма/бекенд-ендпоінт приберені, поки не повернемось до
              цього кейсу — повертати доведеться разом). */}
          <Tooltip title="Тимчасово недоступно">
            <span>
              <button type="button" className={style.primaryBtn} disabled>
                <span className={style.plus}>+</span>
                Додати співробітника
              </button>
            </span>
          </Tooltip>
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
          {/* Коли підрозділів кілька — їх обирають табами над таблицею
              (нижче), а не цим дропдауном, щоб не дублювати той самий
              фільтр двома контролами одночасно. */}
          {!hasSubdivisionTabs && (
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
          )}
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

      {hasSubdivisionTabs && (
        <ul className={style.subdivisionTabs}>
          {subdivisionTabs.map(tab => (
            <li key={tab.value}>
              <button
                type="button"
                className={`${style.subdivisionTab} ${
                  tab.value === selectedSubdivision
                    ? style.subdivisionTabActive
                    : ''
                }`}
                onClick={() => setSelectedSubdivision(tab.value)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Table
        data={filteredEmployees}
        columns={filteredColumns}
        styles="payrollTable"
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
          visibleColumns={visibleColumnKeysForModal}
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
        isModalOpen={Boolean(pendingSplitDelete)}
        onCloseModal={() => setPendingSplitDelete(null)}
      >
        {pendingSplitDelete && (
          <div className={style.splitConfirm}>
            <p className={style.splitConfirmTitle}>Видалити рядок юніта?</p>
            <p className={style.splitConfirmText}>
              {pendingSplitDelete.entryData.unit || 'Рядок без юніта'} —{' '}
              {formatPercent(pendingSplitDelete.entryData.distribution)}%. Відсоток не
              перейде в інші рядки: після видалення розподіліть його вручну. Дані цього
              рядка (дні, бонус, ручні статті) буде видалено.
            </p>
            <div className={style.splitConfirmActions}>
              <button
                type="button"
                className={style.splitConfirmSecondaryBtn}
                onClick={() => setPendingSplitDelete(null)}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={style.splitConfirmPrimaryBtn}
                disabled={Boolean(splitSavingKey)}
                onClick={handleConfirmSplitDelete}
              >
                Видалити
              </button>
            </div>
          </div>
        )}
      </ModalWindow>

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
