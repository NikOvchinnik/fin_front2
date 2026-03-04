import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './MyRequestsPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getMyRequests, sendRequest } from '../../helpers/axios/requests';
import { changeFinStatusBulk } from '../../helpers/axios/statuses';
import { useMediaQuery, Checkbox } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import {
  getActiveStatus,
  getShortStatus,
  getStatusStyle,
  statusSelectorUser,
} from '../../helpers/status';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import { selectUserId, selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { useNavigate, useParams } from 'react-router-dom';
import NewRequestForm from '../../components/Forms/NewRequestForm/NewRequestForm';
import EditRequestForm from '../../components/Forms/EditRequestForm/EditRequestForm';
import WatchRequestForm from '../../components/Forms/WatchRequestForm/WatchRequestForm';
import { exportToCSV } from '../../helpers/exportToCSV';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import SendFilesForm from '../../components/Forms/SendFilesForm/SendFilesForm';
import { getProjects } from '../../helpers/axios/projects';
import { getCurrencies, getExpenseCategories, getPaymentForms } from '../../helpers/axios/payments';
import { getContractors } from '../../helpers/axios/contractors';
import Form from '../../components/Form/Form';
import { formatMoney, getRequestAmountUah } from '../../helpers/amounts';

const MyRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [currenciesOptions, setCurrenciesOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);
  const [expenseCategoriesOptions, setExpenseCategoriesOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState('Всі');
  const [selectedCurrency, setSelectedCurrency] = useState('Всі');
  const [selectedContractor, setSelectedContractor] = useState('Всі');
  const [selectedPaymentForm, setSelectedPaymentForm] = useState('Всі');
  const [selectedExpenseCategorie, setSelectedExpenseCategorie] =
    useState('Всі');
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    applicant: '',
    payer: '',
    purpose: '',
    paymentForm: '',
    contractor: '',
    request_id: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc',
  });
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalSendBulkOpen, setModalSendBulkIsOpen] = useState(false);
  const [isModalSendFilesOpen, setModalSendFilesIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState('Всі');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleMyRequestsColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pageRowIds, setPageRowIds] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const { userId } = useParams();
  const userRole = useSelector(selectUserRole);
  const userSelectorId = useSelector(selectUserId);
  const navigate = useNavigate();
  const requestById = useMemo(
    () =>
      new Map(
        (dataRequests || []).map(request => [String(request.id), request])
      ),
    [dataRequests]
  );

  const canSendRequestStatus = statusId => statusId === 1 || statusId === 3;
  const canSendFilesForStatus = statusId => statusId === 22 || statusId === 6;

  const hasBulkSendRestrictedSelection = useMemo(() => {
    if (!selectedIds.size) return false;

    for (const id of selectedIds) {
      const request = requestById.get(String(id));
      const statusId = request?.status_id ?? request?.status?.id;
      if (!canSendRequestStatus(statusId)) return true;
    }

    return false;
  }, [selectedIds, requestById]);

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    resetSelection();
  }, [pageIndex, resetSelection]);

  useEffect(() => {
    resetSelection();
  }, [
    selectedProject,
    selectedCurrency,
    selectedContractor,
    selectedPaymentForm,
    selectedExpenseCategorie,
    filters,
    activeStatus,
    sortConfig,
    startDate,
    endDate,
    dataRequests,
    resetSelection,
  ]);

  const toggleRow = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const key = String(id);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const isAllSelectedOnPage = useMemo(() => {
    return (
      pageRowIds.length > 0 &&
      pageRowIds.every(id => selectedIds.has(String(id)))
    );
  }, [pageRowIds, selectedIds]);

  const isSomeSelectedOnPage = useMemo(() => {
    return (
      pageRowIds.some(id => selectedIds.has(String(id))) && !isAllSelectedOnPage
    );
  }, [pageRowIds, selectedIds, isAllSelectedOnPage]);

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected =
        pageRowIds.length > 0 &&
        pageRowIds.every(id => next.has(String(id)));

      pageRowIds.forEach(id => {
        const key = String(id);
        if (allSelected) next.delete(key);
        else next.add(key);
      });

      return next;
    });
  }, [pageRowIds]);

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      const requests = await getMyRequests({
        userId,
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

      const contractors = await getContractors();
      const contractorSelector = [
        { value: 'Всі', label: 'Всі' },
        ...(contractors || []).map(e => ({
          value: e.id,
          label: e.name,
        })),
      ];
      setContractorsOptions(contractorSelector);

      const paymentForms = await getPaymentForms();
      const paymentFormSelector = [
        { value: 'Всі', label: 'Всі' },
        ...(paymentForms || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setPaymentFormOptions(paymentFormSelector);

      const expenseCategories = await getExpenseCategories();
      const expenseCategoriesSelector = [
        { value: 'Всі', label: 'Всі' },
        ...(expenseCategories || [])
          .filter(c => c.is_active)
          .map(c => ({
            value: c.id,
            label: c.name,
          })),
      ];
      setExpenseCategoriesOptions(expenseCategoriesSelector);
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
      localStorage.setItem('visibleMyRequestsColumns', JSON.stringify(updated));
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
        row => row.currency?.id === selectedCurrency
      );
    }

    if (selectedExpenseCategorie && selectedExpenseCategorie !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.expense_category_id === selectedExpenseCategorie
      );
    }

    if (filters.request_id) {
      filteredRows = filteredRows.filter(row =>
        String(row.id).includes(filters.request_id)
      );
    }

    if (activeStatus && activeStatus !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => getActiveStatus(row.status) === activeStatus
      );
    }

    if (selectedContractor && selectedContractor !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.contractor_id === selectedContractor
      );
    }

    if (selectedPaymentForm && selectedPaymentForm !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.payment_form_id === selectedPaymentForm
      );
    }

    if (filters.purpose) {
      filteredRows = filteredRows.filter(row =>
        row.purpose?.toLowerCase().includes(filters.purpose)
      );
    }

    if (filters.payment_details) {
      filteredRows = filteredRows.filter(row =>
        row.payment_details?.toLowerCase().includes(filters.payment_details)
      );
    }

    if (filters.payment_date_await) {
      filteredRows = filteredRows.filter(row =>
        row.payment_date_await
          ?.toLowerCase()
          .includes(filters.payment_date_await)
      );
    }

    let sortedRows = [...filteredRows];

    if (sortConfig.key) {
      const getFieldValue = (req, key) => {
        switch (key) {
          case 'request_id':
            return req.id || '';
          case 'created_at':
            return req.created_at || '';
          case 'payment_date_await':
            return req.payment_date_await || '';
          case 'project':
            return req.project || '';
          case 'contractor':
            return req.contractor || '';
          case 'purpose':
            return req.purpose || '';
          case 'payment_period':
            return req.payment_period || '';
          case 'currency':
            return req.currency?.name || '';
          case 'amount':
            return req.amount ?? 0;
          case 'amount_uah':
            return getRequestAmountUah(req) ?? 0;
          case 'expense_category':
            return req.expense_category || '';
          case 'payment_details':
            return req.payment_details || '';
          case 'payment_form':
            return req.payment_form || '';
          case 'planned_balance_optimistic':
            return req.planned_balance_optimistic ?? 0;
          case 'planned_balance_pessimistic':
            return req.planned_balance_pessimistic ?? 0;
          case 'status':
            return req.status || '';
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

    return sortedRows.map(request => {
      const statusId = request.status_id ?? request.status?.id;

      return {
      request_id: request.id,
      request_id_plain: request.id,
      created_at: (
        <p className={style.fullWidthText}>
          {dayjs(request.created_at).format('YYYY-MM-DD') || ''}
        </p>
      ),
      created_at_plain: request.created_at
        ? dayjs(request.created_at).format('YYYY-MM-DD')
        : '',
      payment_date_await: (
        <p className={style.fullWidthText}>
          {request.payment_date_await || ''}
        </p>
      ),
      payment_date_await_plain: request.payment_date_await || '',
      project: request.project || '',
      project_plain: request.project || '',
      contractor: request.contractor || '',
      contractor_plain: request.contractor || '',
      purpose: (
        <p className={style.breakText}>
          <ExpandableText text={request.purpose || ''} limit={20} />
        </p>
      ),
      purpose_plain: request.purpose || '',
      payment_period: request.payment_period || '',
      payment_period_plain: request.payment_period || '',
      amount:
        request.amount != null
          ? request.amount.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_plain: request.amount ?? 0,
      amount_uah: formatMoney(getRequestAmountUah(request)),
      amount_uah_plain: getRequestAmountUah(request) ?? 0,
      currency: request.currency?.name || '',
      currency_plain: request.currency?.name || '',
      expense_category: request.expense_category || '',
      expense_category_plain: request.expense_category || '',
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
      payment_form: request.payment_form || '',
      payment_form_plain: request.payment_form || '',
      planned_balance_optimistic:
        request.planned_balance_optimistic != null
          ? request.planned_balance_optimistic.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '0',
      planned_balance_optimistic_plain: request.planned_balance_optimistic ?? 0,

      planned_balance_pessimistic:
        request.planned_balance_pessimistic != null
          ? request.planned_balance_pessimistic.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '0',
      planned_balance_pessimistic_plain:
        request.planned_balance_pessimistic ?? 0,
      files: (
        <div className={style.linkContainer}>
          {request.files?.map((file, index) => (
            <a
              key={file.id || index}
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Link {index + 1}
            </a>
          ))}
        </div>
      ),
      files_plain: request.files?.map(file => file.file_url) || '',
      status: (
        <span
          style={{
            borderLeft: `4px solid ${getStatusStyle(request.status).color}`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: getStatusStyle(request.status).color,
          }}
        >
          {getShortStatus(request.status)}
        </span>
      ),
      status_plain: request.status || '',
      action: (
        <div className={style.actionContainer}>
          <button
            className={style.editBtn}
            onClick={() => {
              if (canSendRequestStatus(statusId)) {
                setSelectedRequest(request);
                openModalEdit();
              } else {
                Notify.warning(
                  `Ви не можете редагувати статус ${request.status}!`
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
          {canSendRequestStatus(statusId) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendRequestStatus(statusId)) {
                  setSelectedRequest(request);
                  setModalSendIsOpen(true);
                }
              }}
            >
              <Icon id="paper-plane" className={style.editIcon} />
            </button>
          )}
          {canSendFilesForStatus(statusId) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendFilesForStatus(statusId)) {
                  setSelectedRequest(request);
                  setModalSendFilesIsOpen(true);
                }
              }}
            >
              <Icon id="send-files" className={style.editIcon} />
            </button>
          )}
        </div>
      ),
      };
    });
  }, [
    dataRequests,
    activeStatus,
    sortConfig,
    selectedProject,
    selectedCurrency,
    selectedContractor,
    selectedPaymentForm,
    filters,
    selectedExpenseCategorie,
  ]);

  const totals = useMemo(() => {
    if (!requestsRows.length) return null;

    const totalsByCurrency = requestsRows.reduce((acc, row) => {
      const currency = row.currency_plain || 'N/A';
      const amount = row.amount_plain || 0;

      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += amount;

      return acc;
    }, {});

    const totalUAH = requestsRows.reduce(
      (acc, row) => acc + (row.amount_uah_plain || 0),
      0
    );

    return { totalsByCurrency, totalUAH };
  }, [requestsRows]);

  const columns = [
    {
      accessorKey: 'select',
      header: (
        <Checkbox
          checked={isAllSelectedOnPage}
          indeterminate={isSomeSelectedOnPage}
          onChange={toggleAllOnPage}
          onClick={e => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(String(row.original.request_id_plain))}
          onChange={() => toggleRow(row.original.request_id_plain)}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: 'request_id',
      header: (
        <div className={style.sortContainer}>
          <p>ID</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('request_id')}
          >
            <Icon id="sort" className={style.sortIcon} />
          </button>
        </div>
      ),
    },
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
          <p>Сума UAH</p>
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
      accessorKey: 'planned_balance_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс оптимістичний (залишок)</p>
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
          <p>Баланс песимістичний (залишок)</p>
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
      accessorKey: 'files',
      header: 'Файли',
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

  const openModalSendBulk = () => {
    if (hasBulkSendRestrictedSelection) {
      Notify.warning('Ви обрали заявки які не можете відправити');
      return;
    }
    setModalSendBulkIsOpen(true);
  };

  const closeModalSendBulk = () => {
    setModalSendBulkIsOpen(false);
  };

  const closeModalSendFiles = () => {
    setModalSendFilesIsOpen(false);
  };

  const openModalColumns = () => {
    setModalColumnsIsOpen(true);
  };

  const closeModalColumns = () => {
    setModalColumnsIsOpen(false);
  };

  const handleSend = async () => {
    try {
      await sendRequest(selectedRequest.id);
      fetchData();
      closeModalConfirm();
      Notify.success('Заявку відправлено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const handleSendBulk = async () => {
    if (hasBulkSendRestrictedSelection) {
      Notify.warning('Ви обрали заявки які не можете відправити');
      return;
    }

    const ids = Array.from(selectedIds);
    const payload = {
      ids: ids.map(id => Number(id)),
      status_id: 2,
    };

    try {
      await changeFinStatusBulk(payload);
      await fetchData();
      closeModalSendBulk();
      resetSelection();
      Notify.success('Заявки відправлено!');
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
          <DocTitle>MyRequests</DocTitle>
          <div className={style.filterContainer}>
            <div className={style.dateContainer}>
              <DateNavigator
                startDate={startDate}
                endDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                onLoading={setLoadingTable}
              />
              <div className={style.btnsContainer}>
                <button className={style.newBtn} onClick={openModal}>
                  Створити заявку <span>+</span>
                </button>
                <button
                  className={style.csvBtn}
                  onClick={() =>
                    exportToCSV({
                      rows: requestsRows,
                      columns: filteredColumns,
                      filePrefix: 'my_requests',
                    })
                  }
                >
                  Експорт у CSV
                </button>
              </div>
            </div>
            <div>
              <button
                className={style.filterBtn}
                type="button"
                onClick={() => setShowAllFilters(prev => !prev)}
              >
                <Icon id="filter_list" className={style.filterIcon} />
                {showAllFilters ? 'Сховати фільтри' : 'Всі фільтри'}
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
                    type: 'autocomplete-select',
                    name: 'expense_category',
                    label: 'Стаття витрат',
                    options: expenseCategoriesOptions,
                    onChange: option =>
                      setSelectedExpenseCategorie(option?.value || ''),
                  },
                ]}
                defaultValues={{
                  expense_category: selectedExpenseCategorie,
                }}
              />
              <Form
                fields={[
                  {
                    type: 'autocomplete-select',
                    name: 'contractor',
                    label: 'Контрагент',
                    options: contractorsOptions,
                    onChange: option =>
                      setSelectedContractor(option?.value || ''),
                  },
                ]}
                defaultValues={{
                  contractor: selectedContractor,
                }}
              />
              <Form
                fields={[
                  {
                    type: 'autocomplete-select',
                    name: 'payment_form',
                    label: 'Форма оплати',
                    options: paymentFormOptions,
                    onChange: option =>
                      setSelectedPaymentForm(option?.value || ''),
                  },
                ]}
                defaultValues={{
                  payment_form: selectedPaymentForm,
                }}
              />
            </div>
            {showAllFilters && (
              <>
                <div className={style.formsContainer}>
                  <form className={style.searchContainer}>
                    <label className={style.labelContainer}>
                      <input
                        type="text"
                        name="request_id"
                        className={style.inputContainer}
                        placeholder="ID заявки"
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                  <form className={style.searchContainer}>
                    <label className={style.labelContainer}>
                      <input
                        type="text"
                        name="payment_date_await"
                        className={style.inputContainer}
                        placeholder="Кінцева дата оплати"
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                  <form className={style.searchContainer}>
                    <label className={style.labelContainer}>
                      <input
                        type="text"
                        name="purpose"
                        className={style.inputContainer}
                        placeholder="Призначення"
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                </div>
                <div className={style.formsContainer}>
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
                        name="payment_details"
                        className={style.inputContainer}
                        placeholder="Реквізити"
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                </div>
              </>
            )}
            <div className={style.statusRow}>
              <ul className={style.statuscontainer}>
                {statusSelectorUser.map(status => (
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
              {selectedIds.size > 0 && (
                <div className={style.bulkActionsInline}>
                  <button
                    className={style.bulkEditButton}
                    onClick={openModalSendBulk}
                  >
                    Відправити всі
                  </button>
                </div>
              )}
            </div>
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
                rowsPerPage={15}
                enableHorizontalScroll={isMobile ? false : true}
                onPageChange={idx => setPageIndex(idx)}
                onPageRowIdsChange={ids => setPageRowIds(ids)}
              />
              {totals && (
                <div className={style.totalsContainer}>
                  <div className={style.totalContainer}>
                    <p className={style.totalTitle}>Всього валюти:</p>
                    <ul className={style.totalList}>
                      {Object.entries(totals.totalsByCurrency).map(
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
                    <p className={style.totalTitle}>Всього сума в UAH:</p>
                    <p className={style.totalText}>
                      {totals.totalUAH.toLocaleString('uk-UA', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          <ModalWindow
            isModalOpen={isModalEditOpen}
            onCloseModal={closeModalEdit}
          >
            <EditRequestForm
              request={selectedRequest}
              closeModal={closeModalEdit}
              onRefresh={fetchData}
              formType="request"
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalWatchOpen}
            onCloseModal={closeModalWatch}
          >
            <WatchRequestForm
              request={selectedRequest}
              closeModal={closeModalWatch}
              onRefresh={fetchData}
              formType="request"
            />
          </ModalWindow>
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <NewRequestForm
              closeModal={closeModal}
              onRefresh={fetchData}
              formType="request"
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalSendOpen}
            onCloseModal={closeModalConfirm}
          >
            <ConfirmModal
              title="Відправити заявку"
              message={`Ви впевнені, що хочете відправити заявку на оплату ${selectedRequest?.contractor}?`}
              onConfirm={handleSend}
              onClose={closeModalConfirm}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalSendBulkOpen}
            onCloseModal={closeModalSendBulk}
          >
            <ConfirmModal
              title="Відправити заявки"
              message={`Ви впевнені, що хочете відправити заявки на оплату (${selectedIds.size})?`}
              onConfirm={handleSendBulk}
              onClose={closeModalSendBulk}
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
            isModalOpen={isModalSendFilesOpen}
            onCloseModal={closeModalSendFiles}
          >
            <SendFilesForm
              request={selectedRequest}
              closeModal={closeModalSendFiles}
              onRefresh={fetchData}
              formType="myRequest"
              userRole={userRole}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default MyRequestsPage;
