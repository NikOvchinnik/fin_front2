import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import DocTitle from '../../components/DocTitle/DocTitle';
import Icon from '../../components/Icon/Icon';
import Loader from '../../components/Loader/Loader';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import Table from '../../components/Table/Table';
import EmployeeForm from '../../components/Forms/EmployeeForm/EmployeeForm';
import GoogleSheetImportForm from '../../components/Forms/GoogleSheetImportForm/GoogleSheetImportForm';
import { getEmployees } from '../../helpers/axios/employees';
import {
  employeeFields,
  getEmployeeHistory,
  normalizeEmployee,
} from '../../helpers/employees';
import style from './EmployeesPage.module.css';

const EmployeesPage = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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

  const closeModal = () => {
    setModalType(null);
    setSelectedEmployee(null);
  };

  const openEditModal = employee => {
    setSelectedEmployee(employee);
    setModalType('edit');
  };

  const openHistoryModal = employee => {
    setSelectedEmployee(employee);
    setModalType('history');
  };

  const activeEmployeesCount = employees.filter(
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
            <button
              type="button"
              className={style.historyBtn}
              onClick={() => openHistoryModal(row.original)}
            >
              Історія
            </button>
          </div>
        ),
      },
    ],
    []
  );

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
              <strong>{employees.length}</strong>
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

          {employees.length > 0 ? (
            <Table
              data={employees}
              columns={columns}
              visibleColumns={6}
              visibleColumnsMobile={2}
              rowsPerPage={15}
              enableHorizontalScroll
            />
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
