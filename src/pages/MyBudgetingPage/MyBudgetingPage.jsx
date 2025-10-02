import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './MyBudgetingPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import { selectUserId, selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import { getMyBudgeting, sendBudgeting } from '../../helpers/axios/budgeting';
import {
  geBudgetingStatusStyle,
  getActiveBudgetingStatus,
  getShortBudgetingStatus,
  statusSelectorBudgetingFin,
} from '../../helpers/budgetingStatuses';
import MonthNavigator from '../../components/MonthNavigator/MonthNavigator';
import { useParams } from 'react-router-dom';
import BudgetNewForm from '../../components/Forms/BudgetNewForm/BudgetNewForm';
import BudgetEditForm from '../../components/Forms/BudgetEditForm/BudgetEditForm';
import BudgetWatchForm from '../../components/Forms/BudgetWatchForm/BudgetWatchForm';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { exportToCSV } from '../../helpers/exportToCSV';

const MyBudgetingPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    applicant: '',
    payer: '',
    expense_category: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc',
  });
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState('Всі');
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleMyBudgetColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const userRole = useSelector(selectUserRole);
  const userSelectorId = useSelector(selectUserId);
  const { userId } = useParams();

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      const requests = await getMyBudgeting({
        userId,
        startDate: startDate ? startDate.format('MM.YYYY') : null,
        endDate: endDate ? endDate.format('MM.YYYY') : null,
      });

      setDataRequests(requests);
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoadingTable(false);
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (userRole !== 1 && String(userSelectorId) !== String(userId)) {
      navigate('/');
    } else {
      fetchData();
    }
  }, [fetchData]);

  const handleSort = key => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  const handleColumnToggle = accessorKey => {
    setVisibleColumns(prev => {
      let updated;
      if (prev === 'All') {
        updated = columns
          .map(c => c.accessorKey)
          .filter(key => key !== accessorKey);
      } else {
        if (prev.includes(accessorKey)) {
          updated = prev.filter(key => key !== accessorKey);
        } else {
          updated = [...prev, accessorKey];
        }
        if (updated.length === columns.length) updated = 'All';
      }
      localStorage.setItem('visibleMyBudgetColumns', JSON.stringify(updated));
      return updated;
    });
  };

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    let filteredRows = dataRequests;

    if (activeStatus && activeStatus !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => getActiveBudgetingStatus(row.status?.name) === activeStatus
      );
    }

    let sortedRows = [...filteredRows];

    if (sortConfig.key) {
      const getFieldValue = (req, key) => {
        switch (key) {
          case 'created_at':
            return req.created_at ?? '';
          case 'project':
            return req.project ?? '';
          case 'week':
            return req.week ?? '';
          case 'purpose':
            return req.purpose ?? '';
          case 'amount_optimistic':
            return req.amount_optimistic ?? 0;
          case 'amount_pessimistic':
            return req.amount_pessimistic ?? 0;
          case 'currency':
            return req.currency ?? '';
          case 'amount_uah_optimistic':
            return (
              (req.amount_optimistic ?? 0) *
              (req.currency_rate_at_approval ?? req.currency_rate ?? 0)
            );
          case 'amount_uah_pessimistic':
            return (
              (req.amount_pessimistic ?? 0) *
              (req.currency_rate_at_approval ?? req.currency_rate ?? 0)
            );
          case 'expense_category':
            return req.expense_category?.name ?? '';
          case 'tech':
            return req.plan_period ?? '';
          case 'status':
            return req.status?.name ?? '';
          default:
            return req[key] ?? '';
        }
      };

      const normalize = v => {
        if (v == null) return '';
        if (typeof v === 'number') return v;
        if (typeof v === 'object' && v.props) {
          const child = v.props.children;
          return normalize(
            Array.isArray(child)
              ? child
                  .map(c =>
                    typeof c === 'string' ? c : c?.props?.children ?? ''
                  )
                  .join(' ')
              : child
          );
        }
        if (typeof v === 'string') {
          const s = v.trim();
          if (s.endsWith('%')) {
            const num = parseFloat(
              s.replace('%', '').replace(/\s/g, '').replace(',', '.')
            );
            return isNaN(num) ? s.toLowerCase() : num;
          }
          const numeric = s.replace(/\s/g, '').replace(/,/g, '.');
          if (numeric !== '' && !isNaN(Number(numeric))) return Number(numeric);
          return s.toLowerCase();
        }
        return String(v);
      };

      sortedRows.sort((a, b) => {
        const valA = normalize(getFieldValue(a, sortConfig.key));
        const valB = normalize(getFieldValue(b, sortConfig.key));

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        const isDateA =
          typeof valA === 'string' && dayjs(valA, 'YYYY-MM-DD', true).isValid();
        const isDateB =
          typeof valB === 'string' && dayjs(valB, 'YYYY-MM-DD', true).isValid();
        if (isDateA && isDateB) {
          const dA = dayjs(valA);
          const dB = dayjs(valB);
          return sortConfig.direction === 'asc'
            ? dA.unix() - dB.unix()
            : dB.unix() - dA.unix();
        }

        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB), 'uk', {
              numeric: true,
              sensitivity: 'base',
            })
          : String(valB).localeCompare(String(valA), 'uk', {
              numeric: true,
              sensitivity: 'base',
            });
      });
    }

    return sortedRows.map(request => ({
      id: request.id,
      created_at: (
        <p className={style.fullWidthText}>
          {dayjs(request.created_at).format('YYYY-MM-DD') || ''}
        </p>
      ),
      created_at_plain: dayjs(request.created_at).format('YYYY-MM-DD') || '',
      project: request.project || '',
      project_plain: request.project || '',
      week: request.week
        ? request.week
            .split('_')
            .map(d => dayjs(d).format('DD.MM.YYYY'))
            .join(' - ')
        : '',
      week_plain: request.week
        ? request.week
            .split('_')
            .map(d => dayjs(d).format('DD.MM.YYYY'))
            .join(' - ')
        : '',
      purpose: (
        <p>
          <ExpandableText text={request.purpose || ''} limit={50} />
        </p>
      ),
      purpose_plain: request.purpose || '',
      amount_optimistic:
        request.amount_optimistic != null
          ? request.amount_optimistic.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_optimistic_plain: request.amount_optimistic ?? 0,
      amount_pessimistic:
        request.amount_pessimistic != null
          ? request.amount_pessimistic.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_pessimistic_plain: request.amount_pessimistic ?? 0,
      currency: request.currency || '',
      currency_plain: request.currency || '',
      amount_uah_optimistic:
        request.amount_optimistic != null &&
        (request.currency_rate_at_approval ?? request.currency_rate) != null
          ? (
              request.amount_optimistic *
              (request.currency_rate_at_approval ?? request.currency_rate)
            ).toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_uah_optimistic_plain:
        request.amount_optimistic != null &&
        (request.currency_rate_at_approval ?? request.currency_rate) != null
          ? request.amount_optimistic *
            (request.currency_rate_at_approval ?? request.currency_rate)
          : 0,

      amount_uah_pessimistic:
        request.amount_pessimistic != null &&
        (request.currency_rate_at_approval ?? request.currency_rate) != null
          ? (
              request.amount_pessimistic *
              (request.currency_rate_at_approval ?? request.currency_rate)
            ).toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_uah_pessimistic_plain:
        request.amount_pessimistic != null &&
        (request.currency_rate_at_approval ?? request.currency_rate) != null
          ? request.amount_pessimistic *
            (request.currency_rate_at_approval ?? request.currency_rate)
          : 0,
      expense_category: request.expense_category?.name || '',
      expense_category_plain: request.expense_category?.name || '',
      tech: request.plan_period ? request.plan_period : '',
      tech_plain: request.plan_period ? request.plan_period : '',
      status: (
        <span
          style={{
            borderLeft: `4px solid ${
              geBudgetingStatusStyle(request.status?.id).color
            }`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: geBudgetingStatusStyle(request.status?.id).color,
          }}
        >
          {getShortBudgetingStatus(request.status?.name)}
        </span>
      ),
      status_plain: request.status?.name || '',
      action: (
        <div className={style.actionContainer}>
          <button
            className={style.editBtn}
            onClick={() => {
              if (request.status?.id === 1 || request.status?.id === 4) {
                setSelectedRequest(request);
                openModalEdit();
              } else {
                Notify.warning(
                  `Ви не можете редагувати статус ${request.status?.name}!`
                );
              }
            }}
          >
            <Icon id="edit" className={style.editIcon} />
          </button>
          <button
            className={style.editBtn}
            onClick={() => {
              setSelectedRequest(request);
              openModalWatch();
            }}
          >
            <Icon id="eye" className={style.editIcon} />
          </button>
          {(request.status?.id === 1 || request.status?.id === 4) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (request.status?.id === 1 || request.status?.id === 4) {
                  setSelectedRequest(request);
                  setModalSendIsOpen(true);
                }
              }}
            >
              <Icon id="paper-plane" className={style.editIcon} />
            </button>
          )}
        </div>
      ),
    }));
  }, [dataRequests, activeStatus, filters, sortConfig]);

  const totals = useMemo(() => {
    if (!requestsRows.length) return null;

    const totalsByCurrencyOptimistic = requestsRows.reduce((acc, row) => {
      const currency = row.currency_plain || 'N/A';
      const amount = row.amount_optimistic_plain || 0;

      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += amount;

      return acc;
    }, {});

    const totalsByCurrencyPessimistic = requestsRows.reduce((acc, row) => {
      const currency = row.currency_plain || 'N/A';
      const amount = row.amount_pessimistic_plain || 0;

      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += amount;

      return acc;
    }, {});

    const totalUAHOptimistic = requestsRows.reduce(
      (acc, row) => acc + (row.amount_uah_optimistic_plain || 0),
      0
    );

    const totalUAHPessimistic = requestsRows.reduce(
      (acc, row) => acc + (row.amount_uah_pessimistic_plain || 0),
      0
    );

    return {
      totalsByCurrencyOptimistic,
      totalsByCurrencyPessimistic,
      totalUAHOptimistic,
      totalUAHPessimistic,
    };
  }, [requestsRows]);

  const columns = [
    {
      accessorKey: 'created_at',
      header: (
        <div className={style.sortContainer}>
          <p>Дата заявки</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('created_at')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'project',
      header: (
        <div className={style.sortContainer}>
          <p>Підрозділ</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('project')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'week',
      header: (
        <div className={style.sortContainer}>
          <p>Тиждень</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('week')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'purpose',
      header: (
        <div className={style.sortContainer}>
          <p>Призначення</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('purpose')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'amount_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума оптимістична</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount_optimistic')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'amount_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума песимістична</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount_pessimistic')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'currency',
      header: (
        <div className={style.sortContainer}>
          <p>Валюта</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('currency')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума в UAH оптимістична</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount_uah_optimistic')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума в UAH песимістична</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount_uah_pessimistic')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'expense_category',
      header: (
        <div className={style.sortContainer}>
          <p>Стаття витрат</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('expense_category')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'tech',
      header: (
        <div className={style.sortContainer}>
          <p>Період</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('tech')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: (
        <div className={style.sortContainer}>
          <p>Статус</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('status')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Дія',
    },
  ];

  const filteredColumns = useMemo(() => {
    if (visibleColumns === 'All') return columns;
    return columns.filter(col => visibleColumns.includes(col.accessorKey));
  }, [columns, visibleColumns]);

  const isMobile = useMediaQuery('(max-width: 1024px)');

  const openModalColumns = () => {
    setModalColumnsIsOpen(true);
  };

  const closeModalColumns = () => {
    setModalColumnsIsOpen(false);
  };

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const openModalEdit = () => {
    setModalEditIsOpen(true);
  };

  const closeModalEdit = () => {
    setModalEditIsOpen(false);
  };

  const openModalWatch = () => {
    setModalWatchIsOpen(true);
  };

  const closeModalWatch = () => {
    setModalWatchIsOpen(false);
  };

  const closeModalConfirm = () => {
    setModalSendIsOpen(false);
  };

  const handleSend = async () => {
    try {
      await sendBudgeting(selectedRequest.id);
      fetchData();
      closeModalConfirm();
      Notify.success('Бюджет відправлено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Budgeting</DocTitle>
          <div className={style.filterContainer}>
            <div className={style.dateContainer}>
              <MonthNavigator
                startDate={startDate}
                endDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                onLoading={setLoadingTable}
              />
              <div className={style.btnsContainer}>
                <button className={style.newBtn} onClick={openModal}>
                  Створити бюджет <span>+</span>
                </button>
                <button
                  className={style.csvBtn}
                  onClick={() =>
                    exportToCSV({
                      rows: requestsRows,
                      columns: filteredColumns,
                      filePrefix: 'my_budgeting',
                    })
                  }
                >
                  Експорт у CSV
                </button>
              </div>
            </div>
            <ul
              className={style.statuscontainer}
              style={{
                maxWidth: '680px',
              }}
            >
              {statusSelectorBudgetingFin.map(status => (
                <li key={status.value}>
                  <button
                    className={`${style.statusBtn} ${
                      activeStatus === status.value ? style.activeBtn : ''
                    }`}
                    onClick={() => setActiveStatus(status.value)}
                  >
                    {status.label}
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button className={style.filterBtn} onClick={openModalColumns}>
                <Icon id="filter_list" className={style.filterIcon} />
                Фільтр колонок
              </button>
            </div>
          </div>
          {loadingTable ? (
            <Loader />
          ) : requestsRows.length === 0 ? (
            <div className={style.noDataContainer}>
              <p className={style.noDataText}>
                Заявок за обраний період немає. Перегляньте, будь ласка, обрану
                дату періоду.
              </p>
            </div>
          ) : (
            <>
              <Table
                data={requestsRows}
                columns={filteredColumns}
                styles="analyticTable"
                fixedFirstColumn={isMobile ? true : false}
                visibleColumns={25}
                visibleColumnsMobile={2}
                rowsPerPage={25}
                enableHorizontalScroll={isMobile ? false : true}
              />
              {totals && (
                <div className={style.totalsContainer}>
                  <div className={style.currencyContainer}>
                    <div className={style.totalContainer}>
                      <p className={style.totalTitle}>
                        Всього валюти (Оптимістична):
                      </p>
                      <ul className={style.totalList}>
                        {Object.entries(totals.totalsByCurrencyOptimistic).map(
                          ([cur, sum]) => (
                            <li key={cur} className={style.totalText}>
                              <span>{cur}:</span>{' '}
                              {sum.toLocaleString('uk-UA', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className={style.totalContainer}>
                      <p className={style.totalTitle}>
                        Всього валюти (Песимістична):
                      </p>
                      <ul className={style.totalList}>
                        {Object.entries(totals.totalsByCurrencyPessimistic).map(
                          ([cur, sum]) => (
                            <li key={cur} className={style.totalText}>
                              <span>{cur}:</span>{' '}
                              {sum.toLocaleString('uk-UA', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className={style.currencyContainer}>
                    <div className={style.totalContainer}>
                      <p className={style.totalTitle}>
                        Всього в UAH (Оптимістична):
                      </p>
                      <p className={style.totalText}>
                        {totals.totalUAHOptimistic.toLocaleString('uk-UA', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className={style.totalContainer}>
                      <p className={style.totalTitle}>
                        Всього в UAH (Песимістична):
                      </p>
                      <p className={style.totalText}>
                        {totals.totalUAHPessimistic.toLocaleString('uk-UA', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <ModalWindow
            isModalOpen={isModalColumnsOpen}
            onCloseModal={closeModalColumns}
          >
            <ModalColumnsForm
              columns={columns}
              closeModal={closeModalColumns}
              visibleColumns={visibleColumns}
              handleColumnToggle={handleColumnToggle}
            />
          </ModalWindow>
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <BudgetNewForm closeModal={closeModal} onRefresh={fetchData} />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalEditOpen}
            onCloseModal={closeModalEdit}
          >
            <BudgetEditForm
              request={selectedRequest}
              closeModal={closeModalEdit}
              onRefresh={fetchData}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalWatchOpen}
            onCloseModal={closeModalWatch}
          >
            <BudgetWatchForm
              request={selectedRequest}
              closeModal={closeModalWatch}
              onRefresh={fetchData}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalSendOpen}
            onCloseModal={closeModalConfirm}
          >
            <ConfirmModal
              title="Відправити бюджет"
              message={`Ви впевнені, що хочете відправити бюджет на затвердження ${selectedRequest?.purpose}?`}
              onConfirm={handleSend}
              onClose={closeModalConfirm}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default MyBudgetingPage;
