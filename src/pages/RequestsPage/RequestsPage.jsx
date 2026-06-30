import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './RequestsPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import {
  getBuhRequests,
  getCeoRequests,
  getFinRequests,
} from '../../helpers/axios/requests';
import {
  getCurrencies,
  getExpenseCategories,
  getPaymentForms,
} from '../../helpers/axios/payments';
import { useMediaQuery, Checkbox } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import {
  getActiveStatus,
  getStatusStyle,
  FinancialStatusFilter,
  statusSelectorBuh,
  statusSelectorFin,
  approveStatusFin,
  approveStatusBuh,
  FILTER_ALL,
  FILTER_DELETED,
} from '../../helpers/status';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import Form from '../../components/Form/Form';
import { getProjects } from '../../helpers/axios/projects';
import { selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import ApproveRequestForm from '../../components/Forms/ApproveRequestForm/ApproveRequestForm';
import ApproveWatchForm from '../../components/Forms/ApproveWatchForm/ApproveWatchForm';
import { exportToCSV } from '../../helpers/exportToCSV';
import SendFilesForm from '../../components/Forms/SendFilesForm/SendFilesForm';
import { getContractors } from '../../helpers/axios/contractors';
import BulkApproveForm from '../../components/Forms/BulkApproveForm/BulkApproveForm';
import { changeFinStatusBulk } from '../../helpers/axios/requests';
import { formatMoney, getRequestAmountUah } from '../../helpers/amounts';
import { FinancialRequestStatus, UserRole } from '../../helpers/enums';
import { isDeletedRecord } from '../../helpers/softDelete';
import { useTranslation } from 'react-i18next';
import {
  translateFinancialStatus,
  translateOptions,
} from '../../helpers/i18nOptions';
import { isExecutiveRole } from '../../helpers/roles';
import {
  filterDepartmentColumns,
  getSubdivisionName,
  normalizeDepartmentVisibleColumns,
} from '../../helpers/departmentField';

const RequestsPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [currenciesOptions, setCurrenciesOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);
  const [expenseCategoriesOptions, setExpenseCategoriesOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(FILTER_ALL);
  const [selectedCurrency, setSelectedCurrency] = useState(FILTER_ALL);
  const [selectedContractor, setSelectedContractor] = useState(FILTER_ALL);
  const [selectedPaymentForm, setSelectedPaymentForm] = useState(FILTER_ALL);
  const [selectedExpenseCategorie, setSelectedExpenseCategorie] =
    useState(FILTER_ALL);
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
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [isModalSendFilesOpen, setModalSendFilesIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalBulkOpen, setModalBulkIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState(FILTER_ALL);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const userRole = useSelector(selectUserRole);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleColumns');
    if (!saved) return 'All';

    const parsed = normalizeDepartmentVisibleColumns(
      JSON.parse(saved),
      userRole
    );
    if (Array.isArray(parsed) && !parsed.includes('subdivision')) {
      return normalizeDepartmentVisibleColumns(
        [...parsed, 'subdivision'],
        userRole
      );
    }

    return parsed;
  });
  const isExecutiveUser = isExecutiveRole(userRole);
  const isExecutiveApprovalMode =
    isExecutiveUser &&
    activeStatus === FinancialStatusFilter.PENDING_EXECUTIVE_APPROVAL;
  const canBulkEditRequests =
    !isExecutiveApprovalMode &&
    [UserRole.FINANCE, UserRole.ACCOUNTANT].includes(userRole);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pageRowIds, setPageRowIds] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const requestById = useMemo(
    () =>
      new Map(
        (dataRequests || []).map(request => [String(request.id), request])
      ),
    [dataRequests]
  );

  const canEditRequestStatus = useCallback(
    (statusId, role, request) => {
      if (isDeletedRecord(request)) return false;
      if (isExecutiveApprovalMode) {
        return statusId === FinancialRequestStatus.PENDING_EXECUTIVE_APPROVAL;
      }
      if (role === UserRole.FINANCE) {
        return statusId === FinancialRequestStatus.PENDING_APPROVAL;
      }
      if (role === UserRole.ACCOUNTANT) {
        return statusId === FinancialRequestStatus.SENT_TO_PAYMENT;
      }
      return false;
    },
    [isExecutiveApprovalMode]
  );

  const canSendFilesForStatus = (statusId, request) =>
    !isDeletedRecord(request) &&
    (statusId === FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS ||
      statusId === FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS);

  const hasBulkRestrictedSelection = useMemo(() => {
    if (!canBulkEditRequests) return false;
    if (!selectedIds.size) return false;

    for (const id of selectedIds) {
      const request = requestById.get(String(id));
      if (!canEditRequestStatus(request?.status?.id, userRole, request))
        return true;
    }

    return false;
  }, [
    canBulkEditRequests,
    selectedIds,
    requestById,
    userRole,
    canEditRequestStatus,
  ]);

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
      const request = requestById.get(String(id));
      if (isDeletedRecord(request)) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [requestById]);

  const selectablePageIds = useMemo(
    () =>
      pageRowIds.filter(id => {
        const request = requestById.get(String(id));
        return !isDeletedRecord(request);
      }),
    [pageRowIds, requestById]
  );

  const isAllSelectedOnPage = useMemo(() => {
    return (
      selectablePageIds.length > 0 &&
      selectablePageIds.every(id => selectedIds.has(id))
    );
  }, [selectablePageIds, selectedIds]);

  const isSomeSelectedOnPage = useMemo(() => {
    return (
      selectablePageIds.some(id => selectedIds.has(id)) && !isAllSelectedOnPage
    );
  }, [selectablePageIds, selectedIds, isAllSelectedOnPage]);

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected =
        selectablePageIds.length > 0 &&
        selectablePageIds.every(id => next.has(id));

      selectablePageIds.forEach(id => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });

      return next;
    });
  }, [selectablePageIds]);

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      let requests;
      if (isExecutiveApprovalMode) {
        requests = await getCeoRequests({
          startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
          deleted: activeStatus === FILTER_DELETED ? 'true' : 'false',
        });
      } else if (userRole === UserRole.ACCOUNTANT) {
        requests = await getBuhRequests({
          startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
          deleted: activeStatus === FILTER_DELETED ? 'true' : 'false',
        });
      } else {
        requests = await getFinRequests({
          startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
          deleted: activeStatus === FILTER_DELETED ? 'true' : 'false',
        });
      }

      setDataRequests(requests);

      const projects = await getProjects();
      const projectSelector = [
        { value: FILTER_ALL, label: t('filters.all') },
        ...(projects || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setProjectOptions(projectSelector);

      const currencies = await getCurrencies();
      const currencySelector = [
        { value: FILTER_ALL, label: t('filters.all') },
        ...(currencies || []).map(c => ({
          value: c.id,
          label: c.name,
        })),
      ];
      setCurrenciesOptions(currencySelector);

      const contractors = await getContractors();
      const contractorSelector = [
        { value: FILTER_ALL, label: t('filters.all') },
        ...(contractors || []).map(e => ({
          value: e.id,
          label: e.name,
        })),
      ];
      setContractorsOptions(contractorSelector);

      const paymentForms = await getPaymentForms();
      const paymentFormSelector = [
        { value: FILTER_ALL, label: t('filters.all') },
        ...(paymentForms || []).map(p => ({
          value: p.id,
          label: p.name,
        })),
      ];
      setPaymentFormOptions(paymentFormSelector);

      const expenseCategories = await getExpenseCategories();
      const expenseCategoriesSelector = [
        { value: FILTER_ALL, label: t('filters.all') },
        ...(expenseCategories || [])
          .filter(c => c.is_active)
          .map(c => ({
            value: c.id,
            label: c.name,
          })),
      ];
      setExpenseCategoriesOptions(expenseCategoriesSelector);
    } catch {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoadingTable(false);
      setLoading(false);
    }
  }, [
    userRole,
    isExecutiveApprovalMode,
    startDate,
    endDate,
    activeStatus,
    t,
  ]);

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
        updated = tableColumns
          .map(c => c.accessorKey)
          .filter(key => key !== accessorKey);
      } else {
        if (prev.includes(accessorKey)) {
          updated = prev.filter(key => key !== accessorKey);
        } else {
          updated = [...prev, accessorKey];
        }
        updated = normalizeDepartmentVisibleColumns(updated, userRole);
        if (updated.length === tableColumns.length) updated = 'All';
      }
      localStorage.setItem('visibleColumns', JSON.stringify(updated));
      return updated;
    });
  };

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    let filteredRows = dataRequests;

    if (selectedProject && selectedProject !== FILTER_ALL) {
      filteredRows = filteredRows.filter(
        row => row.project?.id === selectedProject
      );
    }

    if (selectedCurrency && selectedCurrency !== FILTER_ALL) {
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

    if (selectedExpenseCategorie && selectedExpenseCategorie !== FILTER_ALL) {
      filteredRows = filteredRows.filter(
        row => row.expense_category?.id === selectedExpenseCategorie
      );
    }

    if (filters.payer) {
      filteredRows = filteredRows.filter(row =>
        row.payment_form?.payer?.toLowerCase().includes(filters.payer)
      );
    }

    if (filters.request_id) {
      filteredRows = filteredRows.filter(row =>
        String(row.id).includes(filters.request_id)
      );
    }

    if (
      activeStatus &&
      activeStatus !== FILTER_ALL &&
      activeStatus !== FILTER_DELETED
    ) {
      filteredRows = filteredRows.filter(
        row => getActiveStatus(row.status?.id, row.status?.name) === activeStatus
      );
    }

    if (selectedContractor && selectedContractor !== FILTER_ALL) {
      filteredRows = filteredRows.filter(
        row => row.contractor_id === selectedContractor
      );
    }

    if (selectedPaymentForm && selectedPaymentForm !== FILTER_ALL) {
      filteredRows = filteredRows.filter(
        row => row.payment_form?.id === selectedPaymentForm
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
            return req.project?.name || '';
          case 'subdivision':
            return getSubdivisionName(req);
          case 'contractor':
            return req.contractor || '';
          case 'purpose':
            return req.purpose || '';
          case 'payment_period':
            return req.payment_period || '';
          case 'amount':
            return req.amount ?? 0;
          case 'currency':
            return req.currency?.name || '';
          case 'amount_uah':
            return getRequestAmountUah(req) ?? 0;
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
            return req.planned_balance_optimistic ?? 0;
          case 'planned_balance_pessimistic':
            return req.planned_balance_pessimistic ?? 0;
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

    if (activeStatus === FILTER_DELETED) {
      sortedRows.sort((a, b) => {
        const aTs = a.deleted_at ? dayjs(a.deleted_at).valueOf() : 0;
        const bTs = b.deleted_at ? dayjs(b.deleted_at).valueOf() : 0;
        return bTs - aTs;
      });
    }

    return sortedRows.map(request => ({
      is_deleted_plain: isDeletedRecord(request),
      request_id: request.id,
      request_id_plain: request.id,
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
      subdivision: getSubdivisionName(request),
      subdivision_plain: getSubdivisionName(request),
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
      amount: request.amount
        ? request.amount.toLocaleString('uk-UA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        : '',
      amount_plain: request.amount ? request.amount : 0,
      currency: request.currency?.name || '',
      currency_plain: request.currency?.name || '',
      amount_uah: formatMoney(getRequestAmountUah(request)),
      amount_uah_plain: getRequestAmountUah(request) ?? 0,
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
      applicant: request.applicant_id
        ? `${request.applicant_id.last_name} ${request.applicant_id.first_name}`
        : '',
      applicant_plain: request.applicant_id
        ? `${request.applicant_id.last_name} ${request.applicant_id.first_name}`
        : '',
      payer: request.payment_form?.payer || '',
      payer_plain: request.payment_form?.payer || '',
      beneficiary: request.project?.name || '',
      beneficiary_plain: request.project?.name || '',
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
      tech: request.payment_date_await
        ? request.payment_date_await.slice(0, 7)
        : '',
      tech_plain: request.payment_date_await
        ? request.payment_date_await.slice(0, 7)
        : '',
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
            borderLeft: `4px solid ${
              getStatusStyle(request.status).color
            }`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: getStatusStyle(request.status).color,
          }}
        >
          {translateFinancialStatus(request.status, t)}
        </span>
      ),
      status_plain: request.status?.name || '',
      action: (
        <div className={style.actionContainer}>
          {!isDeletedRecord(request) &&
            (userRole === UserRole.FINANCE ||
              userRole === UserRole.ACCOUNTANT ||
              isExecutiveApprovalMode) && (
            <button
              className={style.editBtn}
              onClick={() => {
                if (
                  canEditRequestStatus(
                    request.status?.id ?? request.status_id,
                    userRole,
                    request
                  )
                ) {
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
          {canSendFilesForStatus(request.status?.id, request) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendFilesForStatus(request.status?.id, request)) {
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
    }));
  }, [
    dataRequests,
    selectedProject,
    selectedCurrency,
    selectedContractor,
    selectedPaymentForm,
    activeStatus,
    filters,
    sortConfig,
    selectedExpenseCategorie,
    userRole,
    isExecutiveApprovalMode,
    canEditRequestStatus,
    t,
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

  const selectColumn = {
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
        checked={selectedIds.has(row.original.request_id_plain)}
        disabled={row.original.is_deleted_plain}
        onChange={() => toggleRow(row.original.request_id_plain)}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const columns = [
    ...(canBulkEditRequests ? [selectColumn] : []),
    {
      accessorKey: 'request_id',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.id')}</p>
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
          <p>{t('labels.requestDate')}</p>
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
          <p>{t('labels.paymentDeadline')}</p>
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
          <p>{t('labels.department')}</p>
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
      accessorKey: 'subdivision',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.subdivision')}</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('subdivision')}
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
          <p>{t('labels.paymentForm')}</p>
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
          <p>{t('labels.contractor')}</p>
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
          <p>{t('labels.paymentDetails')}</p>
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
          <p>{t('labels.purpose')}</p>
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
          <p>{t('labels.paymentPeriod')}</p>
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
          <p>{t('labels.amount')}</p>
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
          <p>{t('labels.currency')}</p>
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
          <p>{t('labels.amountUah')}</p>
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
          <p>{t('labels.expenseCategory')}</p>
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
          <p>{t('labels.applicant')}</p>
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
      accessorKey: 'payer',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.payer')}</p>
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
          <p>{t('labels.beneficiary')}</p>
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
          <p>{t('labels.optimisticBalance')}</p>
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
          <p>{t('labels.pessimisticBalance')}</p>
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
          <p>{t('labels.period')}</p>
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
      accessorKey: 'files',
      header: t('labels.files'),
    },
    {
      accessorKey: 'status',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.status')}</p>
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
      header: t('labels.action'),
    },
  ];

  const tableColumns = filterDepartmentColumns(columns, userRole);

  const filteredColumns = useMemo(() => {
    if (visibleColumns === 'All') return tableColumns;
    return tableColumns.filter(col => visibleColumns.includes(col.accessorKey));
  }, [tableColumns, visibleColumns]);

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

  const openModalBulk = () => {
    if (hasBulkRestrictedSelection) {
      Notify.warning('Ви обрали заявки які не можете змінити');
      return;
    }
    setModalBulkIsOpen(true);
  };

  const closeModalBulk = () => {
    setModalBulkIsOpen(false);
  };

  const handleBulkSubmit = async data => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      Notify.failure('Оберіть хоча б один рядок для зміни статусу');
      return;
    }
    if (hasBulkRestrictedSelection) {
      Notify.warning('Ви обрали заявки які не можете змінити');
      return;
    }
    const payload = {
      ids: ids.map(id => Number(id)),
      status_id: Number(data.status),
      comment: data.comment?.trim() || '',
    };

    try {
      await changeFinStatusBulk(payload);
      await fetchData();
      Notify.success('Статус заявок змінено!');
      closeModalBulk();
      resetSelection();
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const bulkStatusOptions = translateOptions(
    !canBulkEditRequests
      ? []
      : userRole === UserRole.FINANCE
      ? approveStatusFin
      : userRole === UserRole.ACCOUNTANT
      ? approveStatusBuh
      : [],
    t
  );

  const closeModalSendFiles = () => {
    setModalSendFilesIsOpen(false);
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
              <button
                className={style.csvBtn}
                onClick={() =>
                  exportToCSV({
                    rows: requestsRows,
                    columns: filteredColumns,
                    filePrefix: 'requests',
                  })
                }
              >
                {t('common.exportCsv')}
              </button>
            </div>
            <div>
              <button
                className={style.filterBtn}
                type="button"
                onClick={() => setShowAllFilters(prev => !prev)}
              >
                <Icon id="filter_list" className={style.filterIcon} />
                {showAllFilters ? t('common.hideFilters') : t('common.allFilters')}
              </button>
            </div>
            <div className={style.formsContainer}>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'project',
                    label: t('labels.department'),
                    options: projectOptions,
                    onChange: value => setSelectedProject(value),
                  },
                ]}
                defaultValues={{
                  project: selectedProject,
                }}
              />
              <form className={style.searchContainer}>
                <label className={style.labelContainer}>
                  <input
                    type="text"
                    name="applicant"
                    className={style.inputContainer}
                    placeholder={t('labels.applicant')}
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
                    placeholder={t('labels.payer')}
                    onChange={handleSearchChange}
                  />
                </label>
              </form>
              <Form
                fields={[
                  {
                    type: 'autocomplete-select',
                    name: 'expense_category',
                    label: t('labels.expenseCategory'),
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
              <>
                <div className={style.formsContainer}>
                  <form className={style.searchContainer}>
                    <label className={style.labelContainer}>
                      <input
                        type="text"
                        name="request_id"
                        className={style.inputContainer}
                        placeholder={t('labels.id') + ' заявки'}
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
                        placeholder={t('labels.paymentDeadline')}
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
                        placeholder={t('labels.purpose')}
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                  <Form
                    fields={[
                      {
                        type: 'select',
                        name: 'currency',
                        label: t('labels.currency'),
                        options: currenciesOptions,
                        onChange: value => setSelectedCurrency(value),
                      },
                    ]}
                    defaultValues={{
                      currency: selectedCurrency,
                    }}
                  />
                </div>
                <div className={style.formsContainer}>
                  <form className={style.searchContainer}>
                    <label className={style.labelContainer}>
                      <input
                        type="text"
                        name="payment_details"
                        className={style.inputContainer}
                        placeholder={t('labels.paymentDetails')}
                        onChange={handleSearchChange}
                      />
                    </label>
                  </form>
                  <Form
                    fields={[
                      {
                        type: 'autocomplete-select',
                        name: 'contractor',
                        label: t('labels.contractor'),
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
                        label: t('labels.paymentForm'),
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
              </>
            )}
            <div className={style.statusRow}>
              <ul className={style.statuscontainer}>
                {(
                  userRole === UserRole.ACCOUNTANT
                    ? translateOptions(statusSelectorBuh, t)
                    : translateOptions(statusSelectorFin, t)
                ).map(status => (
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
              {canBulkEditRequests && selectedIds.size > 0 && (
                <div className={style.bulkActionsInline}>
                  <button
                    className={style.bulkEditButton}
                    onClick={openModalBulk}
                  >
                    {t('common.editSelected')}
                  </button>
                </div>
              )}
            </div>
            <div>
              <button className={style.filterBtn} onClick={openModalColumns}>
                <Icon id="filter_list" className={style.filterIcon} />
                {t('common.columnsFilter')}
              </button>
            </div>
          </div>
          {loadingTable ? (
            <Loader />
          ) : requestsRows.length === 0 ? (
            <div className={style.noDataContainer}>
              <p className={style.noDataText}>
                {t('messages.noRequestsForPeriod')}
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
                    <p className={style.totalTitle}>{t('common.totalCurrency')}</p>
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
                    <p className={style.totalTitle}>{t('common.totalAmountUah')}</p>
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
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <ApproveRequestForm
              request={selectedRequest}
              closeModal={closeModal}
              onRefresh={fetchData}
              userRole={isExecutiveApprovalMode ? UserRole.CEO : userRole}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalColumnsOpen}
            onCloseModal={closeModalColumns}
          >
            <ModalColumnsForm
              columns={tableColumns}
              closeModal={closeModalColumns}
              visibleColumns={visibleColumns}
              handleColumnToggle={handleColumnToggle}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalWatchOpen}
            onCloseModal={closeModalWatch}
          >
            <ApproveWatchForm
              request={selectedRequest}
              closeModal={closeModalWatch}
              onRefresh={fetchData}
              userRole={userRole}
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
              formType="requests"
              userRole={userRole}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalBulkOpen}
            onCloseModal={closeModalBulk}
          >
            <BulkApproveForm
              title="Погодження заявок"
              selectedCount={selectedIds.size}
              statusOptions={bulkStatusOptions}
              onSubmit={handleBulkSubmit}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default RequestsPage;


