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

// Якщо ставку міняли ВСЕРЕДИНІ місяця — бекенд віддає employee.payroll_entry
// (перший відрізок) + employee.extra_payroll_entries (2-й і подальші,
// _resolve_rate_periods_for_month). Кожен відрізок — незалежний запис зі
// своїми полями/статусом, "рядок" на екрані лишається один (стек підрядків,
// той самий патерн, що rateSlots на "Співробітниках").
const getEntrySlots = employee => [
  employee.payroll_entry,
  ...(employee.extra_payroll_entries || []),
];

const hasMultiplePeriods = employee =>
  (employee.extra_payroll_entries || []).length > 0;

// rate_history_id самого запису однозначно ідентифікує відрізок — null для
// першого (як і завжди було), id рядка EmployeeRateHistory для 2-го й
// подальших.
const getPeriodKey = entryData => entryData?.rate_history_id ?? null;

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
  taxes: 'Податки',
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
  taxes: 'Податки',
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
const BULK_EDIT_SAVE_FIELDS = ['distribution', 'worked_days', 'bonus'];

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
// entryData — конкретний відрізок ставки місяця (employee.payroll_entry або
// один з employee.extra_payroll_entries), щоб та сама перевірка працювала
// незалежно від того, скільки їх у цього рядка.
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
  if (!employee.tax_formula) missing.push('Податки');
  return missing;
};

// Людською мовою — та сама формула, що рахує бекенд.
const TAX_FORMULA_DESCRIPTIONS = {
  'ставка Nett': 'Податки не нараховуються.',
  'ставка Gross': 'Податки не нараховуються.',
  'ставка без КП': 'Податки не нараховуються.',
  'ставка + КП (6%)':
    'Податки = (Нараховано + Компенсація відпустки + Бонус) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
  'ставка + КП (6%+ЄСВ)':
    'Податки = (Нараховано + Компенсація відпустки + Бонус + 1903) / 0,94 − (Нараховано + Компенсація відпустки + Бонус)',
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
  const [editingCell, setEditingCell] = useState(null); // { employeeId, field, rateHistoryId } | null
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const editingCellRef = useRef(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => new Set());
  const [isBulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [isBulkSaving, setBulkSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  // Рядки з розгорнутим підрядком другої (і подальшої) ставки місяця — той
  // самий патерн, що rowExpandToggle на "Співробітниках" (StaffPage), тільки
  // тут відрізки не керівників, а зміни ставки ВСЕРЕДИНІ місяця
  // (employee.extra_payroll_entries, бекенд _resolve_rate_periods_for_month).
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set());

  const toggleRowExpand = employeeId => {
    setExpandedRowIds(prev => {
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

  // Оновлює правильний "відрізок" рядка після збереження: rateHistoryId
  // null — це employee.payroll_entry (перший відрізок, разом з дзеркальними
  // top-level employee.rate/currency і підсвіткою рядка за статусом), інакше
  // шукає відповідний запис в employee.extra_payroll_entries за
  // rate_history_id.
  const applyPayrollEntryUpdate = (employeeId, rateHistoryId, updatedEntry) => {
    setEmployees(prev =>
      prev.map(item => {
        if (item.id !== employeeId) return item;
        if (rateHistoryId === null) {
          const next = {
            ...item,
            payroll_entry: updatedEntry,
            rate: updatedEntry?.rate,
            currency: updatedEntry?.currency,
          };
          return { ...next, className: getRowClassName(next) };
        }
        return {
          ...item,
          extra_payroll_entries: (item.extra_payroll_entries || []).map(entry =>
            getPeriodKey(entry) === rateHistoryId ? updatedEntry : entry
          ),
        };
      })
    );
  };

  const handleStartEdit = (employeeId, rateHistoryId, field, currentValue) => {
    if (editingCell) {
      Notify.warning(UNSAVED_EDIT_WARNING);
      return;
    }
    const employee = employees.find(item => item.id === employeeId);
    const entryData = employee
      ? getEntrySlots(employee).find(entry => getPeriodKey(entry) === rateHistoryId)
      : null;
    if (entryData && isEntryLocked(entryData)) {
      Notify.warning('Рядок заблокований — дані вже відправлені на перевірку.');
      return;
    }
    setEditingCell({ employeeId, rateHistoryId, field });
    setEditingValue(currentValue ?? '');
  };

  // Єдина дія, доступна керівнику зараз: відправити на перевірку або
  // скасувати відправку. "Повернуто на доопрацювання"/"Затверджено" — це
  // рішення бухгалтерії, звідси їх виставити не можна (бекенд це теж
  // перевіряє й відхилить будь-який інший перехід). rateHistoryId —
  // кожен відрізок ставки місяця має свій НЕЗАЛЕЖНИЙ статус, той самий
  // підхід, що вже застосований до кількох керівників одного співробітника.
  const handleChangeEntryStatus = async (employee, rateHistoryId, newStatus) => {
    const statusKey = `${employee.id}:${rateHistoryId ?? 'primary'}`;
    setStatusUpdatingId(statusKey);
    try {
      const result = await updateEmployeePayrollEntryStatus(employee.id, {
        month: monthParam,
        status: newStatus,
        rate_history_id: rateHistoryId,
      });
      applyPayrollEntryUpdate(employee.id, rateHistoryId, result?.payroll_entry);
      if (newStatus !== PAYROLL_ENTRY_STATUS.DRAFT) {
        if (rateHistoryId === null) {
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
      } else if (error?.response?.data?.code === 'PAYROLL_ENTRY_INCOMPLETE') {
        Notify.failure(error.response.data.message);
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
      // Ручні статті витрат (calc_type="manual") живуть в окремій таблиці
      // (employee_payroll_expense_values), не в employee_payroll_entry —
      // тому окремий ендпоінт, той самий UI редагування (isEditing тощо).
      // Вони НЕ прив'язані до відрізка ставки (спільні на весь місяць),
      // тому rate_history_id тут не передається.
      const result = editingCell.field.startsWith(EXPENSE_ITEM_KEY_PREFIX)
        ? await updateEmployeePayrollExpenseValue(editingCell.employeeId, {
            month: monthParam,
            expense_item_id: Number(
              editingCell.field.slice(EXPENSE_ITEM_KEY_PREFIX.length)
            ),
            value: editingValue,
          })
        : await updateEmployeePayrollEntry(editingCell.employeeId, {
            month: monthParam,
            field: editingCell.field,
            value: editingValue,
            rate_history_id: editingCell.rateHistoryId,
          });
      applyPayrollEntryUpdate(
        editingCell.employeeId,
        editingCell.field.startsWith(EXPENSE_ITEM_KEY_PREFIX) ? null : editingCell.rateHistoryId,
        result?.payroll_entry
      );
      setEditingCell(null);
      setEditingValue('');
    } catch (error) {
      if (error?.response?.data?.code === 'WORKED_DAYS_EXCEEDS_MONTH') {
        Notify.failure(error.response.data.message);
      } else {
        Notify.failure('Не вдалося зберегти значення.');
      }
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

  // Стекує значення клітинки по ВСІХ відрізках ставки місяця цього рядка
  // (employee.payroll_entry + employee.extra_payroll_entries) — той самий
  // патерн, що rateSlots/multiValueCell на "Співробітниках". Для звичайного
  // випадку "одна ставка на місяць" (99% рядків) повертає renderSlot(...)
  // напряму, без жодної обгортки — вигляд і розмітка лишаються точно такими,
  // як до підтримки кількох ставок на місяць.
  const renderStackedSlots = (employee, renderSlot) => {
    const slots = getEntrySlots(employee);
    if (slots.length <= 1) {
      return renderSlot(slots[0], false, 0);
    }
    const isExpanded = expandedRowIds.has(employee.id);
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
  // до виплати на руки" — на відміну від решти полів (Ставка/Розподіл/
  // Відпрацьовані дні/Нараховано/Податки — лишаються показані ОКРЕМО на
  // кожен відрізок, renderStackedSlots), тут потрібне ОДНЕ підсумкове число
  // за весь місяць одразу по всіх відрізках (узгоджено з фінансистом): для
  // звичайного випадку "одна ставка на місяць" — renderSlot(...) напряму
  // (жодних змін), інакше — renderCombined(employee.combined_totals).
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

          // Ім'я — тут же шеврон розгортання підрядків 2-ї й подальшої
          // ставки місяця (employee.extra_payroll_entries), той самий
          // патерн, що rowExpandToggle на "Співробітниках".
          if (key === 'local_full_name') {
            const isExpanded = expandedRowIds.has(employee.id);
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
            // межах одного й того самого "Робочі дні місяця") — виставляє
            // фінансист на "Перевірці відомостей", не сам керівник. Для
            // заморожених записів це те, що реально застосувалось при
            // відправці, не поточне значення (див. _serialize_payroll_entry).
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

          // Динамічна колонка "статті витрат" — calc_type визначає, як
          // показувати значення: "formula" готове рахує бекенд (тільки
          // читання, окремо для кожного відрізка ставки — формула могла
          // включати rate), "manual" — керівник вводить сам, ОДНЕ спільне
          // значення на весь місяць (не прив'язане до відрізка ставки, тому
          // без стекування — об'єднано з EDITABLE_PAYROLL_FIELDS нижче, щоб
          // не дублювати UI редагування клітинки), не визначено (ще) — "-".
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
            const isEditing =
              editingCell?.employeeId === employee.id &&
              editingCell?.rateHistoryId === null &&
              editingCell?.field === key;
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
                {!isPayrollEntryLocked(employee) && (
                  <button
                    type="button"
                    className={style.rateEditBtn}
                    onClick={() => handleStartEdit(employee.id, null, key, savedValue)}
                  >
                    <Icon id="edit" className={style.rateEditIcon} />
                  </button>
                )}
              </div>
            );
          }

          if (EDITABLE_PAYROLL_FIELDS.includes(key)) {
            return renderStackedSlots(employee, entryData => {
              const rateHistoryId = getPeriodKey(entryData);
              const isEditing =
                editingCell?.employeeId === employee.id &&
                editingCell?.rateHistoryId === rateHistoryId &&
                editingCell?.field === key;
              const savedValue = entryData?.[key];

              // "Розподіл" — відсоток (0-100), "Відпрацьовані робочі дні" —
              // не може перевищувати "Робочі дні місяця" (payroll-month-
              // settings, виставляє фінансист на "Перевірці відомостей");
              // при кількох відрізках ставки бекенд додатково перевіряє, щоб
              // СУМА відпрацьованих днів усіх відрізків не перевищила це
              // число (див. WORKED_DAYS_EXCEEDS_MONTH).
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
                  {!isEntryLocked(entryData) && (
                    <button
                      type="button"
                      className={style.rateEditBtn}
                      onClick={() =>
                        handleStartEdit(employee.id, rateHistoryId, key, savedValue)
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
              const rateHistoryId = getPeriodKey(entryData);
              const statusValue = getEntryStatus(entryData);
              const isUpdating =
                statusUpdatingId === `${employee.id}:${rateHistoryId ?? 'primary'}`;

              if (statusValue === PAYROLL_ENTRY_STATUS.DRAFT) {
                // Відправити на перевірку можна лише коли керівник заповнив
                // те, за що сам відповідає (Розподіл/Відпрацьовані робочі
                // дні) — бекенд це теж перевіряє (PAYROLL_ENTRY_INCOMPLETE),
                // тут лише проактивно блокуємо кнопку, щоб не було сюрпризу
                // після кліку.
                const isIncomplete =
                  entryData?.distribution == null || entryData?.worked_days == null;
                return (
                  <div className={style.actionContainer}>
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
                          className={style.sendReviewBtn}
                          disabled={isUpdating || isIncomplete}
                          onClick={() =>
                            handleChangeEntryStatus(
                              employee,
                              rateHistoryId,
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
                              rateHistoryId,
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
      expandedRowIds,
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
