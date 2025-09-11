import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './MyRequestsPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getMyRequests, sendRequest } from '../../helpers/axios/requests';
import { useMediaQuery } from '@mui/material';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import ExpandableText from '../../components/ExpandableText/ExpandableText';
import dayjs from 'dayjs';
import { getActiveStatus, getShortStatus, getStatusStyle, statusSelectorFin } from '../../helpers/status';
import DateNavigator from '../../components/DateNavigator/DateNavigator';
import { selectUserId, selectUserRole } from '../../redux/auth/selectors';
import { useSelector } from 'react-redux';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { useNavigate, useParams } from 'react-router-dom';
import NewRequestForm from '../../components/Forms/NewRequestForm/NewRequestForm';
import EditRequestForm from '../../components/Forms/EditRequestForm/EditRequestForm';
import WatchRequestForm from '../../components/Forms/WatchRequestForm/WatchRequestForm';

const MyRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc',
  });
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [isModalEditOpen, setModalEditIsOpen] = useState(false);
  const [isModalWatchOpen, setModalWatchIsOpen] = useState(false);
  const [isModalSendOpen, setModalSendIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  const [activeStatus, setActiveStatus] = useState('Всі');
  const { userId } = useParams();
  const userRole = useSelector(selectUserRole);
  const userSelectorId = useSelector(selectUserId);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      const requests = await getMyRequests({
        userId,
        startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
        endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
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

  const requestsRows = useMemo(() => {
    if (!dataRequests) return [];

    let filteredRows = dataRequests;

    if (activeStatus && activeStatus !== 'Всі') {
      filteredRows = filteredRows.filter(
        row => getActiveStatus(row.status) === activeStatus
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
          case 'contractor':
            return req.contractor || '';
          case 'purpose':
            return req.purpose || '';
          case 'payment_period':
            return req.payment_period || '';
          case 'amount':
            return req.amount || '';
          case 'currency':
            return req.currency || '';
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

    return sortedRows.map(request => ({
      id: request.id,
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
      contractor: request.contractor || '',
      contractor_plain: request.contractor || '',
      purpose: (
        <p>
          <ExpandableText text={request.purpose || ''} limit={50} />
        </p>
      ),
      purpose_plain: request.purpose || '',
      payment_period: request.payment_period || '',
      payment_period_plain: request.payment_period || '',
      amount: request.amount ? request.amount.toLocaleString('uk-UA') : '',
      amount_plain: request.amount || '',
      currency: request.currency || '',
      currency_plain: request.currency || '',
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
              if (
                request.status === 'Чернетка' ||
                request.status === 'Потребує виправлень'
              ) {
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
        </div>
      ),
    }));
  }, [dataRequests, activeStatus, sortConfig]);

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

  const exportToCSV = () => {
    if (!requestsRows || requestsRows.length === 0) return;

    const columnsForExport = columns;

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
      `my_requests_${dayjs().format('YYYY-MM-DD')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <button className={style.csvBtn} onClick={exportToCSV}>
                  Експорт у CSV
                </button>
              </div>
            </div>
            <ul className={style.statuscontainer}>
              {statusSelectorFin.map(status => (
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
              columns={columns}
              styles="analyticTable"
              fixedFirstColumn={isMobile ? true : false}
              visibleColumns={20}
              visibleColumnsMobile={2}
              rowsPerPage={25}
              enableHorizontalScroll={isMobile ? false : true}
            />
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
        </section>
      )}
    </>
  );
};

export default MyRequestsPage;
