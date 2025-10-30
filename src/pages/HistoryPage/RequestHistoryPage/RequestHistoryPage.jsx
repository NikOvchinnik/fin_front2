import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../../components/DocTitle/DocTitle';
import Form from '../../../components/Form/Form';
import style from './RequestHistoryPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../../components/Loader/Loader';
import Table from '../../../components/Table/Table';
import {
  getRequestHistory,
  getRequestHistoryById,
} from '../../../helpers/axios/history';
import { yearsOptions } from '../../../helpers/years';
import { monthsOptions } from '../../../helpers/months';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getActiveStatus, statusHistory } from '../../../helpers/history';

dayjs.extend(utc);
dayjs.extend(timezone);

const RequestHistoryPage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [loadingTable, setLoadingTable] = useState(false);
  const [slotsHistory, setSlotsHistory] = useState([]);
  const [searchLink, setSearchLink] = useState('');
  const [filters, setFilters] = useState({
    userName: '',
  });
  const [activeStatus, setActiveStatus] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      setLoadingTable(true);
      if (searchLink) {
        const history = await getRequestHistoryById(searchLink);
        setSlotsHistory(history);
      } else {
        const history = await getRequestHistory(selectedMonth, selectedYear);
        setSlotsHistory(history);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        Notify.failure('Історію за цим ID не знайдено');
      } else {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }
      setSlotsHistory([]);
    } finally {
      setLoadingTable(false);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, searchLink]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      accessorKey: 'date',
      header: 'Дата',
    },
    {
      accessorKey: 'request_id',
      header: 'ID заявки',
    },
    {
      accessorKey: 'status',
      header: 'Статус',
    },
    {
      accessorKey: 'userName',
      header: 'Редактор',
    },
    {
      accessorKey: 'comment',
      header: 'Коментар',
    },
  ];

  const dataRows = useMemo(() => {
    return slotsHistory
      .filter(slot => {
        const matchesUser = filters.userName
          ? (slot.user_name || '').toLowerCase().includes(filters.userName)
          : true;
        const matchesStatus =
          activeStatus === 'All' ||
          getActiveStatus(slot.status_id) === activeStatus;

        return matchesUser && matchesStatus;
      })
      .map(slot => {
        return {
          date: dayjs
            .utc(slot.timestamp)
            .tz('Europe/Kyiv')
            .format('DD.MM.YYYY, HH:mm:ss'),
          request_id: slot.request_id,
          status: slot.status_name,
          userName: slot.user_name || '',
          comment: slot.comment,
          className: `status-${slot.status_id}`,
        };
      });
  }, [slotsHistory, filters, activeStatus]);

  const handleSearchChange = event => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value.toLowerCase().trim(),
    }));
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>History</DocTitle>
          <div className={style.formContainer}>
            <form className={style.searchContainer}>
              <label className={style.labelContainer}>
                <input
                  type="text"
                  name="userName"
                  className={style.inputContainer}
                  placeholder="Редактор"
                  onChange={handleSearchChange}
                />
              </label>
            </form>
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'month',
                  label: 'Month',
                  options: monthsOptions,
                  onChange: value => setSelectedMonth(value),
                },
              ]}
              defaultValues={{
                month: selectedMonth,
              }}
            />
            <Form
              fields={[
                {
                  type: 'select',
                  name: 'year',
                  label: 'Year',
                  options: yearsOptions(5),
                  onChange: value => setSelectedYear(value),
                },
              ]}
              defaultValues={{
                year: selectedYear,
              }}
            />
          </div>
          <Form
            fields={[
              {
                type: 'text',
                name: 'request_id',
                label: 'ID заявки',
                button: {
                  label: 'Search',
                  className: 'searchBtn',
                  type: 'submit',
                },
              },
            ]}
            onSubmit={data => {
              setSearchLink(data.request_id.trim());
            }}
            defaultValues={{
              request_id: '',
            }}
          />
          <ul className={style.statuscontainer}>
            {statusHistory.map(status => (
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
          {loadingTable ? (
            <Loader />
          ) : (
            <Table
              data={dataRows}
              columns={columns}
              visibleColumns={5}
              visibleColumnsMobile={2}
              fixedFirstColumn={true}
              rowsPerPage={15}
            />
          )}
        </section>
      )}
    </>
  );
};

export default RequestHistoryPage;
