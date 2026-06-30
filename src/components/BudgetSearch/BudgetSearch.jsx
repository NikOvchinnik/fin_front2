import { useState, useMemo } from 'react';
import style from './BudgetSearch.module.css';
import { Notify } from 'notiflix';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { exportToCSV } from '../../helpers/exportToCSV';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import {
  getBudgetingStatusStyle,
} from '../../helpers/budgetingStatuses';
import BudgetEditForm from '../../components/Forms/BudgetEditForm/BudgetEditForm';
import BudgetWatchForm from '../../components/Forms/BudgetWatchForm/BudgetWatchForm';
import { sendBudgeting } from '../../helpers/axios/budgeting';
import { formatMoney, getBudgetingAmountUah } from '../../helpers/amounts';
import { isDeletedRecord } from '../../helpers/softDelete';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/auth/selectors';
import { translateBudgetingStatus } from '../../helpers/i18nOptions';
import {
  filterDepartmentColumns,
  getDepartmentName,
  getSubdivisionName,
  normalizeDepartmentVisibleColumns,
} from '../../helpers/departmentField';

const BudgetSearch = ({ dataRequests, onRefresh, deletedFilter }) => {
  const { t } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const userRole = useSelector(selectUserRole);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleSearchBudgetingColumns');
    if (!saved) return 'All';

    return JSON.parse(saved);
  });

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
      localStorage.setItem(
        'visibleSearchBudgetingColumns',
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    return dataRequests.map(request => ({
      is_deleted_plain: isDeletedRecord(request),
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
      department: getDepartmentName(request),
      department_plain: getDepartmentName(request),
      subdivision: getSubdivisionName(request),
      subdivision_plain: getSubdivisionName(request),
      week: request.week || '',
      week_plain: request.week || '',
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
      applicant: request.applicant || '',
      applicant_plain: request.applicant || '',
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
          {translateBudgetingStatus(request.status, t)}
        </span>
      ),
      status_plain: request.status?.name || '',
      action: (
        <div className={style.actionContainer}>
          <button
            className={style.editBtn}
            onClick={() => {
              setSelectedRequest(request);
              openModalEdit();
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
          {!isDeletedRecord(request) &&
            (request.status?.id === 1 || request.status?.id === 4) && (
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
  }, [dataRequests]);

  const columns = [
    {
      accessorKey: 'request_id',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.id')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.requestDate')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'project',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.department')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.departmentName')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'subdivision',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.subdivision')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'week',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.week')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'purpose',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.purpose')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.optimisticAmount')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.pessimisticAmount')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'currency',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.currency')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.amountUahOptimistic')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.amountUahPessimistic')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'expense_category',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.expenseCategory')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'applicant',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.applicant')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'tech',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.period')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.status')}</p>
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

  const openModalColumns = () => {
    setModalColumnsIsOpen(true);
  };

  const closeModalColumns = () => {
    setModalColumnsIsOpen(false);
  };

  const handleSend = async () => {
    if (isDeletedRecord(selectedRequest)) {
      Notify.warning(t('notifications.deletedBudgetCannotChange'));
      return;
    }
    try {
      await sendBudgeting(selectedRequest.id);
      onRefresh(selectedRequest.id, 'budgeting', deletedFilter);
      closeModalConfirm();
      Notify.success(t('notifications.budgetSent'));
    } catch (error) {
      Notify.failure(t('notifications.genericError'));
      console.error('Error: ', error);
    }
  };

  return (
    <>
      <div className={style.filterContainer}>
        <button className={style.filterBtn} onClick={openModalColumns}>
          <Icon id="filter_list" className={style.filterIcon} />
          {t('common.columnsFilter')}
        </button>
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
      <Table
        data={requestsRows}
        columns={filteredColumns}
        styles="analyticTable"
        fixedFirstColumn={isMobile ? true : false}
        visibleColumns={25}
        visibleColumnsMobile={2}
        enableHorizontalScroll={isMobile ? false : true}
      />
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
      <ModalWindow isModalOpen={isModalEditOpen} onCloseModal={closeModalEdit}>
        <BudgetEditForm
          key={`budget-search-edit-${selectedRequest?.id || 'empty'}`}
          request={selectedRequest}
          closeModal={closeModalEdit}
          onRefresh={() =>
            onRefresh(selectedRequest.id, 'budgeting', deletedFilter)
          }
        />
      </ModalWindow>
      <ModalWindow
        isModalOpen={isModalWatchOpen}
        onCloseModal={closeModalWatch}
      >
        <BudgetWatchForm
          key={`budget-search-watch-${selectedRequest?.id || 'empty'}`}
          request={selectedRequest}
          closeModal={closeModalWatch}
          onRefresh={() =>
            onRefresh(selectedRequest.id, 'budgeting', deletedFilter)
          }
          formType={'all'}
        />
      </ModalWindow>
      <ModalWindow
        isModalOpen={isModalSendOpen}
        onCloseModal={closeModalConfirm}
      >
        <ConfirmModal
          title={t('modals.sendBudgetTitle')}
          message={t('modals.sendBudgetMessage', {
            name: selectedRequest?.purpose,
          })}
          onConfirm={handleSend}
          onClose={closeModalConfirm}
        />
      </ModalWindow>
    </>
  );
};

export default BudgetSearch;
