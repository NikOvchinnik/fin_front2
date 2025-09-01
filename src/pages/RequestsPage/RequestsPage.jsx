import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './RequestsPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getFinRequests } from '../../helpers/axios/requests';
import { useMediaQuery } from '@mui/material';
import SimpleBar from 'simplebar-react';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import RequestCommentForm from '../../components/Forms/RequestCommentForm/RequestCommentForm';

const RequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [isModalOpen, setModalIsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      const requests = await getFinRequests();
      console.log(requests);
      setDataRequests(requests);
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoadingTable(false);
      setLoading(false);
    }
  }, []);

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

  const requestsRows = useMemo(() => {
    // const filteredRows = dataRequests.filter(row =>
    //   row.teacherName.toLowerCase().includes(filter.toLowerCase())
    // );

    const filteredRows = dataRequests;

    let sortedRows = [...filteredRows];

    if (sortConfig.key) {
      sortedRows.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'date') {
          valA = valA ? new Date(valA) : new Date(0);
          valB = valB ? new Date(valB) : new Date(0);
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = valA ?? '';
        valB = valB ?? '';
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return sortedRows.map(request => ({
      id: request.id,
      select: (
        <div className={style.checkboxContainer}>
          <label className={style.labelCheckboxContainer}>
            <input
              type="checkbox"
              name="select"
              className={style.checkboxInput}
              checked={selectedRows.includes(request.id)}
              onChange={() => handleRowSelect(request.id)}
            />
          </label>
        </div>
      ),
      payment_date_await: request.payment_date_await || '',
      project: request.project?.name || '',
      contractor: request.contractor_id || '',
      purpose: request.purpose || '',
      payment_period: request.payment_period || '',
      amount: request.amount || '',
      currency: request.currency?.name || '',
      amount_uah: request.amount * request.currency?.rate || '',
      expense_category: request.expense_category?.name || '',
      applicant:
        `${request.applicant_id?.last_name} ${request.applicant_id?.first_name}` ||
        '',
      payer: request.payment_form?.payer || '',
      beneficiary: request.project?.name || '',
      plan_balance:
        `${request.planned_balance_optimistic} / ${request.planned_balance_pessimistic} ` ||
        '',
      tech: request.payment_date_await
        ? request.payment_date_await.slice(0, 7)
        : '',
      status: request.status?.name || '',
    }));
  }, [dataRequests, selectedRows, filter, sortConfig]);

  const handleSelectAll = e => {
    if (e.target.checked) {
      setSelectedRows(requestsRows.map(row => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = id => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const columns = [
    {
      accessorKey: 'select',
      header: (
        <form className={style.checkboxContainer}>
          <label className={style.labelCheckboxContainer}>
            <input
              type="checkbox"
              name="selectAll"
              className={style.checkboxInput}
              checked={
                selectedRows.length === requestsRows.length &&
                requestsRows.length > 0
              }
              onChange={handleSelectAll}
            />
          </label>
        </form>
      ),
    },
    {
      accessorKey: 'payment_date_await',
      header: (
        <div className={style.sortContainer}>
          <p>Дата заявки</p>
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
      accessorKey: 'plan_balance',
      header: (
        <div className={style.sortContainer}>
          <p>Баланс по плану</p>
          <button
            className={style.btnContainer}
            onClick={() => handleSort('plan_balance')}
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
  ];

  const isMobile = useMediaQuery('(max-width: 1024px)');

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Requests</DocTitle>
          {loadingTable ? (
            <Loader />
          ) : isMobile ? (
            <Table
              data={requestsRows}
              columns={columns}
              styles="analyticTable"
              fixedFirstColumn="true"
              visibleColumns={20}
              visibleColumnsMobile={2}
              rowsPerPage={25}
            />
          ) : (
            <SimpleBar style={{ maxWidth: '100%' }}>
              <div className={style.tableContainer}>
                <Table
                  data={requestsRows}
                  columns={columns}
                  styles="analyticTable"
                  fixedFirstColumn="true"
                  visibleColumns={20}
                  visibleColumnsMobile={2}
                  rowsPerPage={25}
                />
              </div>
            </SimpleBar>
          )}
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <RequestCommentForm
              // periodId={periodId}
              closeModal={closeModal}
              onRefresh={fetchData}
            />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default RequestsPage;
