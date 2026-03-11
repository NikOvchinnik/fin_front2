import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './MyBudgetingPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { useMediaQuery, Checkbox } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import { selectUserId, selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import {
  getMyBudgeting,
  returnBudgetingToRevision,
  sendBudgeting,
} from '../../helpers/axios/budgeting';
import { changeBudgetingStatusBulk } from '../../helpers/axios/statuses';
import {
  getBudgetingStatusStyle,
  getActiveBudgetingStatus,
  getShortBudgetingStatus,
  statusSelectorBudgetingUser,
} from '../../helpers/budgetingStatuses';
import MonthNavigator from '../../components/MonthNavigator/MonthNavigator';
import { useNavigate, useParams } from 'react-router-dom';
import BudgetNewForm from '../../components/Forms/BudgetNewForm/BudgetNewForm';
import BudgetEditForm from '../../components/Forms/BudgetEditForm/BudgetEditForm';
import BudgetWatchForm from '../../components/Forms/BudgetWatchForm/BudgetWatchForm';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { exportToCSV } from '../../helpers/exportToCSV';
import { getProjects } from '../../helpers/axios/projects';
import {
  getCurrencies,
  getExpenseCategories,
} from '../../helpers/axios/payments';
import Form from '../../components/Form/Form';
import { formatMoney, getBudgetingAmountUah } from '../../helpers/amounts';
import GoogleSheetImportForm from '../../components/Forms/GoogleSheetImportForm/GoogleSheetImportForm';
import { BudgetingStatus, UserRole } from '../../helpers/enums';

const MyBudgetingPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [currenciesOptions, setCurrenciesOptions] = useState([]);
  const [expenseCategoriesOptions, setExpenseCategoriesOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState('Всі');
  const [selectedCurrency, setSelectedCurrency] = useState('Всі');
  const [selectedExpenseCategorie, setSelectedExpenseCategorie] =
    useState('Всі');
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    applicant: '',
    payer: '',
    purpose: '',
    week: '',
    request_id: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc',
  });
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalSendBulkOpen, setModalSendBulkIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalImportOpen, setModalImportIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState('Всі');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleMyBudgetColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pageRowIds, setPageRowIds] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const userRole = useSelector(selectUserRole);
  const userSelectorId = useSelector(selectUserId);
  const navigate = useNavigate();
  const { userId } = useParams();
  const requestById = useMemo(
    () =>
      new Map(
        (dataRequests || []).map(request => [String(request.id), request])
      ),
    [dataRequests]
  );

  const canSendBudgetingStatus = statusId => {
    const normalizedStatusId = Number(statusId);
    return (
      normalizedStatusId === BudgetingStatus.DRAFT ||
      normalizedStatusId === BudgetingStatus.NEEDS_REVISION
    );
  };

  const canReturnBudgetingToRevision = statusId => {
    const normalizedStatusId = Number(statusId);
    return (
      Number.isFinite(normalizedStatusId) &&
      normalizedStatusId !== BudgetingStatus.DRAFT
    );
  };

  const getSendBudgetingStatusId = () => {
    return Number(userRole) === UserRole.APPLICANT
      ? BudgetingStatus.PENDING_LEAD_APPROVAL
      : BudgetingStatus.PENDING_FINANCE_APPROVAL;
  };

  const getApiErrorMessage = error => {
    const data = error?.response?.data;
    if (typeof data === 'string') return data;
    return data?.message || data?.error || '';
  };

  const hasBulkSendRestrictedSelection = useMemo(() => {
    if (!selectedIds.size) return false;

    for (const id of selectedIds) {
      const request = requestById.get(String(id));
      if (!canSendBudgetingStatus(request?.status?.id)) return true;
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
      const requests = await getMyBudgeting({
        userId,
        startDate: startDate ? startDate.format('MM.YYYY') : null,
        endDate: endDate ? endDate.format('MM.YYYY') : null,
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
    if (
      Number(userRole) !== UserRole.CEO &&
      String(userSelectorId) !== String(userId)
    ) {
      navigate('/');
    } else {
      fetchData();
    }
  }, [fetchData, navigate, userId, userRole, userSelectorId]);

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
      localStorage.setItem('visibleMyBudgetColumns', JSON.stringify(updated));
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

    if (selectedExpenseCategorie && selectedExpenseCategorie !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => row.expense_category?.id === selectedExpenseCategorie
      );
    }

    if (filters.request_id) {
      filteredRows = filteredRows.filter(row =>
        String(row.id).includes(filters.request_id)
      );
    }

    if (filters.purpose) {
      filteredRows = filteredRows.filter(row =>
        row.purpose?.toLowerCase().includes(filters.purpose)
      );
    }

    if (filters.week) {
      filteredRows = filteredRows.filter(row =>
        row.week
          .split('_')
          .map(d => dayjs(d).format('DD.MM.YYYY'))
          .join(' - ')
          .includes(filters.week)
      );
    }

    if (activeStatus && activeStatus !== 'Всі') {
      filteredRows = filteredRows.filter(row => {
        if (activeStatus === BudgetingStatus.NEEDS_REVISION) {
          return Number(row.status?.id) === BudgetingStatus.NEEDS_REVISION;
        }
        return getActiveBudgetingStatus(row.status?.name) === activeStatus;
      });
    }

    let sortedRows = [...filteredRows];

    if (sortConfig.key) {
      const getFieldValue = (req, key) => {
        switch (key) {
          case 'request_id':
            return req.id || '';
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
            return getBudgetingAmountUah(req, 'optimistic') ?? 0;
          case 'amount_uah_pessimistic':
            return getBudgetingAmountUah(req, 'pessimistic') ?? 0;
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
      request_id: request.id,
      request_id_plain: request.id,
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
        <p className={style.breakText}>
          <ExpandableText text={request.purpose || ''} limit={20} />
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
      amount_uah_optimistic: formatMoney(
        getBudgetingAmountUah(request, 'optimistic')
      ),
      amount_uah_optimistic_plain:
        getBudgetingAmountUah(request, 'optimistic') ?? 0,
      amount_uah_pessimistic: formatMoney(
        getBudgetingAmountUah(request, 'pessimistic')
      ),
      amount_uah_pessimistic_plain:
        getBudgetingAmountUah(request, 'pessimistic') ?? 0,
      expense_category: request.expense_category?.name || '',
      expense_category_plain: request.expense_category?.name || '',
      tech: request.plan_period ? request.plan_period : '',
      tech_plain: request.plan_period ? request.plan_period : '',
      status: (
        <span
          style={{
            borderLeft: `4px solid ${
              getBudgetingStatusStyle(request.status?.id).color
            }`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: getBudgetingStatusStyle(request.status?.id).color,
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
              if (canSendBudgetingStatus(request.status?.id)) {
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
          {canReturnBudgetingToRevision(request.status?.id) && (
            <button
              className={style.returnBtn}
              title="Повернути на доопрацювання"
              aria-label="Повернути на доопрацювання"
              onClick={() => handleReturnToRevision(request)}
            >
              <Icon id="arrow-left-switch" className={style.editIcon} />
            </button>
          )}
          {canSendBudgetingStatus(request.status?.id) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendBudgetingStatus(request.status?.id)) {
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
  }, [
    dataRequests,
    selectedProject,
    selectedCurrency,
    activeStatus,
    filters,
    sortConfig,
    selectedExpenseCategorie,
  ]);

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

  const openModalImport = () => {
    setModalImportIsOpen(true);
  };

  const closeModalImport = () => {
    setModalImportIsOpen(false);
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
      Notify.warning('Ви обрали бюджетування які не можете відправити');
      return;
    }
    setModalSendBulkIsOpen(true);
  };

  const closeModalSendBulk = () => {
    setModalSendBulkIsOpen(false);
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

  const handleReturnToRevision = async request => {
    const comment = request?.comment?.trim();
    const payload = comment ? { comment } : undefined;

    try {
      const response = await returnBudgetingToRevision(request.id, payload);
      await fetchData();
      Notify.success(
        response?.message || 'Бюджет повернуто в статус "Потребує виправлень"'
      );
    } catch (error) {
      if (error?.response?.status === 400) {
        Notify.failure(
          getApiErrorMessage(error) ||
            'Повернення доступне тільки для майбутніх місяців'
        );
        return;
      }
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const handleSendBulk = async () => {
    if (hasBulkSendRestrictedSelection) {
      Notify.warning('Ви обрали бюджетування які не можете відправити');
      return;
    }
    const ids = Array.from(selectedIds);
    const payload = {
      ids: ids.map(id => Number(id)),
      status_id: getSendBudgetingStatusId(),
    };
    try {
      await changeBudgetingStatusBulk(payload);
      await fetchData();
      closeModalSendBulk();
      resetSelection();
      Notify.success('Бюджети відправлено!');
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
                <button className={style.csvBtn} onClick={openModalImport}>
                  Імпорт з Google Sheets
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
                    name="purpose"
                    className={style.inputContainer}
                    placeholder="Призначення"
                    onChange={handleSearchChange}
                  />
                </label>
              </form>
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
            </div>
            {showAllFilters && (
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
                      name="week"
                      className={style.inputContainer}
                      placeholder="Тиждень"
                      onChange={handleSearchChange}
                    />
                  </label>
                </form>
              </div>
            )}
            <div className={style.statusRow}>
              <ul
                className={style.statuscontainer}
                style={{
                  maxWidth: '780px',
                }}
              >
                {statusSelectorBudgetingUser.map(status => (
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
              formType={'myBudget'}
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
          <ModalWindow
            isModalOpen={isModalSendBulkOpen}
            onCloseModal={closeModalSendBulk}
          >
            <ConfirmModal
              title="Відправити бюджети"
              message={`Ви впевнені, що хочете відправити бюджети на затвердження (${selectedIds.size})?`}
              onConfirm={handleSendBulk}
              onClose={closeModalSendBulk}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalImportOpen}
            onCloseModal={closeModalImport}
          >
            <GoogleSheetImportForm
              title={'Імпорт "Мій бюджет" з Google Sheets'}
              importType="budgetings"
              closeModal={closeModalImport}
              onImported={fetchData}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default MyBudgetingPage;
