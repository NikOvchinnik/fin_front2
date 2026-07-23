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
import { getEmployees } from '../../helpers/axios/employees';
import {
  buildEmployeeFieldOptions,
  employeeFields,
  formatRate,
  normalizeEmployee,
} from '../../helpers/employees';

const withAllOption = options => [
  { value: FILTER_ALL, label: 'Усі' },
  ...options,
];

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

const newStaffFieldLabels = {
  status: 'Статус',
  currency: 'Валюта',
  rate: 'Ставка',
};

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
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    const saved = localStorage.getItem('staffVisibleColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const [isColumnsModalOpen, setColumnsModalOpen] = useState(false);

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
      setEmployees(list.map(normalizeEmployee));
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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const columns = useMemo(
    () =>
      staffColumnKeys.map(key => ({
        accessorKey: key,
        header: employeeFieldByKey[key]?.label || newStaffFieldLabels[key],
        cell: ({ row }) => {
          const value = row.original[key];
          if (key === 'local_full_name' && value && row.original.rate) {
            return (
              <div className={style.rateValueCell}>
                <span>{value}</span>
                <Tooltip title="Редагувати ставку" arrow>
                  <button
                    type="button"
                    className={style.rateEditBtn}
                    onClick={() => setSelectedEmployee(row.original)}
                  >
                    <Icon id="edit" className={style.rateEditIcon} />
                  </button>
                </Tooltip>
              </div>
            );
          }
          if (key === 'rate' && !value) {
            return (
              <button
                type="button"
                className={style.addRateBtn}
                onClick={() => setSelectedEmployee(row.original)}
              >
                <Icon id="add" className={style.addRateIcon} />
                Додати ставку
              </button>
            );
          }
          if (key === 'rate' && value) {
            return (
              <div className={style.rateValueCell}>
                <span>{formatRate(value, row.original.currency)}</span>
                <Tooltip title="Редагувати ставку" arrow>
                  <button
                    type="button"
                    className={style.rateEditBtn}
                    onClick={() => setSelectedEmployee(row.original)}
                  >
                    <Icon id="edit" className={style.rateEditIcon} />
                  </button>
                </Tooltip>
              </div>
            );
          }
          return value || '-';
        },
      })),
    []
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
    if (selectedPosition !== FILTER_ALL) {
      rows = rows.filter(employee => employee.position === selectedPosition);
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
      rows = rows.filter(employee => employee.currency === selectedCurrency);
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
    selectedPosition,
    selectedPaymentForm,
    selectedPaymentDetails,
    selectedCurrency,
  ]);

  const activeAdditionalFiltersCount = [
    selectedPosition,
    selectedPaymentForm,
    selectedPaymentDetails,
    selectedCurrency,
  ].filter(value => value !== FILTER_ALL).length;

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
                    name: 'currency',
                    label: 'Валюта',
                    options: currencyOptions,
                    onChange: value => setSelectedCurrency(value),
                  },
                ]}
                defaultValues={{ currency: selectedCurrency }}
              />
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
        />
      )}

      <StaffRateDrawer
        key={selectedEmployee?.id}
        isOpen={!!selectedEmployee}
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
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
