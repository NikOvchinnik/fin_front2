import { useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import { useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import DocTitle from '../../components/DocTitle/DocTitle';
import Form from '../../components/Form/Form';
import Icon from '../../components/Icon/Icon';
import Loader from '../../components/Loader/Loader';
import Table from '../../components/Table/Table';
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
  'payment_details',
  'tax_id',
  'manager',
  'unit',
  'department',
  'subdivision',
  'position',
  'payment_form',
  'currency',
  'rate',
];

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
  const [unitOptions, setUnitOptions] = useState([
    { value: FILTER_ALL, label: 'Усі' },
  ]);
  const [selectedUnit, setSelectedUnit] = useState(FILTER_ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_ALL);
  const [selectedSubdivision, setSelectedSubdivision] = useState(FILTER_ALL);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const fetchEmployees = async () => {
      try {
        const response = await getEmployees();
        const list = Array.isArray(response)
          ? response
          : response?.employees ?? [];
        setEmployees(list.map(normalizeEmployee));
      } catch {
        Notify.failure(t('notifications.genericError'));
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [t]);

  const columns = useMemo(
    () =>
      staffColumnKeys.map(key => ({
        accessorKey: key,
        header: employeeFieldByKey[key]?.label || newStaffFieldLabels[key],
        cell: ({ row }) => row.original[key] || '-',
      })),
    []
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
            onClick={() => setShowAllFilters(prev => !prev)}
          >
            <Icon id="filter_list" className={style.filterIcon} />
            {showAllFilters ? 'Сховати фільтри' : 'Більше фільтрів'}
          </button>
          <button type="button" className={style.filterBtn}>
            <Icon id="filter_list" className={style.filterIcon} />
            Фільтр колонок
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <Table
          data={employees}
          columns={columns}
          fixedFirstColumn={2}
          styles="staffTable"
          visibleColumns={25}
          visibleColumnsMobile={2}
          rowsPerPage={15}
          enableHorizontalScroll={isMobile ? false : true}
        />
      )}
    </section>
  );
};

export default StaffPage;
