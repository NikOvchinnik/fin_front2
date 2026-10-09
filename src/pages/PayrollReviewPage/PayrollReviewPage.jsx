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
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import {
  exportPayrollReviewToGoogle,
  getNbuRates,
  getPayrollExpenseItems,
  getPayrollMonthSettings,
  getPayrollReview,
  updateEmployeePayrollEntry,
  updateEmployeePayrollEntryStatus,
  updateEmployeePayrollExpenseValue,
  updatePayrollMonthSettings,
} from '../../helpers/axios/employees';
import { FILTER_ALL } from '../../helpers/status';
import {
  buildEmployeeFieldOptions,
  clampToRange,
  employeeFields,
  formatRate,
} from '../../helpers/employees';
import style from './PayrollReviewPage.module.css';

const employeeFieldByKey = employeeFields.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

// Синхронізовано з utils/enums.py -> PayrollEntryStatus.
const PAYROLL_ENTRY_STATUS = {
  DRAFT: 1,
  SENT_FOR_REVIEW: 2,
  NEEDS_REVISION: 3,
  APPROVED: 4,
};

const PAYROLL_ENTRY_STATUS_META = {
  // Керівник ще нічого не відправляв (або взагалі не торкався) — тепер теж
  // видно на "Перевірці відомостей" (раніше сюди стікалось лише
  // відправлене), без підсвітки рядка, як і на "Зарплатній відомості".
  [PAYROLL_ENTRY_STATUS.DRAFT]: { label: 'Чернетка', color: '#6c757d' },
  [PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW]: {
    label: 'Відправлено на перевірку',
    color: '#c79a1b',
  },
  [PAYROLL_ENTRY_STATUS.NEEDS_REVISION]: {
    label: 'Повернуто на доопрацювання',
    color: '#c74736',
  },
  [PAYROLL_ENTRY_STATUS.APPROVED]: {
    label: 'Затверджено фінансистом',
    color: '#6b9429',
  },
};

const NBU_CURRENCY_LABELS = { USD: 'Долар США', EUR: 'Євро' };

const EXPENSE_ITEM_KEY_PREFIX = 'expense_item_';
const toExpenseItemKey = id => `${EXPENSE_ITEM_KEY_PREFIX}${id}`;

// Той самий переклад змінних формули, що на "Зарплатній відомості"
// (PayrollStatementPage) — для тултіпа на порахованих статтях.
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

const PAYROLL_FIELD_LABELS = {
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
  payroll_status: 'Статус',
  action: 'Дія',
};

// TODO: той самий статичний дефолт, що на "Зарплатній відомості" керівника
// (DEFAULT_MONTH_WORKING_DAYS) — коли з'явиться реальний розрахунок робочих
// днів місяця, замінити тут теж.
const DEFAULT_MONTH_WORKING_DAYS = 22;

// Той самий набір "до статей витрат", що на "Зарплатній відомості" керівника
// (PAYROLL_COLUMN_KEYS_BEFORE_EXPENSE_ITEMS) — для повної відповідності
// колонок, плюс "manager" (тут записи від усіх керівників одразу).
const COLUMN_KEYS_BEFORE_EXPENSE_ITEMS = [
  'unit',
  'department',
  'subdivision',
  'manager',
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
const COLUMN_KEYS_AFTER_EXPENSE_ITEMS = [
  'total_payout',
  'currency',
  'payment_form',
  'payment_details',
  'payroll_status',
  'action',
];

const buildColumnKeys = expenseItemKeys => [
  ...COLUMN_KEYS_BEFORE_EXPENSE_ITEMS,
  ...expenseItemKeys,
  ...COLUMN_KEYS_AFTER_EXPENSE_ITEMS,
];

// Поля, які фінансист може редагувати inline прямо в комірці таблиці — той
// самий набір і той самий UI редагування, що на "Зарплатній відомості"
// керівника (EDITABLE_PAYROLL_FIELDS там). Бекенд дозволяє фінансисту
// редагувати, поки запис "Відправлено на перевірку"/"Повернуто на
// доопрацювання" (не після "Затверджено") — див. isFinanceEditable нижче.
const EDITABLE_PAYROLL_FIELDS = [
  'distribution',
  'worked_days',
  'vacation_compensation',
  'bonus',
];

const UNSAVED_EDIT_WARNING =
  'Завершіть редагування: збережіть або скасуйте зміни перед переходом до іншої комірки';

// "Нараховано"/"Податки"/"Всього у валюті нарахування" рахує бекенд — тут
// лише визначаємо, яких вхідних даних бракує, щоб показати "-" з підказкою
// (той самий підхід, що на "Зарплатній відомості" керівника).
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

const TAX_FORMULA_DESCRIPTIONS = {
  'ставка Nett': 'Бенефіти не нараховуються.',
  'ставка Gross': 'Бенефіти не нараховуються.',
  'ставка без КП': 'Бенефіти не нараховуються.',
  'ставка + КП (6%)':
    'Бенефіти = (Нараховано + Компенсація відпустки + Бонус) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
  'ставка + КП (6%+ЄСВ)':
    'Бенефіти = (Нараховано + Компенсація відпустки + Бонус + 1903) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
};

// Завжди видимі, не пропонуються у "Фільтр колонок" — той самий підхід, що
// fixedColumnKeys на "Зарплатній відомості" керівника.
const FIXED_COLUMN_KEYS = [
  'select',
  'unit',
  'department',
  'subdivision',
  'manager',
  'local_full_name',
];
const HIDDEN_COLUMNS_STORAGE_KEY = 'payrollReviewHiddenColumns';
// Той самий дефолт, що на "Зарплатній відомості" керівника.
const DEFAULT_HIDDEN_COLUMN_KEYS = ['tax_id', 'month_working_days'];

const withAllOption = options => [{ value: FILTER_ALL, label: 'Усі' }, ...options];

// Немає payroll_entry (керівник ще нічого не заповнював) = "Чернетка" — те
// саме, що на "Зарплатній відомості" самого керівника.
const getEntryStatus = employee =>
  employee?.payroll_entry?.status ?? PAYROLL_ENTRY_STATUS.DRAFT;

// entryData — конкретний відрізок ставки місяця (employee.payroll_entry або
// один з employee.extra_payroll_entries, якщо ставку міняли ВСЕРЕДИНІ
// місяця, _resolve_rate_periods_for_month на бекенді) — щоб та сама логіка
// статусу/блокування працювала незалежно від того, скільки їх у цього рядка.
const getStatusForEntry = entryData => entryData?.status ?? PAYROLL_ENTRY_STATUS.DRAFT;

const getEntrySlots = employee => [
  employee.payroll_entry,
  ...(employee.extra_payroll_entries || []),
];

const hasMultiplePeriods = employee => (employee.extra_payroll_entries || []).length > 0;

// rate_history_id самого запису однозначно ідентифікує відрізок — null для
// першого (як і завжди було), id рядка EmployeeRateHistory для 2-го й
// подальших.
const getPeriodKey = entryData => entryData?.rate_history_id ?? null;

const formatEffectiveDate = isoDate => (isoDate ? dayjs(isoDate).format('DD.MM.YYYY') : null);

// Ключ для unlockedEmployeeIds/statusUpdatingId/editingCell по КОНКРЕТНОМУ
// відрізку ставки місяця — навмисно на основі employeeId+managerId (стабільні
// незалежно від того, чи вже існує payroll_entry в базі), а не rowKey
// (той міняється з "draft-…" на "entry-…" після першого збереження
// ПЕРВИННОГО відрізка — прив'язка до нього ускладнила б облік 2-го відрізка
// без жодної користі).
const getPeriodUnlockKey = (employee, rateHistoryId) =>
  `${employee.id}:${employee.payroll_entry?.manager_id}:${rateHistoryId ?? 'primary'}`;

// Один співробітник може мати кілька керівників одночасно — кожен зі своїм
// ОКРЕМИМ payroll_entry (див. коментар у моделі EmployeePayrollEntry на
// бекенді), тому на цій сторінці той самий employee.id може повторюватись у
// кількох рядках. Всюди, де потрібен унікальний ключ рядка (вибір
// чекбоксом, розблокування, редагування комірки) — беремо id самого запису
// (payroll_entry.id). Якщо запису ще нема (справжня "Чернетка", керівник
// іще нічого не зберігав) — payroll_entry.id теж null, тому падаємо на
// пару employee+manager, яка й тоді лишається унікальною для рядка.
const getRowKey = employee =>
  employee?.payroll_entry?.id != null
    ? `entry-${employee.payroll_entry.id}`
    : `draft-${employee?.id}-${employee?.payroll_entry?.manager_id}`;

// Клас підсвітки рядка (row.original.className, читає Table.jsx) — ті самі
// класи в Table.module.css, що й на "Зарплатній відомості" керівника.
// "Чернетка" навмисно без класу (undefined) — стан за замовчуванням.
const STATUS_ROW_CLASS_NAME = {
  [PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW]: 'statusSentForReview',
  [PAYROLL_ENTRY_STATUS.NEEDS_REVISION]: 'statusNeedsRevision',
  [PAYROLL_ENTRY_STATUS.APPROVED]: 'statusApproved',
};

const getRowClassName = employee => STATUS_ROW_CLASS_NAME[getEntryStatus(employee)];

const withRowClassName = employee => ({
  ...employee,
  className: getRowClassName(employee),
});

const PayrollReviewPage = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [employees, setEmployees] = useState([]);
  const [expenseItemsBySubdivision, setExpenseItemsBySubdivision] = useState({});
  const [selectedSubdivision, setSelectedSubdivision] = useState(FILTER_ALL);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => new Set());
  const [exportingToGoogle, setExportingToGoogle] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(FILTER_ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_ALL);
  const [selectedManager, setSelectedManager] = useState(FILTER_ALL);
  const [selectedCurrency, setSelectedCurrency] = useState(FILTER_ALL);
  const [selectedPaymentForm, setSelectedPaymentForm] = useState(FILTER_ALL);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(FILTER_ALL);
  const [selectedStatus, setSelectedStatus] = useState(FILTER_ALL);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filtersResetKey, setFiltersResetKey] = useState(0);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState(() => {
    const saved = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_HIDDEN_COLUMN_KEYS;
  });
  const [isColumnsModalOpen, setColumnsModalOpen] = useState(false);
  const [isNbuModalOpen, setNbuModalOpen] = useState(false);
  const [nbuRates, setNbuRates] = useState(null);
  const [nbuRatesLoading, setNbuRatesLoading] = useState(false);
  const [nbuRatesError, setNbuRatesError] = useState(false);
  const [monthWorkingDays, setMonthWorkingDays] = useState(DEFAULT_MONTH_WORKING_DAYS);
  const [isEditingMonthWorkingDays, setIsEditingMonthWorkingDays] = useState(false);
  const [monthWorkingDaysInput, setMonthWorkingDaysInput] = useState('');
  const [savingMonthWorkingDays, setSavingMonthWorkingDays] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowKey, employeeId, managerId, rateHistoryId, unlockKey, field } | null
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const editingCellRef = useRef(null);
  // Фінансист може редагувати поля незалежно від статусу запису (навіть
  // "Затверджено"), але за замовчуванням заблоковано — розблоковує явно
  // олівцем у колонці "Дія", окремо для кожного ВІДРІЗКА ставки місяця
  // (ключ — getPeriodUnlockKey, суто локальний UI-стан, не статус запису —
  // бекенд це теж не перевіряє для фінансиста, див. коментар до
  // PAYROLL_ENTRY_EDITABLE_STATUSES в routes/employees.py).
  const [unlockedEmployeeIds, setUnlockedEmployeeIds] = useState(() => new Set());
  // Рядки з розгорнутим підрядком другої (і подальшої) ставки місяця — той
  // самий патерн, що на "Зарплатній відомості" керівника.
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set());

  const toggleRowExpand = rowKey => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const monthParam = startDate.format('MM.YYYY');

  const fetchReview = async () => {
    try {
      const result = await getPayrollReview(monthParam);
      setEmployees((result?.employees || []).map(withRowClassName));
    } catch {
      Notify.failure('Не вдалося завантажити список на перевірку.');
    }
  };

  useEffect(() => {
    fetchReview();
  }, [monthParam]);

  useEffect(() => {
    getPayrollExpenseItems()
      .then(result => setExpenseItemsBySubdivision(result || {}))
      .catch(() => setExpenseItemsBySubdivision({}));
  }, []);

  // "Робочі дні місяця" — окреме число на кожен календарний місяць
  // (payroll-month-settings), не per-employee. Тягнемо його при кожній
  // зміні місяця, закриваємо форму редагування (якщо була відкрита для
  // іншого місяця).
  useEffect(() => {
    setIsEditingMonthWorkingDays(false);
    getPayrollMonthSettings(monthParam)
      .then(result =>
        setMonthWorkingDays(result?.working_days ?? DEFAULT_MONTH_WORKING_DAYS)
      )
      .catch(() => setMonthWorkingDays(DEFAULT_MONTH_WORKING_DAYS));
  }, [monthParam]);

  const handleStartEditMonthWorkingDays = () => {
    setMonthWorkingDaysInput(String(monthWorkingDays));
    setIsEditingMonthWorkingDays(true);
  };

  const handleCancelEditMonthWorkingDays = () => {
    setIsEditingMonthWorkingDays(false);
  };

  const handleSaveMonthWorkingDays = async () => {
    const value = Number(monthWorkingDaysInput);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      Notify.failure('Робочі дні місяця мають бути цілим числом від 1 до 31.');
      return;
    }
    setSavingMonthWorkingDays(true);
    try {
      const result = await updatePayrollMonthSettings({
        month: monthParam,
        working_days: value,
      });
      setMonthWorkingDays(result?.working_days ?? value);
      setIsEditingMonthWorkingDays(false);
      Notify.success('Робочі дні місяця збережено.');
      // Незамороженим (ще не відправленим на перевірку) записам це число
      // рахується наживо — перезавантажуємо список, щоб побачити нові
      // значення одразу, без ручного оновлення сторінки.
      fetchReview();
    } catch {
      Notify.failure('Не вдалося зберегти робочі дні місяця.');
    } finally {
      setSavingMonthWorkingDays(false);
    }
  };

  // Таби підрозділів — показуються, лише якщо в поточному списку на
  // перевірку є 2+ різних Subdivision (той самий підхід, що на "Зарплатній
  // відомості" керівника).
  const subdivisionTabs = useMemo(() => {
    const names = [...new Set(employees.map(item => item.subdivision).filter(Boolean))];
    return withAllOption(
      names
        .sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }))
        .map(name => ({ value: name, label: name }))
    );
  }, [employees]);
  const hasSubdivisionTabs = subdivisionTabs.length > 2;

  useEffect(() => {
    if (
      hasSubdivisionTabs &&
      !subdivisionTabs.some(tab => tab.value === selectedSubdivision)
    ) {
      setSelectedSubdivision(FILTER_ALL);
    }
  }, [hasSubdivisionTabs, subdivisionTabs]);

  const unitOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'unit')),
    [employees]
  );
  const departmentOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'department')),
    [employees]
  );
  const managerOptions = useMemo(
    () => withAllOption(buildEmployeeFieldOptions(employees, 'manager')),
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
    () => withAllOption(buildEmployeeFieldOptions(employees, 'payment_details')),
    [employees]
  );
  const statusFilterOptions = useMemo(
    () =>
      withAllOption(
        [
          PAYROLL_ENTRY_STATUS.DRAFT,
          PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW,
          PAYROLL_ENTRY_STATUS.NEEDS_REVISION,
          PAYROLL_ENTRY_STATUS.APPROVED,
        ].map(value => ({
          value: String(value),
          label: PAYROLL_ENTRY_STATUS_META[value].label,
        }))
      ),
    []
  );

  const filteredEmployees = useMemo(() => {
    let rows = employees;

    if (hasSubdivisionTabs && selectedSubdivision !== FILTER_ALL) {
      rows = rows.filter(item => item.subdivision === selectedSubdivision);
    }
    if (selectedUnit !== FILTER_ALL) {
      rows = rows.filter(item => item.unit === selectedUnit);
    }
    if (selectedDepartment !== FILTER_ALL) {
      rows = rows.filter(item => item.department === selectedDepartment);
    }
    if (selectedManager !== FILTER_ALL) {
      rows = rows.filter(item => item.manager === selectedManager);
    }
    if (selectedCurrency !== FILTER_ALL) {
      rows = rows.filter(item => item.currency === selectedCurrency);
    }
    if (selectedPaymentForm !== FILTER_ALL) {
      rows = rows.filter(item => item.payment_form === selectedPaymentForm);
    }
    if (selectedPaymentDetails !== FILTER_ALL) {
      rows = rows.filter(item => item.payment_details === selectedPaymentDetails);
    }
    if (selectedStatus !== FILTER_ALL) {
      rows = rows.filter(item => String(getEntryStatus(item)) === selectedStatus);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(item =>
        (item.local_full_name || '').toLowerCase().includes(query)
      );
    }

    return rows;
  }, [
    employees,
    search,
    hasSubdivisionTabs,
    selectedSubdivision,
    selectedUnit,
    selectedDepartment,
    selectedManager,
    selectedCurrency,
    selectedPaymentForm,
    selectedPaymentDetails,
    selectedStatus,
  ]);

  // На табі "Усі" статті витрат не показуємо (null) — вони різні по
  // підрозділах, показ одного довільного був би неправильним для решти.
  const activeSubdivisionName = hasSubdivisionTabs
    ? (selectedSubdivision !== FILTER_ALL ? selectedSubdivision : null)
    : employees[0]?.subdivision || null;
  const activeExpenseItems = useMemo(
    () =>
      (activeSubdivisionName && expenseItemsBySubdivision[activeSubdivisionName]) || [],
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
  const columnKeys = useMemo(
    () => buildColumnKeys(expenseItemKeys),
    [expenseItemKeys]
  );

  // Клік/mousedown поза активною клітинкою редагування — попереджаємо про
  // незбережені зміни замість тихого скидання (той самий підхід, що на
  // "Зарплатній відомості" керівника).
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

  const toggleRowUnlocked = unlockKey => {
    setUnlockedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(unlockKey)) {
        next.delete(unlockKey);
        // Замкнули відрізок, поки в ньому саме йшло редагування комірки —
        // скасовуємо його, щоб не лишити "підвислий" editingCell без
        // видимої кнопки продовжити/скасувати.
        setEditingCell(current => {
          if (current?.unlockKey === unlockKey) {
            setEditingValue('');
            return null;
          }
          return current;
        });
      } else {
        next.add(unlockKey);
      }
      return next;
    });
  };

  const handleStartEdit = (
    rowKey,
    employeeId,
    managerId,
    rateHistoryId,
    unlockKey,
    field,
    currentValue
  ) => {
    if (editingCell) {
      Notify.warning(UNSAVED_EDIT_WARNING);
      return;
    }
    if (!unlockedEmployeeIds.has(unlockKey)) {
      Notify.warning('Спершу розблокуйте рядок олівцем у колонці "Дія".');
      return;
    }
    setEditingCell({ rowKey, employeeId, managerId, rateHistoryId, unlockKey, field });
    setEditingValue(currentValue ?? '');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  // Оновлює правильний "відрізок" рядка після збереження: rateHistoryId
  // null — це employee.payroll_entry (перший відрізок), інакше шукає
  // відповідний запис в employee.extra_payroll_entries за rate_history_id
  // (той самий підхід, що на "Зарплатній відомості" керівника).
  const applyPayrollEntryUpdate = (rowKey, rateHistoryId, updatedEntry) => {
    setEmployees(prev =>
      prev.map(employee => {
        if (getRowKey(employee) !== rowKey) return employee;
        if (rateHistoryId === null) {
          return withRowClassName({ ...employee, payroll_entry: updatedEntry });
        }
        return {
          ...employee,
          extra_payroll_entries: (employee.extra_payroll_entries || []).map(entry =>
            getPeriodKey(entry) === rateHistoryId ? updatedEntry : entry
          ),
        };
      })
    );
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      // Ручні статті витрат — спільні на весь місяць (не прив'язані до
      // відрізка ставки), тому rate_history_id тут не передається.
      const result = editingCell.field.startsWith(EXPENSE_ITEM_KEY_PREFIX)
        ? await updateEmployeePayrollExpenseValue(editingCell.employeeId, {
            month: monthParam,
            manager_id: editingCell.managerId,
            expense_item_id: Number(
              editingCell.field.slice(EXPENSE_ITEM_KEY_PREFIX.length)
            ),
            value: editingValue,
          })
        : await updateEmployeePayrollEntry(editingCell.employeeId, {
            month: monthParam,
            manager_id: editingCell.managerId,
            field: editingCell.field,
            value: editingValue,
            rate_history_id: editingCell.rateHistoryId,
          });
      applyPayrollEntryUpdate(
        editingCell.rowKey,
        editingCell.field.startsWith(EXPENSE_ITEM_KEY_PREFIX) ? null : editingCell.rateHistoryId,
        result?.payroll_entry
      );
      setEditingCell(null);
      setEditingValue('');
    } catch (error) {
      if (error?.response?.status === 409) {
        Notify.warning('Статус уже змінився — онови сторінку.');
      } else if (
        error?.response?.data?.code === 'WORKED_DAYS_EXCEEDS_MONTH' ||
        error?.response?.data?.code === 'NBU_RATE_UNAVAILABLE'
      ) {
        Notify.failure(error.response.data.message);
      } else {
        Notify.failure('Не вдалося зберегти значення.');
      }
    } finally {
      setSavingCell(false);
    }
  };

  // rateHistoryId — кожен відрізок ставки місяця має свій НЕЗАЛЕЖНИЙ статус
  // (той самий підхід, що вже застосований до кількох керівників одного
  // співробітника) — можна затвердити 1-й відрізок, поки 2-й ще на
  // доопрацюванні, і навпаки.
  const handleChangeStatus = async (employee, rateHistoryId, newStatus) => {
    const rowKey = getRowKey(employee);
    const unlockKey = getPeriodUnlockKey(employee, rateHistoryId);
    setStatusUpdatingId(unlockKey);
    try {
      const result = await updateEmployeePayrollEntryStatus(employee.id, {
        month: monthParam,
        manager_id: employee.payroll_entry?.manager_id,
        status: newStatus,
        rate_history_id: rateHistoryId,
      });
      applyPayrollEntryUpdate(rowKey, rateHistoryId, result?.payroll_entry);
      if (newStatus === PAYROLL_ENTRY_STATUS.APPROVED) {
        Notify.success('Відомість затверджено.');
      } else if (newStatus === PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW) {
        Notify.success('Відправлено на перевірку.');
      } else {
        Notify.success('Повернуто керівнику на доопрацювання.');
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        Notify.warning('Статус уже змінився — онови сторінку.');
      } else if (error?.response?.data?.code === 'PAYROLL_ENTRY_INCOMPLETE') {
        Notify.failure(error.response.data.message);
      } else {
        Notify.failure('Не вдалося змінити статус.');
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const toggleEmployeeSelection = rowKey => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  // Чекбокси тут — не для дій зі статусом (Затвердити/Повернути лишаються
  // лише одиничними кнопками в колонці "Дія"), а для масового експорту в
  // Google Таблиці — тому обирати можна будь-який рядок незалежно від
  // статусу. Виняток — справжня "Чернетка" без жодного payroll_entry
  // (керівник ще взагалі нічого не зберігав): експортувати там нічого,
  // нема самого запису в базі, тому чекбокс недоступний саме для таких.
  const selectableEmployees = useMemo(
    () => filteredEmployees.filter(employee => employee.payroll_entry?.id != null),
    [filteredEmployees]
  );

  const isAllSelected =
    selectableEmployees.length > 0 &&
    selectableEmployees.every(employee => selectedEmployeeIds.has(getRowKey(employee)));
  const isSomeSelected =
    !isAllSelected &&
    selectableEmployees.some(employee => selectedEmployeeIds.has(getRowKey(employee)));

  const toggleAllSelected = () => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        selectableEmployees.forEach(employee => next.delete(getRowKey(employee)));
      } else {
        selectableEmployees.forEach(employee => next.add(getRowKey(employee)));
      }
      return next;
    });
  };

  const handleExportToGoogleSheets = async () => {
    if (selectedEmployeeIds.size === 0) return;
    // selectedEmployeeIds — рядкові rowKey (getRowKey), не самі entry.id
    // (потрібно ще й для "Чернеток" без payroll_entry) — тут дістаємо
    // реальні числові id записів для бекенду.
    const entryIds = employees
      .filter(employee => selectedEmployeeIds.has(getRowKey(employee)))
      .map(employee => employee.payroll_entry?.id)
      .filter(id => id != null);
    if (entryIds.length === 0) return;

    setExportingToGoogle(true);
    try {
      const result = await exportPayrollReviewToGoogle({
        month: monthParam,
        entry_ids: entryIds,
      });
      Notify.success(
        `Експортовано ${result?.rows ?? 0} рядків у вкладку "${result?.sheet_name || ''}".`
      );
    } catch (error) {
      Notify.failure(
        error?.response?.data?.message || 'Не вдалося експортувати в Google Таблиці.'
      );
    } finally {
      setExportingToGoogle(false);
    }
  };

  const fetchNbuRates = async (refresh = false) => {
    setNbuRatesLoading(true);
    setNbuRatesError(false);
    try {
      const result = await getNbuRates(monthParam, refresh);
      setNbuRates(result);
    } catch {
      setNbuRatesError(true);
      if (nbuRates) Notify.failure('Не вдалося оновити курс НБУ.');
    } finally {
      setNbuRatesLoading(false);
    }
  };

  const handleOpenNbuModal = () => {
    setNbuModalOpen(true);
    fetchNbuRates();
  };

  // Стекує значення клітинки по ВСІХ відрізках ставки місяця цього рядка
  // (employee.payroll_entry + employee.extra_payroll_entries) — той самий
  // патерн, що на "Зарплатній відомості" керівника. Для звичайного випадку
  // "одна ставка на місяць" (99% рядків) повертає renderSlot(...) напряму,
  // без жодної обгортки.
  const renderStackedSlots = (employee, renderSlot) => {
    const slots = getEntrySlots(employee);
    if (slots.length <= 1) {
      return renderSlot(slots[0], false, 0);
    }
    const rowKey = getRowKey(employee);
    const isExpanded = expandedRowIds.has(rowKey);
    return (
      <div className={style.multiValueCell}>
        {slots.map((entryData, index) => {
          if (index > 0 && !isExpanded) return null;
          return (
            <div
              key={entryData?.id ?? getPeriodKey(entryData) ?? index}
              className={index === 0 ? style.multiValuePrimary : style.multiValueExtra}
            >
              {renderSlot(entryData, index > 0, index)}
            </div>
          );
        })}
      </div>
    );
  };

  // "Всього у валюті нарахування"/статті витрат, порахован formулою/"Всього
  // до виплати на руки" — на відміну від решти полів (лишаються показані
  // ОКРЕМО на кожен відрізок, renderStackedSlots), тут потрібне ОДНЕ
  // підсумкове число за весь місяць одразу по всіх відрізках (узгоджено з
  // фінансистом): для звичайного випадку "одна ставка на місяць" —
  // renderSlot(...) напряму (жодних змін), інакше —
  // renderCombined(employee.combined_totals).
  const renderTotalCell = (employee, renderSlot, renderCombined) => {
    if (!hasMultiplePeriods(employee)) {
      return renderSlot(employee.payroll_entry);
    }
    return renderCombined(employee.combined_totals || {});
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
            checked={selectedEmployeeIds.has(getRowKey(row.original))}
            disabled={row.original.payroll_entry?.id == null}
            onChange={() => toggleEmployeeSelection(getRowKey(row.original))}
            onClick={e => e.stopPropagation()}
          />
        ),
      },
      ...columnKeys.map(key => ({
        accessorKey: key,
        header:
          key === 'accrued' ? (
            <Tooltip title="Ставка × (Розподіл / 100) × Відпрацьовані робочі дні / Робочі дні місяця">
              <span className={style.headerWithHint}>
                {PAYROLL_FIELD_LABELS[key]}
                <Icon id="info" className={style.headerHintIcon} />
              </span>
            </Tooltip>
          ) : key.startsWith(EXPENSE_ITEM_KEY_PREFIX) ? (
            expenseItemByKey[key]?.name
          ) : (
            employeeFieldByKey[key]?.label || PAYROLL_FIELD_LABELS[key] || key
          ),
        cell: ({ row }) => {
          const employee = row.original;
          const value = employee[key];

          // Ім'я — тут же шеврон розгортання підрядків 2-ї й подальшої
          // ставки місяця (employee.extra_payroll_entries), той самий
          // патерн, що на "Зарплатній відомості" керівника.
          if (key === 'local_full_name') {
            const rowKey = getRowKey(employee);
            const isExpanded = expandedRowIds.has(rowKey);
            const extraCount = (employee.extra_payroll_entries || []).length;
            return (
              <div className={style.nameCellContainer}>
                {hasMultiplePeriods(employee) && (
                  <Tooltip
                    title={
                      isExpanded
                        ? 'Згорнути'
                        : `Ставку міняли всередині місяця — ще ${extraCount} ${
                            extraCount === 1 ? 'відрізок' : 'відрізки'
                          }`
                    }
                  >
                    <button
                      type="button"
                      className={style.rowExpandToggle}
                      onClick={event => {
                        event.stopPropagation();
                        toggleRowExpand(rowKey);
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
            // Спільне на весь місяць (обидва відрізки ставки рахуються в
            // межах одного й того самого "Робочі дні місяця") — для
            // заморожених записів це те, що реально застосувалось при
            // відправці, а не поточне payroll-month-settings (див.
            // _serialize_payroll_entry на бекенді).
            return employee.payroll_entry?.month_working_days ?? DEFAULT_MONTH_WORKING_DAYS;
          }

          // Нараховано/Податки/Всього у валюті нарахування рахує бекенд —
          // тут лише показуємо готове значення, або "-" з підказкою, чого
          // бракує для розрахунку (той самий підхід, що на "Зарплатній
          // відомості" керівника).
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
              return formatRate(Math.round(entryData.accrued * 100) / 100, entryData.currency);
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
                    {formatRate(Math.round(entryData.taxes * 100) / 100, entryData.currency)}
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
                  .map(item =>
                    formatRate(Math.round((item.value ?? 0) * 100) / 100, item.currency || employee.currency)
                  )
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
                return formatRate(Math.round(totalPayout * 100) / 100, entryData.currency);
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

          // Динамічна колонка "статті витрат" — calc_type визначає, як
          // показувати: "formula" готове рахує бекенд (тільки читання,
          // окремо для кожного відрізка ставки — формула могла включати
          // rate), "manual" — ОДНЕ спільне значення на весь місяць
          // (редагується inline так само, як EDITABLE_PAYROLL_FIELDS
          // нижче, але без стекування — не прив'язане до відрізка ставки).
          const expenseItemKeyId = key.startsWith(EXPENSE_ITEM_KEY_PREFIX)
            ? key.slice(EXPENSE_ITEM_KEY_PREFIX.length)
            : null;
          const expenseItem = expenseItemKeyId ? expenseItemByKey[key] : null;

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
                    title={describeFormulaForEmployee(expenseItem.formula, employee.tax_formula)}
                  >
                    <span>
                      {formatRate(Math.round(computedValue * 100) / 100, entryData.currency)}
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
            const rowKey = getRowKey(employee);
            const unlockKey = getPeriodUnlockKey(employee, null);
            const isEditing = editingCell?.rowKey === rowKey && editingCell?.field === key;
            const savedValue = employee.payroll_entry?.expense_items?.[expenseItemKeyId];

            if (isEditing) {
              return (
                <div ref={editingCellRef} className={style.editCellContainer}>
                  <input
                    type="number"
                    className={style.editCellInput}
                    value={editingValue}
                    autoFocus
                    disabled={savingCell}
                    onChange={e => setEditingValue(e.target.value)}
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

            const displayValue = savedValue === null || savedValue === undefined ? '-' : savedValue;

            return (
              <div className={style.viewCellContainer}>
                <span>{displayValue}</span>
                {unlockedEmployeeIds.has(unlockKey) && (
                  <button
                    type="button"
                    className={style.rateEditBtn}
                    onClick={() =>
                      handleStartEdit(
                        rowKey,
                        employee.id,
                        employee.payroll_entry?.manager_id,
                        null,
                        unlockKey,
                        key,
                        savedValue
                      )
                    }
                  >
                    <Icon id="edit" className={style.rateEditIcon} />
                  </button>
                )}
              </div>
            );
          }

          if (EDITABLE_PAYROLL_FIELDS.includes(key)) {
            const rowKey = getRowKey(employee);
            return renderStackedSlots(employee, entryData => {
              const rateHistoryId = getPeriodKey(entryData);
              const unlockKey = getPeriodUnlockKey(employee, rateHistoryId);
              const isEditing =
                editingCell?.unlockKey === unlockKey && editingCell?.field === key;
              const savedValue = entryData?.[key];

              const editLimits =
                key === 'distribution'
                  ? { min: 0, max: 100 }
                  : key === 'worked_days'
                  ? {
                      min: 0,
                      max:
                        employee.payroll_entry?.month_working_days ??
                        DEFAULT_MONTH_WORKING_DAYS,
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
                  {unlockedEmployeeIds.has(unlockKey) && (
                    <button
                      type="button"
                      className={style.rateEditBtn}
                      onClick={() =>
                        handleStartEdit(
                          rowKey,
                          employee.id,
                          employee.payroll_entry?.manager_id,
                          rateHistoryId,
                          unlockKey,
                          key,
                          savedValue
                        )
                      }
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
              const statusMeta = PAYROLL_ENTRY_STATUS_META[getStatusForEntry(entryData)];
              if (!statusMeta) return '-';
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
              const rateHistoryId = getPeriodKey(entryData);
              const unlockKey = getPeriodUnlockKey(employee, rateHistoryId);
              const statusValue = getStatusForEntry(entryData);
              const isUpdating = statusUpdatingId === unlockKey;
              const isUnlocked = unlockedEmployeeIds.has(unlockKey);
              const isIncomplete =
                entryData?.distribution == null || entryData?.worked_days == null;
              return (
                <div className={style.actionContainer}>
                  {statusValue === PAYROLL_ENTRY_STATUS.DRAFT && (
                    <Tooltip
                      title={
                        isIncomplete
                          ? 'Заповніть "Розподіл" і "Відпрацьовані робочі дні"'
                          : 'Відправити на перевірку'
                      }
                    >
                      <span>
                        <button
                          type="button"
                          className={style.approveBtn}
                          disabled={isUpdating || isIncomplete}
                          onClick={() =>
                            handleChangeStatus(
                              employee,
                              rateHistoryId,
                              PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW
                            )
                          }
                        >
                          <Icon id="paper-plane" className={style.actionIcon} />
                        </button>
                      </span>
                    </Tooltip>
                  )}
                  {statusValue === PAYROLL_ENTRY_STATUS.SENT_FOR_REVIEW && (
                    <>
                      <Tooltip title="Затвердити">
                        <span>
                          <button
                            type="button"
                            className={style.approveBtn}
                            disabled={isUpdating}
                            onClick={() =>
                              handleChangeStatus(
                                employee,
                                rateHistoryId,
                                PAYROLL_ENTRY_STATUS.APPROVED
                              )
                            }
                          >
                            <Icon id="check" className={style.actionIcon} />
                          </button>
                        </span>
                      </Tooltip>
                      <Tooltip title="Повернути на доопрацювання">
                        <span>
                          <button
                            type="button"
                            className={style.returnBtn}
                            disabled={isUpdating}
                            onClick={() =>
                              handleChangeStatus(
                                employee,
                                rateHistoryId,
                                PAYROLL_ENTRY_STATUS.NEEDS_REVISION
                              )
                            }
                          >
                            <Icon id="x" className={style.actionIcon} />
                          </button>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {/* Розблокувати/заблокувати редагування полів цього
                      відрізка — незалежно від статусу (навіть
                      "Затверджено"), доступно завжди. За замовчуванням
                      заблоковано, див. unlockedEmployeeIds. */}
                  <Tooltip title={isUnlocked ? 'Заблокувати редагування' : 'Редагувати рядок'}>
                    <span>
                      <button
                        type="button"
                        className={`${style.rateEditBtn} ${
                          isUnlocked ? style.rateEditBtnActive : ''
                        }`}
                        onClick={() => toggleRowUnlocked(unlockKey)}
                      >
                        <Icon id="edit" className={style.rateEditIcon} />
                      </button>
                    </span>
                  </Tooltip>
                </div>
              );
            });
          }

          return value || '-';
        },
      })),
    ],
    [
      columnKeys,
      expenseItemByKey,
      statusUpdatingId,
      selectedEmployeeIds,
      isAllSelected,
      isSomeSelected,
      editingCell,
      editingValue,
      savingCell,
      unlockedEmployeeIds,
      expandedRowIds,
    ]
  );

  const handleColumnToggle = accessorKey => {
    setHiddenColumnKeys(prev => {
      const next = prev.includes(accessorKey)
        ? prev.filter(key => key !== accessorKey)
        : [...prev, accessorKey];
      localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredColumns = useMemo(
    () =>
      columns.filter(
        col =>
          FIXED_COLUMN_KEYS.includes(col.accessorKey) ||
          !hiddenColumnKeys.includes(col.accessorKey)
      ),
    [columns, hiddenColumnKeys]
  );

  const hideableColumnKeys = useMemo(
    () => columnKeys.filter(key => !FIXED_COLUMN_KEYS.includes(key)),
    [columnKeys]
  );

  const hideableColumns = useMemo(
    () => columns.filter(col => hideableColumnKeys.includes(col.accessorKey)),
    [columns, hideableColumnKeys]
  );

  const visibleColumnKeysForModal = useMemo(
    () => hideableColumnKeys.filter(key => !hiddenColumnKeys.includes(key)),
    [hideableColumnKeys, hiddenColumnKeys]
  );
  const visibleColumnsCount = visibleColumnKeysForModal.length;

  const activeAdditionalFiltersCount = [
    selectedManager,
    selectedCurrency,
    selectedPaymentForm,
    selectedPaymentDetails,
    selectedStatus,
  ].filter(value => value !== FILTER_ALL).length;

  // Вибір підрозділу через таби — обов'язкова навігація, коли табів кілька
  // (немає режиму "всі підрозділи разом"), а не фільтр, який можна скинути
  // (той самий підхід, що на "Зарплатній відомості" керівника).
  const hasActiveFilters =
    search.trim() !== '' ||
    selectedUnit !== FILTER_ALL ||
    selectedDepartment !== FILTER_ALL ||
    activeAdditionalFiltersCount > 0;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedUnit(FILTER_ALL);
    setSelectedDepartment(FILTER_ALL);
    setSelectedManager(FILTER_ALL);
    setSelectedCurrency(FILTER_ALL);
    setSelectedPaymentForm(FILTER_ALL);
    setSelectedPaymentDetails(FILTER_ALL);
    setSelectedStatus(FILTER_ALL);
    setFiltersResetKey(prev => prev + 1);
  };

  return (
    <section className={style.mainContainer}>
      <DocTitle>Payroll Review</DocTitle>
      <div className={style.headerRow}>
        <div className={style.headerText}>
          <h1 className={style.title}>Перевірка відомостей</h1>
          <p className={style.subtitle}>
            Дані по всіх співробітниках від усіх керівників за обраний місяць
          </p>
        </div>
        <div className={style.headerActionsCol}>
          <div className={style.monthWorkingDaysRow}>
            {isEditingMonthWorkingDays ? (
              <>
                <label className={style.monthWorkingDaysLabel}>
                  Робочі дні місяця:
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={style.monthWorkingDaysInput}
                    value={monthWorkingDaysInput}
                    onChange={e => setMonthWorkingDaysInput(e.target.value)}
                    disabled={savingMonthWorkingDays}
                  />
                </label>
                <Tooltip title="Зберегти">
                  <span>
                    <button
                      type="button"
                      className={style.editCellSaveBtn}
                      disabled={savingMonthWorkingDays}
                      onClick={handleSaveMonthWorkingDays}
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
                      disabled={savingMonthWorkingDays}
                      onClick={handleCancelEditMonthWorkingDays}
                    >
                      <Icon id="x" className={style.editCellIcon} />
                    </button>
                  </span>
                </Tooltip>
              </>
            ) : (
              <>
                <span className={style.monthWorkingDaysLabel}>
                  Робочі дні місяця: <strong>{monthWorkingDays}</strong>
                </span>
                <Tooltip title="Редагувати">
                  <span>
                    <button
                      type="button"
                      className={style.rateEditBtn}
                      onClick={handleStartEditMonthWorkingDays}
                    >
                      <Icon id="edit" className={style.rateEditIcon} />
                    </button>
                  </span>
                </Tooltip>
              </>
            )}
          </div>
          <DateNavigator
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onLoading={() => {}}
          />
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
        </div>

        {showAllFilters && (
          <div className={style.formsContainer}>
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
        <button
          type="button"
          className={style.exportBtn}
          disabled={selectedEmployeeIds.size === 0 || exportingToGoogle}
          onClick={handleExportToGoogleSheets}
        >
          <Icon id="upload" className={style.btnIcon} />
          {exportingToGoogle ? 'Експортуємо…' : 'Експорт в Google Sheets'}
          {selectedEmployeeIds.size > 0 && (
            <span className={style.filterCountBadge}>
              {selectedEmployeeIds.size}
            </span>
          )}
        </button>
        <button type="button" className={style.exportBtn} onClick={handleOpenNbuModal}>
          Курси НБУ
        </button>
      </div>

      {hasSubdivisionTabs && (
        <ul className={style.subdivisionTabs}>
          {subdivisionTabs.map(tab => (
            <li key={tab.value}>
              <button
                type="button"
                className={`${style.subdivisionTab} ${
                  tab.value === selectedSubdivision ? style.subdivisionTabActive : ''
                }`}
                onClick={() => setSelectedSubdivision(tab.value)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasSubdivisionTabs && selectedSubdivision === FILTER_ALL && (
        <p className={style.subdivisionAllHint}>
          У різних підрозділів різні статті витрат, тому на табі «Усі» вони не
          показуються — перейдіть на таб конкретного підрозділу для
          деталізації. «Всього до виплати на руки» тут пораховано з
          урахуванням статей витрат.
        </p>
      )}

      {employees.length === 0 ? (
        <p className={style.emptyText}>Немає жодного співробітника за цей місяць.</p>
      ) : filteredEmployees.length === 0 ? (
        <p className={style.emptyText}>Немає записів за обраними фільтрами.</p>
      ) : (
        <Table
          data={filteredEmployees}
          columns={filteredColumns}
          styles="payrollTable"
          fixedFirstColumn={isMobile ? true : 6}
          visibleColumns={25}
          visibleColumnsMobile={2}
          enableHorizontalScroll={isMobile ? false : true}
        />
      )}

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

      <ModalWindow
        isModalOpen={isNbuModalOpen}
        onCloseModal={() => setNbuModalOpen(false)}
        customStyles={{ width: '440px' }}
      >
        <div className={style.nbuModalContainer}>
          <h2 className={style.nbuModalTitle}>
            Курси НБУ на {startDate.format('01.MM.YYYY')}
          </h2>

          {nbuRatesLoading && !nbuRates ? (
            <p className={style.nbuModalHint}>Завантаження…</p>
          ) : nbuRatesError && !nbuRates ? (
            <p className={style.nbuModalError}>
              Не вдалося отримати курс НБУ. Спробуйте ще раз.
            </p>
          ) : nbuRates ? (
            <>
              {nbuRates.stale && (
                <p className={style.nbuModalStale}>
                  Курс застарів — останнє успішне оновлення на {nbuRates.date}.
                </p>
              )}
              <ul className={style.nbuModalList}>
                {Object.entries(nbuRates.rates).map(([currency, rate]) => (
                  <li key={currency} className={style.nbuModalRow}>
                    <span className={style.nbuModalCurrency}>
                      {currency} — {NBU_CURRENCY_LABELS[currency] || currency}
                    </span>
                    <span className={style.nbuModalRate}>{rate.toFixed(4)} грн</span>
                  </li>
                ))}
              </ul>
              {!nbuRates.stale && (
                <p className={style.nbuModalHint}>Курс на {nbuRates.date}.</p>
              )}
            </>
          ) : null}

          <button
            type="button"
            className={style.exportBtn}
            disabled={nbuRatesLoading}
            onClick={() => fetchNbuRates(true)}
          >
            {nbuRatesLoading ? 'Пробуємо ще раз…' : 'Спробувати ще раз'}
          </button>
        </div>
      </ModalWindow>

    </section>
  );
};

export default PayrollReviewPage;
