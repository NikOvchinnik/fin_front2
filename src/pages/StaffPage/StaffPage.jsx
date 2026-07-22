import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import { useMediaQuery } from '@mui/material';
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
import { getUnits } from '../../helpers/axios/units';
import { getEmployees } from '../../helpers/axios/employees';
import { employeeFields, normalizeEmployee } from '../../helpers/employees';

const departmentOptions = [{ value: FILTER_ALL, label: 'Усі' }];
const subdivisionOptions = [{ value: FILTER_ALL, label: 'Усі' }];

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

const currencySymbols = { UAH: '₴', USD: '$', EUR: '€' };

const formatRate = (rate, currency) => {
  const symbol = currencySymbols[currency] || '';
  const formattedNumber = String(rate).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${symbol}${formattedNumber}`;
};

const employeeFieldByKey = employeeFields.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

const StaffPage = () => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [search, setSearch] = useState('');
  const [unitOptions, setUnitOptions] = useState([
    { value: FILTER_ALL, label: 'Усі' },
  ]);
  const [selectedUnit, setSelectedUnit] = useState(FILTER_ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_ALL);
  const [selectedSubdivision, setSelectedSubdivision] = useState(FILTER_ALL);
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

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const units = await getUnits();
        setUnitOptions([
          { value: FILTER_ALL, label: 'Усі' },
          ...(units || []).map(unit => ({
            value: unit.id,
            label: unit.name,
          })),
        ]);
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchUnits();
  }, [t]);

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
                <button
                  type="button"
                  className={style.rateEditBtn}
                  onClick={() => setSelectedEmployee(row.original)}
                >
                  <Icon id="edit" className={style.rateEditIcon} />
                </button>
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
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <Table
          data={employees}
          columns={filteredColumns}
          fixedFirstColumn={2}
          styles="staffTable"
          visibleColumns={25}
          visibleColumnsMobile={2}
          rowsPerPage={15}
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
