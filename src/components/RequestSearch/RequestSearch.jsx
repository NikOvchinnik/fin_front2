import { useState, useMemo, useCallback } from 'react';
import style from './RequestSearch.module.css';
import { Notify } from 'notiflix';
import { sendRequest } from '../../helpers/axios/requests';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import {
  FinancialStatusFilter,
  getActiveStatus,
  getStatusStyle,
} from '../../helpers/status';
import { selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EditRequestForm from '../../components/Forms/EditRequestForm/EditRequestForm';
import WatchRequestForm from '../../components/Forms/WatchRequestForm/WatchRequestForm';
import { exportToCSV } from '../../helpers/exportToCSV';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import SendFilesForm from '../../components/Forms/SendFilesForm/SendFilesForm';
import { formatMoney, getRequestAmountUah } from '../../helpers/amounts';
import { isDeletedRecord } from '../../helpers/softDelete';
import { FinancialRequestStatus } from '../../helpers/enums';
import { useTranslation } from 'react-i18next';
import { translateFinancialStatus } from '../../helpers/i18nOptions';
import {
  filterDepartmentColumns,
  getSubdivisionName,
  normalizeDepartmentVisibleColumns,
} from '../../helpers/departmentField';

const RequestSearch = ({ dataRequests, onRefresh, deletedFilter }) => {
  const { t } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalSendFilesOpen, setModalSendFilesIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const userRole = useSelector(selectUserRole);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleSearchRequestColumns');
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

  const canSendRequestStatus = useCallback(request => {
    if (isDeletedRecord(request)) return false;
    const statusId = Number(request?.status_id ?? request?.status?.id);
    if (
      statusId === FinancialRequestStatus.DRAFT ||
      statusId === FinancialRequestStatus.NEEDS_REVISION
    ) {
      return true;
    }

    return [FinancialStatusFilter.DRAFT, FinancialStatusFilter.NEEDS_REVISION].includes(
      getActiveStatus(request?.status_id, request?.status)
    );
  }, []);

  const canSendFilesForStatus = useCallback(request =>
    !isDeletedRecord(request) &&
    getActiveStatus(request?.status_id, request?.status) ===
      FinancialStatusFilter.AWAITING_DOCUMENTS,
  []);

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
        'visibleSearchRequestColumns',
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
              Notify.success(t('notifications.copied'));
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
      applicant: request.applicant || '',
      applicant_plain: request.applicant || '',
      payer: request.payer || '',
      payer_plain: request.payer || '',
      beneficiary: request.beneficiary || '',
      beneficiary_plain: request.beneficiary || '',
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
            borderLeft: `4px solid ${getStatusStyle(request.status).color}`,
            paddingLeft: '6px',
            fontWeight: '700',
            color: getStatusStyle(request.status).color,
          }}
        >
          {translateFinancialStatus(request.status, t)}
        </span>
      ),
      status_plain: request.status || '',
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
          {canSendRequestStatus(request) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendRequestStatus(request)) {
                  setSelectedRequest(request);
                  setModalSendIsOpen(true);
                }
              }}
            >
              <Icon id="paper-plane" className={style.editIcon} />
            </button>
          )}
          {canSendFilesForStatus(request) && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (canSendFilesForStatus(request)) {
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
  }, [dataRequests, canSendRequestStatus, canSendFilesForStatus]);

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
      accessorKey: 'payment_date_await',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.paymentDeadline')}</p>
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
      accessorKey: 'subdivision',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.subdivision')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'payment_form',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.paymentForm')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'contractor',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.contractor')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'payment_details',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.paymentDetails')}</p>
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
      accessorKey: 'payment_period',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.paymentPeriod')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.amount')}</p>
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
      accessorKey: 'amount_uah',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.amountUah')}</p>
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
      accessorKey: 'payer',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.payer')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'beneficiary',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.beneficiary')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.optimisticBalance')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>{t('labels.pessimisticBalance')}</p>
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
      accessorKey: 'files',
      header: t('labels.files'),
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
    if (isDeletedRecord(selectedRequest)) {
      Notify.warning(t('notifications.deletedRequestCannotChange'));
      return;
    }
    try {
      await sendRequest(selectedRequest.id);
      onRefresh(selectedRequest.id, 'request', deletedFilter);
      closeModalConfirm();
      Notify.success(t('notifications.requestSent'));
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
      <ModalWindow isModalOpen={isModalEditOpen} onCloseModal={closeModalEdit}>
        <EditRequestForm
          request={selectedRequest}
          closeModal={closeModalEdit}
          onRefresh={() =>
            onRefresh(selectedRequest.id, 'request', deletedFilter)
          }
          formType="all"
          userRole={userRole}
        />
      </ModalWindow>
      <ModalWindow
        isModalOpen={isModalWatchOpen}
        onCloseModal={closeModalWatch}
      >
        <WatchRequestForm
          request={selectedRequest}
          closeModal={closeModalWatch}
          onRefresh={() =>
            onRefresh(selectedRequest.id, 'request', deletedFilter)
          }
          formType="all"
        />
      </ModalWindow>
      <ModalWindow
        isModalOpen={isModalSendOpen}
        onCloseModal={closeModalConfirm}
      >
        <ConfirmModal
          title={t('modals.sendRequestTitle')}
          message={t('modals.sendRequestMessage', {
            name: selectedRequest?.contractor,
          })}
          onConfirm={handleSend}
          onClose={closeModalConfirm}
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
        isModalOpen={isModalSendFilesOpen}
        onCloseModal={closeModalSendFiles}
      >
        <SendFilesForm
          request={selectedRequest}
          closeModal={closeModalSendFiles}
          onRefresh={() =>
            onRefresh(selectedRequest.id, 'request', deletedFilter)
          }
          formType="myRequest"
          userRole={userRole}
        />
      </ModalWindow>
    </>
  );
};

export default RequestSearch;


