import { useState, useMemo } from 'react';
import style from './BudgetSearch.module.css';
import { Notify } from 'notiflix';
import { sendRequest } from '../../helpers/axios/requests';
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
  getShortBudgetingStatus,
} from '../../helpers/budgetingStatuses';
import BudgetEditForm from '../../components/Forms/BudgetEditForm/BudgetEditForm';
import BudgetWatchForm from '../../components/Forms/BudgetWatchForm/BudgetWatchForm';
import { sendBudgeting } from '../../helpers/axios/budgeting';
import { formatMoney, getBudgetingAmountUah } from '../../helpers/amounts';
import { isDeletedRecord } from '../../helpers/softDelete';

const BudgetSearch = ({ dataRequests, onRefresh, deletedFilter }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleSearchBudgetingColumns');
    return saved ? JSON.parse(saved) : 'All';
  });

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
          {getShortBudgetingStatus(request.status?.name)}
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
          <p>ID</p>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: (
        <div className={style.sortContainer}>
          <p>Дата заявки</p>
        </div>
      ),
    },
    {
      accessorKey: 'project',
      header: (
        <div className={style.sortContainer}>
          <p>Підрозділ</p>
        </div>
      ),
    },
    {
      accessorKey: 'week',
      header: (
        <div className={style.sortContainer}>
          <p>Тиждень</p>
        </div>
      ),
    },
    {
      accessorKey: 'purpose',
      header: (
        <div className={style.sortContainer}>
          <p>Призначення</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума оптимістична</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума песимістична</p>
        </div>
      ),
    },
    {
      accessorKey: 'currency',
      header: (
        <div className={style.sortContainer}>
          <p>Валюта</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума в UAH оптимістична</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount_uah_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Сума в UAH песимістична</p>
        </div>
      ),
    },
    {
      accessorKey: 'expense_category',
      header: (
        <div className={style.sortContainer}>
          <p>Стаття витрат</p>
        </div>
      ),
    },
    {
      accessorKey: 'applicant',
      header: (
        <div className={style.sortContainer}>
          <p>Заявник</p>
        </div>
      ),
    },
    {
      accessorKey: 'tech',
      header: (
        <div className={style.sortContainer}>
          <p>Період</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: (
        <div className={style.sortContainer}>
          <p>Статус</p>
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
      Notify.warning('Видалений бюджет не можна змінювати');
      return;
    }
    try {
      await sendBudgeting(selectedRequest.id);
      onRefresh(selectedRequest.id, 'budgeting', deletedFilter);
      closeModalConfirm();
      Notify.success('Заявку відправлено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  return (
    <>
      <div className={style.filterContainer}>
        <button className={style.filterBtn} onClick={openModalColumns}>
          <Icon id="filter_list" className={style.filterIcon} />
          Фільтр колонок
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
          Експорт у CSV
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
          columns={columns}
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
          title="Відправити бюджет"
          message={`Ви впевнені, що хочете відправити бюджет на затвердження ${selectedRequest?.purpose}?`}
          onConfirm={handleSend}
          onClose={closeModalConfirm}
        />
      </ModalWindow>
    </>
  );
};

export default BudgetSearch;
