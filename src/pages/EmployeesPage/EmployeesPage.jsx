import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import { useMediaQuery } from '@mui/material';
import DocTitle from '../../components/DocTitle/DocTitle';
import Form from '../../components/Form/Form';
import Icon from '../../components/Icon/Icon';
import Loader from '../../components/Loader/Loader';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import Table from '../../components/Table/Table';
import EmployeeForm from '../../components/Forms/EmployeeForm/EmployeeForm';
import GoogleSheetImportForm from '../../components/Forms/GoogleSheetImportForm/GoogleSheetImportForm';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import { getEmployees } from '../../helpers/axios/employees';
import {
  buildEmployeeFieldOptions,
  employeeFields,
  getEmployeeHistory,
  normalizeEmployee,
} from '../../helpers/employees';
import { exportToCSV } from '../../helpers/exportToCSV';
import { FILTER_ALL } from '../../helpers/status';
import style from './EmployeesPage.module.css';

const EMPLOYEE_STATUS_ACTIVE = 'active';
const EMPLOYEE_STATUS_TERMINATED = 'terminated';
const SHOW_EMPLOYEE_HISTORY_ACTION = false;

const withAllOption = options => [
  { value: FILTER_ALL, label: 'Усі' },
  ...options,
];

const EmployeesPage = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    unit: FILTER_ALL,
    department: FILTER_ALL,
    subdivision: FILTER_ALL,
    position: FILTER_ALL,
    payment_form: FILTER_ALL,
    manager: FILTER_ALL,
    status: FILTER_ALL,
  });
  const [textFilters, setTextFilters] = useState({
    name: '',
    tax_id: '',
  });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleEmployeeColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const fetchData = useCallback(async () => {
    try {
      const response = await getEmployees();
      const list = Array.isArray(response) ? response : response?.employees ?? [];
      setEmployees(list.map(normalizeEmployee));
    } catch {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const closeModal = useCallback(() => {
    setModalType(null);
    setSelectedEmployee(null);
  }, []);

  const openEditModal = useCallback(employee => {
    setSelectedEmployee(employee);
    setModalType('edit');
  }, []);

  const openHistoryModal = useCallback(employee => {
    setSelectedEmployee(employee);
    setModalType('history');
  }, []);

  const filterOptions = useMemo(
    () => ({
      unit: withAllOption(buildEmployeeFieldOptions(employees, 'unit')),
      department: withAllOption(
        buildEmployeeFieldOptions(employees, 'department')
      ),
      subdivision: withAllOption(
        buildEmployeeFieldOptions(employees, 'subdivision')
      ),
      position: withAllOption(buildEmployeeFieldOptions(employees, 'position')),
      payment_form: withAllOption(
        buildEmployeeFieldOptions(employees, 'payment_form')
      ),
      manager: withAllOption(buildEmployeeFieldOptions(employees, 'manager')),
    }),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    let rows = employees;

    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (!value || value === FILTER_ALL || key === 'status') return;
      rows = rows.filter(employee => employee[key] === value);
    });

    if (selectedFilters.status === EMPLOYEE_STATUS_ACTIVE) {
      rows = rows.filter(employee => !employee.termination_date);
    }

    if (selectedFilters.status === EMPLOYEE_STATUS_TERMINATED) {
      rows = rows.filter(employee => employee.termination_date);
    }

    if (textFilters.name) {
      rows = rows.filter(employee =>
        [
          employee.full_name,
          employee.accounting_full_name,
          employee.local_full_name,
        ]
          .join(' ')
          .toLowerCase()
          .includes(textFilters.name)
      );
    }

    if (textFilters.tax_id) {
      rows = rows.filter(employee =>
        String(employee.tax_id ?? '').includes(textFilters.tax_id)
      );
    }

    return rows;
  }, [employees, selectedFilters, textFilters]);

  const employeeRows = useMemo(
    () =>
      filteredEmployees.map(employee => {
        const row = { ...employee };

        employeeFields.forEach(field => {
          row[field.key] = employee[field.key] || '-';
          row[`${field.key}_plain`] = employee[field.key] || '';
        });

        return row;
      }),
    [filteredEmployees]
  );

  const activeEmployeesCount = filteredEmployees.filter(
    employee => !employee.termination_date
  ).length;

  const columns = useMemo(
    () => [
      ...employeeFields.map(field => ({
        accessorKey: field.key,
        header: field.label,
        cell: ({ row }) => row.original[field.key] || '-',
      })),
      {
        accessorKey: 'actions',
        header: 'Дії',
        cell: ({ row }) => (
          <div className={style.actionsCell}>
            <button
              type="button"
              className={style.iconBtn}
              title="Редагувати"
              onClick={() => openEditModal(row.original)}
            >
              <Icon id="edit" className={style.actionIcon} />
            </button>
            {SHOW_EMPLOYEE_HISTORY_ACTION && (
              <button
                type="button"
                className={style.historyBtn}
                onClick={() => openHistoryModal(row.original)}
              >
                Історія
              </button>
            )}
          </div>
        ),
      },
    ],
    [openEditModal, openHistoryModal]
  );

  const filteredColumns = useMemo(() => {
    if (visibleColumns === 'All') return columns;
    return columns.filter(col => visibleColumns.includes(col.accessorKey));
  }, [columns, visibleColumns]);

  const handleColumnToggle = accessorKey => {
    setVisibleColumns(prev => {
      let updated;

      if (prev === 'All') {
        updated = columns
          .map(column => column.accessorKey)
          .filter(key => key !== accessorKey);
      } else {
        updated = prev.includes(accessorKey)
          ? prev.filter(key => key !== accessorKey)
          : [...prev, accessorKey];

        if (updated.length === columns.length) updated = 'All';
      }

      localStorage.setItem('visibleEmployeeColumns', JSON.stringify(updated));
      return updated;
    });
  };

  const handleFilterChange = (name, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearchChange = event => {
    const { name, value } = event.target;

    setTextFilters(prev => ({
      ...prev,
      [name]: value.toLowerCase().trim(),
    }));
  };

  const history = getEmployeeHistory(selectedEmployee);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Співробітники</DocTitle>

          <div className={style.header}>
            <div>
              <h1 className={style.title}>Співробітники</h1>
              <p className={style.subtitle}>
                Окрема база співробітників для нарахування зарплатні.
              </p>
            </div>

            <div className={style.headerActions}>
              <button
                type="button"
                className={style.secondaryBtn}
                onClick={() => setModalType('import')}
              >
                <Icon id="upload" className={style.btnIcon} />
                Імпорт з Google Sheets
              </button>
              <button
                type="button"
                className={style.primaryBtn}
                onClick={() => setModalType('create')}
              >
                <span className={style.plus}>+</span>
                Додати співробітника
              </button>
            </div>
          </div>

          <div className={style.summaryRow}>
            <div className={style.summaryItem}>
              <span>Усього</span>
              <strong>{filteredEmployees.length}</strong>
            </div>
            <div className={style.summaryItem}>
              <span>Активні</span>
              <strong>{activeEmployeesCount}</strong>
            </div>
            <div className={style.summaryItem}>
              <span>Звільнені</span>
              <strong>{employees.length - activeEmployeesCount}</strong>
            </div>
          </div>

          <div className={style.filterContainer}>
            <div className={style.filterActionsRow}>
              <button
                className={style.filterBtn}
                type="button"
                onClick={() => setShowAllFilters(prev => !prev)}
              >
                <Icon id="filter_list" className={style.filterIcon} />
                {showAllFilters ? 'Сховати фільтри' : 'Усі фільтри'}
              </button>
              <button
                className={style.csvBtn}
                type="button"
                onClick={() =>
                  exportToCSV({
                    rows: employeeRows,
                    columns: filteredColumns,
                    filePrefix: 'employees',
                  })
                }
              >
                Export CSV
              </button>
              <button
                className={style.filterBtn}
                type="button"
                onClick={() => setModalType('columns')}
              >
                <Icon id="filter_list" className={style.filterIcon} />
                Фільтр колонок
              </button>
            </div>

            <div className={style.formsContainer}>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'unit',
                    label: 'Unit',
                    options: filterOptions.unit,
                    onChange: value => handleFilterChange('unit', value),
                  },
                ]}
                defaultValues={{ unit: selectedFilters.unit }}
              />
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'department',
                    label: 'Department',
                    options: filterOptions.department,
                    onChange: value => handleFilterChange('department', value),
                  },
                ]}
                defaultValues={{ department: selectedFilters.department }}
              />
              <form className={style.searchContainer}>
                <label className={style.labelContainer}>
                  <input
                    type="text"
                    name="name"
                    className={style.inputContainer}
                    placeholder="ПІБ / Full Name"
                    onChange={handleSearchChange}
                  />
                </label>
              </form>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'payment_form',
                    label: 'Форма оплати',
                    options: filterOptions.payment_form,
                    onChange: value =>
                      handleFilterChange('payment_form', value),
                  },
                ]}
                defaultValues={{ payment_form: selectedFilters.payment_form }}
              />
            </div>

            {showAllFilters && (
              <div className={style.formsContainer}>
                <Form
                  fields={[
                    {
                      type: 'select',
                      name: 'subdivision',
                      label: 'Subdivision',
                      options: filterOptions.subdivision,
                      onChange: value =>
                        handleFilterChange('subdivision', value),
                    },
                  ]}
                  defaultValues={{ subdivision: selectedFilters.subdivision }}
                />
                <Form
                  fields={[
                    {
                      type: 'select',
                      name: 'position',
                      label: 'Position',
                      options: filterOptions.position,
                      onChange: value => handleFilterChange('position', value),
                    },
                  ]}
                  defaultValues={{ position: selectedFilters.position }}
                />
                <Form
                  fields={[
                    {
                      type: 'select',
                      name: 'manager',
                      label: 'Керівник',
                      options: filterOptions.manager,
                      onChange: value => handleFilterChange('manager', value),
                    },
                  ]}
                  defaultValues={{ manager: selectedFilters.manager }}
                />
                <form className={style.searchContainer}>
                  <label className={style.labelContainer}>
                    <input
                      type="text"
                      name="tax_id"
                      className={style.inputContainer}
                      placeholder="ІПН"
                      onChange={handleSearchChange}
                    />
                  </label>
                </form>
              </div>
            )}

            <ul className={style.statuscontainer}>
              {[
                { value: FILTER_ALL, label: 'Усі' },
                { value: EMPLOYEE_STATUS_ACTIVE, label: 'Активні' },
                { value: EMPLOYEE_STATUS_TERMINATED, label: 'Звільнені' },
              ].map(status => (
                <li key={status.value}>
                  <button
                    className={`${style.statusBtn} ${
                      selectedFilters.status === status.value
                        ? style.activeBtn
                        : ''
                    }`}
                    type="button"
                    onClick={() => handleFilterChange('status', status.value)}
                  >
                    {status.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {employeeRows.length > 0 ? (
            <Table
              data={employeeRows}
              columns={filteredColumns}
              fixedFirstColumn={isMobile}
              styles="analyticTable"
              visibleColumns={25}
              visibleColumnsMobile={2}
              rowsPerPage={15}
              enableHorizontalScroll={isMobile ? false : true}
            />
          ) : employees.length > 0 ? (
            <div className={style.emptyState}>
              <p>За вибраними фільтрами співробітників не знайдено.</p>
            </div>
          ) : (
            <div className={style.emptyState}>
              <p>Список співробітників порожній.</p>
              <button
                type="button"
                className={style.primaryBtn}
                onClick={() => setModalType('create')}
              >
                <span className={style.plus}>+</span>
                Додати співробітника
              </button>
            </div>
          )}

          <ModalWindow
            isModalOpen={modalType === 'create'}
            onCloseModal={closeModal}
            customStyles={{ maxWidth: '94vw' }}
          >
            <EmployeeForm
              closeModal={closeModal}
              onRefresh={fetchData}
              employees={employees}
              mode="create"
            />
          </ModalWindow>

          <ModalWindow
            isModalOpen={modalType === 'edit'}
            onCloseModal={closeModal}
            customStyles={{ maxWidth: '94vw' }}
          >
            <EmployeeForm
              closeModal={closeModal}
              onRefresh={fetchData}
              employees={employees}
              employee={selectedEmployee}
              mode="edit"
            />
          </ModalWindow>

          <ModalWindow
            isModalOpen={modalType === 'import'}
            onCloseModal={closeModal}
            customStyles={{ maxWidth: '96vw' }}
          >
            <GoogleSheetImportForm
              title="Імпорт співробітників з Google Sheets"
              importType="employees"
              closeModal={closeModal}
              onImported={fetchData}
            />
          </ModalWindow>

          <ModalWindow
            isModalOpen={modalType === 'columns'}
            onCloseModal={closeModal}
          >
            <ModalColumnsForm
              columns={columns}
              visibleColumns={visibleColumns}
              handleColumnToggle={handleColumnToggle}
            />
          </ModalWindow>

          <ModalWindow
            isModalOpen={modalType === 'history'}
            onCloseModal={closeModal}
            customStyles={{ maxWidth: '92vw' }}
          >
            <div className={style.historyModal}>
              <h2>Історія змін профілю</h2>
              <p className={style.historyEmployee}>
                {selectedEmployee?.local_full_name ||
                  selectedEmployee?.accounting_full_name ||
                  '-'}
              </p>
              {history.length > 0 ? (
                <ul className={style.historyList}>
                  {history.map((item, index) => (
                    <li key={item.id ?? index} className={style.historyItem}>
                      <div className={style.historyMeta}>
                        <span>{item.created_at ?? item.date ?? '-'}</span>
                        <span>{item.created_by ?? item.author ?? '-'}</span>
                        <span>{item.source ?? item.creation_source ?? '-'}</span>
                      </div>
                      <p>
                        {item.description ??
                          item.action ??
                          item.change_summary ??
                          'Зміна картки співробітника'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={style.emptyHistory}>
                  Історія змін відсутня у відповіді API.
                </p>
              )}
            </div>
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default EmployeesPage;
