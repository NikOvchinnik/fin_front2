import { useState, useMemo } from 'react';
import style from './RequestSearch.module.css';
import { Notify } from 'notiflix';
import { sendRequest } from '../../helpers/axios/requests';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import { getShortStatus, getStatusStyle } from '../../helpers/status';
import { selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EditRequestForm from '../../components/Forms/EditRequestForm/EditRequestForm';
import WatchRequestForm from '../../components/Forms/WatchRequestForm/WatchRequestForm';
import { exportToCSV } from '../../helpers/exportToCSV';
import ModalColumnsForm from '../../components/Forms/ModalColumnsForm/ModalColumnsForm';
import SendFilesForm from '../../components/Forms/SendFilesForm/SendFilesForm';

const RequestSearch = ({ dataRequests, onRefresh }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [isModalSendFilesOpen, setModalSendFilesIsOpen] = useState(false);
  const [isModalColumnsOpen, setModalColumnsIsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('visibleSearchRequestColumns');
    return saved ? JSON.parse(saved) : 'All';
  });
  const userRole = useSelector(selectUserRole);

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
        'visibleSearchRequestColumns',
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    return dataRequests.map(request => ({
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
      amount_uah:
        request.paid_in_uah != null
          ? request.paid_in_uah.toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : request.amount != null && request.currency?.rate != null
          ? (request.amount * request.currency.rate).toLocaleString('uk-UA', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          : '',
      amount_uah_plain:
        request.paid_in_uah != null
          ? request.paid_in_uah
          : request.amount != null && request.currency?.rate != null
          ? request.amount * request.currency.rate
          : 0,
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
          {getShortStatus(request.status)}
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
          {(request.status === 'Чернетка' ||
            request.status === 'Потребує виправлень') && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (
                  request.status === 'Чернетка' ||
                  request.status === 'Потребує виправлень'
                ) {
                  setSelectedRequest(request);
                  setModalSendIsOpen(true);
                }
              }}
            >
              <Icon id="paper-plane" className={style.editIcon} />
            </button>
          )}
          {(request.status === 'Фінанси: Сплачено, очікуються документи' ||
            request.status === 'Бухгалтер: Сплачено, очікуються документи') && (
            <button
              className={style.sendBtn}
              onClick={() => {
                if (
                  request.status ===
                    'Фінанси: Сплачено, очікуються документи' ||
                  request.status === 'Бухгалтер: Сплачено, очікуються документи'
                ) {
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
      accessorKey: 'payment_date_await',
      header: (
        <div className={style.sortContainer}>
          <p>Кінцева дата оплати</p>
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
      accessorKey: 'payment_form',
      header: (
        <div className={style.sortContainer}>
          <p>Форма оплати</p>
        </div>
      ),
    },
    {
      accessorKey: 'contractor',
      header: (
        <div className={style.sortContainer}>
          <p>Контрагент</p>
        </div>
      ),
    },
    {
      accessorKey: 'payment_details',
      header: (
        <div className={style.sortContainer}>
          <p>Реквізити</p>
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
      accessorKey: 'payment_period',
      header: (
        <div className={style.sortContainer}>
          <p>Період оплати</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: (
        <div className={style.sortContainer}>
          <p>Сума</p>
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
      accessorKey: 'amount_uah',
      header: (
        <div className={style.sortContainer}>
          <p>Сума UAH</p>
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
      accessorKey: 'payer',
      header: (
        <div className={style.sortContainer}>
          <p>Платник</p>
        </div>
      ),
    },
    {
      accessorKey: 'beneficiary',
      header: (
        <div className={style.sortContainer}>
          <p>Вигодонабувач</p>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_optimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс оптимістичний (залишок)</p>
        </div>
      ),
    },
    {
      accessorKey: 'planned_balance_pessimistic',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс песимістичний (залишок)</p>
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
      accessorKey: 'files',
      header: 'Файли',
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
      onRefresh();
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
      <ModalWindow isModalOpen={isModalEditOpen} onCloseModal={closeModalEdit}>
        <EditRequestForm
          request={selectedRequest}
          closeModal={closeModalEdit}
          onRefresh={onRefresh}
          formType="all"
        />
      </ModalWindow>
      <ModalWindow
        isModalOpen={isModalWatchOpen}
        onCloseModal={closeModalWatch}
      >
        <WatchRequestForm
          request={selectedRequest}
          closeModal={closeModalWatch}
          onRefresh={onRefresh}
          formType="all"
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
          onRefresh={onRefresh}
          formType="myRequest"
          userRole={userRole}
        />
      </ModalWindow>
    </>
  );
};

export default RequestSearch;
