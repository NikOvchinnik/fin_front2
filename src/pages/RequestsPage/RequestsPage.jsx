import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './RequestsPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getFinRequests } from '../../helpers/axios/requests';
import { getCurrencies } from '../../helpers/axios/payments';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import { getStatusStyle, statusSelector } from '../../helpers/status';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import Form from '../../components/Form/Form';
import { getProjects } from '../../helpers/axios/projects';
import { selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import ApproveRequestForm from '../../components/Forms/ApproveRequestForm/ApproveRequestForm';

const RequestsPage = () => {
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
      const requests = await getFinRequests({
        startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
        endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
      });
      setDataRequests(requests);

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
        row => row.project?.id === selectedProject
      );
    }

    if (selectedCurrency && selectedCurrency !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.currency?.id === selectedCurrency
      );
    }

    if (filters.applicant) {
      filteredRows = filteredRows.filter(row =>
        `${row.applicant_id?.last_name} ${row.applicant_id?.first_name}`
          .toLowerCase()
          .includes(filters.applicant)
      );
    }

    if (filters.expense_category) {
      filteredRows = filteredRows.filter(row =>
        row.expense_category?.name
          .toLowerCase()
          .includes(filters.expense_category)
      );
    }

    if (filters.payer) {
      filteredRows = filteredRows.filter(row =>
        row.payment_form?.payer?.toLowerCase().includes(filters.payer)
      );
    }

    if (activeStatus && activeStatus !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.status?.name === activeStatus
      );
    }

    let sortedRows = [...filteredRows];

    if (sortConfig.key) {
      const getFieldValue = (req, key) => {
        switch (key) {
          case 'created_at':
            return req.created_at || '';
          case 'payment_date_await':
            return req.payment_date_await || '';
          case 'project':
            return req.project?.name || '';
          case 'contractor':
            return req.contractor_id || '';
          case 'purpose':
            return req.purpose || '';
          case 'payment_period':
            return req.payment_period || '';
          case 'amount':
            return req.amount || '';
          case 'currency':
            return req.currency?.name || '';
          case 'amount_uah':
            return req.amount && req.currency?.rate
              ? req.amount * req.currency.rate
              : '';
          case 'expense_category':
            return req.expense_category?.name || '';
          case 'payment_details':
            return req.payment_details || '';
          case 'payment_form':
            return req.payment_form?.name || '';
          case 'applicant':
            return `${req.applicant_id?.last_name || ''} ${
              req.applicant_id?.first_name || ''
            }`.trim();
          case 'payer':
            return req.payment_form?.payer || '';
          case 'beneficiary':
            return req.project?.name || '';
          case 'planned_balance_optimistic':
            return req.planned_balance_optimistic ?? '';
          case 'planned_balance_pessimistic':
            return req.planned_balance_pessimistic ?? '';
          case 'tech':
            return req.payment_date_await
              ? req.payment_date_await.slice(0, 7)
              : '';
          case 'status':
            return req.status?.name || '';
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
      payment_date_await: (
        <p className={style.fullWidthText}>
          {request.payment_date_await || ''}
        </p>
      ),
      payment_date_await_plain: request.payment_date_await || '',
      project: request.project?.name || '',
      project_plain: request.project?.name || '',
      contractor: request.contractor_id || '',
      contractor_plain: request.contractor_id || '',
      purpose: (
        <p>
          <ExpandableText text={request.purpose || ''} limit={50} />
        </p>
      ),
      purpose_plain: request.purpose || '',
      payment_period: request.payment_period || '',
      payment_period_plain: request.payment_period || '',
      amount: request.amount ? request.amount.toLocaleString('uk-UA') : '',
      amount_plain: request.amount ?? '',
      currency: request.currency?.name || '',
      currency_plain: request.currency?.name || '',
      amount_uah:
        request.amount && request.currency?.rate
          ? (request.amount * request.currency.rate).toLocaleString('uk-UA')
          : '',
      amount_uah_plain:
        request.amount && request.currency?.rate
          ? request.amount * request.currency.rate
          : '',
      expense_category: request.expense_category?.name || '',
      expense_category_plain: request.expense_category?.name || '',
      payment_details: (
        <p className={style.breakText}>
          <span
            className={style.copyText}
            onClick={() => {
              navigator.clipboard.writeText(request.payment_details || '');
              Notify.success('Текст скопійовано!');
            }}
          >
            <Icon id="copy" className={style.sortIcon} />
          </span>
          <ExpandableText text={request.payment_details || ''} limit={20} />
        </p>
      ),
      payment_details_plain: request.payment_details || '',
      payment_form: request.payment_form?.name || '',
      payment_form_plain: request.payment_form?.name || '',
      applicant:
        `${request.applicant_id?.last_name} ${request.applicant_id?.first_name}` ||
        '',
      applicant_plain:
        `${request.applicant_id?.last_name} ${request.applicant_id?.first_name}` ||
        '',
      payer: request.payment_form?.payer || '',
      payer_plain: request.payment_form?.payer || '',
      beneficiary: request.project?.name || '',
      beneficiary_plain: request.project?.name || '',
      planned_balance_optimistic: request.planned_balance_optimistic ?? '',
      planned_balance_optimistic_plain:
        request.planned_balance_optimistic ?? '',
      planned_balance_pessimistic: request.planned_balance_pessimistic ?? '',
      planned_balance_pessimistic_plain:
        request.planned_balance_pessimistic ?? '',
      tech: request.payment_date_await
        ? request.payment_date_await.slice(0, 7)
        : '',
      tech_plain: request.payment_date_await
        ? request.payment_date_await.slice(0, 7)
        : '',
      status: (
        <span
          style={{
            borderLeft: `4px solid ${
              getStatusStyle(request.status?.name).color
            }`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: getStatusStyle(request.status?.name).color,
          }}
        >
          {request.status?.name || ''}
        </span>
      ),
      status_plain: request.status?.name || '',
      action: (
        <button
          className={style.editBtn}
          onClick={() => {
            if (request.status?.name === 'Очікує затвердження') {
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
      accessorKey: 'payment_date_await',
      header: (
        <div className={style.sortContainer}>
          <p>Кінцева дата оплати</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('payment_date_await')}
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
      accessorKey: 'contractor',
      header: (
        <div className={style.sortContainer}>
          <p>Контрагент</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('contractor')}
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
      accessorKey: 'payment_period',
      header: (
        <div className={style.sortContainer}>
          <p>Період оплати</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('payment_period')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: (
        <div className={style.sortContainer}>
          <p>Сума</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount')}
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
      accessorKey: 'amount_uah',
      header: (
        <div className={style.sortContainer}>
          <p>Сума в UAH</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('amount_uah')}
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
      accessorKey: 'payment_details',
      header: (
        <div className={style.sortContainer}>
          <p>Реквізити</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('payment_details')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'payment_form',
      header: (
        <div className={style.sortContainer}>
          <p>Форма оплати</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('payment_form')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'payer',
      header: (
        <div className={style.sortContainer}>
          <p>Платник</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('payer')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'beneficiary',
      header: (
        <div className={style.sortContainer}>
          <p>Вигодонабувач</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('beneficiary')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс оптимістичний</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('planned_balance_optimistic')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс песимістичний</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('planned_balance_pessimistic')}
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
    ...(userRole === 4 || userRole === 5
      ? [
          {
            accessorKey: 'action',
            header: 'Дія',
          },
        ]
      : []),
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
          <DocTitle>Requests</DocTitle>
          <div className={style.filterContainer}>
            <div className={style.dateContainer}>
              <DateNavigator
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
                    name="payer"
                    className={style.inputContainer}
                    placeholder="Платник"
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
            <ul className={style.statuscontainer}>
              {statusSelector.map(status => (
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
              visibleColumns={20}
              visibleColumnsMobile={2}
              rowsPerPage={25}
              enableHorizontalScroll={isMobile ? false : true}
            />
          )}
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <ApproveRequestForm
              request={selectedRequest}
              closeModal={closeModal}
              onRefresh={fetchData}
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
        </section>
      )}
    </>
  );
};

export default RequestsPage;
