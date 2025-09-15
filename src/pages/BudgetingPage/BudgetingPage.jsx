import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './BudgetingPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getCurrencies } from '../../helpers/axios/payments';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import Form from '../../components/Form/Form';
import { getProjects } from '../../helpers/axios/projects';
import { selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import {
  getBudgetingCEO,
  getBudgetingFinancial,
  getBudgetingHd,
} from '../../helpers/axios/budgeting';
import {
  geBudgetingStatusStyle,
  getActiveBudgetingStatus,
  getShortBudgetingStatus,
  statusSelectorBudgetingFin,
} from '../../helpers/budgetingStatuses';
import MonthNavigator from '../../components/MonthNavigator/MonthNavigator';
import ApproveBudgetingForm from '../../components/Forms/ApproveBudgetingForm/ApproveBudgetingForm';
import ApproveBudgetingWatchForm from '../../components/Forms/ApproveBudgetingWatchForm/ApproveBudgetingWatchForm';

const BudgetingPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [currenciesOptions, setCurrenciesOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState('Всі');
  const [selectedCurrency, setSelectedCurrency] = useState('Всі');
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
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState('Всі');
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const userRole = useSelector(selectUserRole);

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      let requests;
      if (userRole === 4) {
        requests = await getBudgetingFinancial({
          startDate: startDate ? startDate.format('MM.YYYY') : null,
          endDate: endDate ? endDate.format('MM.YYYY') : null,
        });
      } else if (userRole === 2) {
        requests = await getBudgetingHd({
          startDate: startDate ? startDate.format('MM.YYYY') : null,
          endDate: endDate ? endDate.format('MM.YYYY') : null,
        });
      } else if (userRole === 1) {
        requests = await getBudgetingCEO({
          startDate: startDate ? startDate.format('MM.YYYY') : null,
          endDate: endDate ? endDate.format('MM.YYYY') : null,
        });
      }

      setDataRequests(requests || []);

      const projects = await getProjects();
      const projectSelector = [
        { value: 'Всі', label: 'Всі' },
        ...(projects || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setProjectOptions(projectSelector);

      const currencies = await getCurrencies();
      const currencySelector = [
        { value: 'Всі', label: 'Всі' },
        ...(currencies || []).map(c => ({
          value: c.id,
          label: c.name,
        })),
      ];
      setCurrenciesOptions(currencySelector);
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoadingTable(false);
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
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

  const handleSearchChange = event => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value.toLowerCase().trim(),
    }));
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
      localStorage.setItem('visibleColumns', JSON.stringify(updated));
      return updated;
    });
  };

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    let filteredRows = dataRequests;

    if (selectedProject && selectedProject !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.project_id === selectedProject
      );
    }

    if (selectedCurrency && selectedCurrency !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.currency_id === selectedCurrency
      );
    }

    if (filters.applicant) {
      filteredRows = filteredRows.filter(row =>
        row.applicant.toLowerCase().includes(filters.applicant)
      );
    }

    if (filters.expense_category) {
      filteredRows = filteredRows.filter(row =>
        row.expense_category?.name
          .toLowerCase()
          .includes(filters.expense_category)
      );
    }

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
            return req.amount_optimistic ?? '';
          case 'amount_pessimistic':
            return req.amount_pessimistic ?? '';
          case 'currency':
            return req.currency ?? '';
          case 'amount_uah_optimistic':
            return req.amount_optimistic &&
              (req.currency_rate_at_approval || req.currency_rate)
              ? req.amount_optimistic *
                  (req.currency_rate_at_approval || req.currency_rate)
              : '';
          case 'amount_uah_pessimistic':
            return req.amount_pessimistic &&
              (req.currency_rate_at_approval || req.currency_rate)
              ? req.amount_pessimistic *
                  (req.currency_rate_at_approval || req.currency_rate)
              : '';
          case 'expense_category':
            return req.expense_category?.name ?? '';
          case 'applicant':
            return req.applicant ?? '';
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
      amount_optimistic: request.amount_optimistic
        ? request.amount_optimistic.toLocaleString('uk-UA')
        : '',
      amount_optimistic_plain: request.amount_optimistic ?? '',
      amount_pessimistic: request.amount_pessimistic
        ? request.amount_pessimistic.toLocaleString('uk-UA')
        : '',
      amount_pessimistic_plain: request.amount_pessimistic ?? '',
      currency: request.currency || '',
      currency_plain: request.currency || '',
      amount_uah_optimistic:
        request.amount_optimistic &&
        (request.currency_rate_at_approval || request.currency_rate)
          ? (
              request.amount_optimistic *
              (request.currency_rate_at_approval || request.currency_rate)
            ).toLocaleString('uk-UA')
          : '',
      amount_uah_optimistic_plain:
        request.amount_optimistic &&
        (request.currency_rate_at_approval || request.currency_rate)
          ? request.amount_optimistic *
            (request.currency_rate_at_approval || request.currency_rate)
          : '',
      amount_uah_pessimistic:
        request.amount_pessimistic &&
        (request.currency_rate_at_approval || request.currency_rate)
          ? (
              request.amount_pessimistic *
              (request.currency_rate_at_approval || request.currency_rate)
            ).toLocaleString('uk-UA')
          : '',
      amount_uah_pessimistic_plain:
        request.amount_pessimistic &&
        (request.currency_rate_at_approval || request.currency_rate)
          ? request.amount_pessimistic *
            (request.currency_rate_at_approval || request.currency_rate)
          : '',
      expense_category: request.expense_category?.name || '',
      expense_category_plain: request.expense_category?.name || '',
      applicant: request.applicant || '',
      applicant_plain: request.applicant || '',
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
          {(userRole === 4 || userRole === 1 || userRole === 2) && (
            <button
              className={style.editBtn}
              onClick={() => {
                if (request.status?.id === 5 && userRole === 4) {
                  setSelectedRequest(request);
                  openModal();
                } else if (request.status?.id === 8 && userRole === 1) {
                  setSelectedRequest(request);
                  openModal();
                } else if (request.status?.id === 2 && userRole === 2) {
                  setSelectedRequest(request);
                  openModal();
                } else {
                  Notify.warning(
                    `Ви не можете редагувати статус ${request.status?.name}!`
                  );
                }
              }}
            >
              <Icon id="edit" className={style.editIcon} />
            </button>
          )}
          <button
            className={style.editBtn}
            onClick={() => {
              setSelectedRequest(request);
              openModalWatch();
            }}
          >
            <Icon id="eye" className={style.editIcon} />
          </button>
        </div>
      ),
    }));
  }, [
    dataRequests,
    selectedProject,
    selectedCurrency,
    activeStatus,
    filters,
    sortConfig,
  ]);

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
      accessorKey: 'applicant',
      header: (
        <div className={style.sortContainer}>
          <p>Заявник</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('applicant')}
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

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const openModalColumns = () => {
    setModalColumnsIsOpen(true);
  };

  const closeModalColumns = () => {
    setModalColumnsIsOpen(false);
  };

  const openModalWatch = () => {
    setModalWatchIsOpen(true);
  };

  const closeModalWatch = () => {
    setModalWatchIsOpen(false);
  };

  const exportToCSV = () => {
    if (!requestsRows || requestsRows.length === 0) return;

    const columnsForExport = filteredColumns;

    const headers = columnsForExport.map(col => {
      if (typeof col.header === 'string') return col.header;
      if (col.header.props && col.header.props.children) {
        const p = col.header.props.children.find?.(c => c?.type === 'p');
        if (p && p.props && typeof p.props.children === 'string')
          return p.props.children;
        return col.accessorKey;
      }
      return col.accessorKey;
    });

    const rows = requestsRows.map(row =>
      columnsForExport.map(col => {
        const plainKey = `${col.accessorKey}_plain`;
        const value = row[plainKey] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [headers.map(h => `"${h}"`).join(',')]
      .concat(rows.map(r => r.join(',')))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `requests_${dayjs().format('YYYY-MM-DD')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <button className={style.csvBtn} onClick={exportToCSV}>
                Експорт у CSV
              </button>
            </div>
            <div className={style.formsContainer}>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'project',
                    label: 'Підрозділ',
                    options: projectOptions,
                    onChange: value => setSelectedProject(value),
                  },
                ]}
                defaultValues={{
                  project: selectedProject,
                }}
              />
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'currency',
                    label: 'Валюта',
                    options: currenciesOptions,
                    onChange: value => setSelectedCurrency(value),
                  },
                ]}
                defaultValues={{
                  currency: selectedCurrency,
                }}
              />
              <form className={style.searchContainer}>
                <label className={style.labelContainer}>
                  <input
                    type="text"
                    name="applicant"
                    className={style.inputContainer}
                    placeholder="Заявник"
                    onChange={handleSearchChange}
                  />
                </label>
              </form>
              <form className={style.searchContainer}>
                <label className={style.labelContainer}>
                  <input
                    type="text"
                    name="expense_category"
                    className={style.inputContainer}
                    placeholder="Стаття витрат"
                    onChange={handleSearchChange}
                  />
                </label>
              </form>
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
          )}
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <ApproveBudgetingForm
              request={selectedRequest}
              closeModal={closeModal}
              onRefresh={fetchData}
              userRole={userRole}
            />
          </ModalWindow>
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
          <ModalWindow
            isModalOpen={isModalWatchOpen}
            onCloseModal={closeModalWatch}
          >
            <ApproveBudgetingWatchForm
              request={selectedRequest}
              closeModal={closeModalWatch}
              onRefresh={fetchData}
              userRole={userRole}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default BudgetingPage;
