import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../../components/DocTitle/DocTitle';
import Form from '../../../components/Form/Form';
import style from './BudgetingHistoryPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../../components/Loader/Loader';
import Table from '../../../components/Table/Table';
import {
  getBudgetingHistory,
  getBudgetingHistoryById,
} from '../../../helpers/axios/history';
import { yearsOptions } from '../../../helpers/years';
import { monthsOptions } from '../../../helpers/months';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getActiveBudgetingStatus, statusHistoryBudgeting } from '../../../helpers/history';
import { useTranslation } from 'react-i18next';

dayjs.extend(utc);
dayjs.extend(timezone);

const BudgetingHistoryPage = () => {
  const { t } = useTranslation();
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
        const history = await getBudgetingHistoryById(searchLink);
        setSlotsHistory(history);
      } else {
        const history = await getBudgetingHistory(
          selectedMonth,
          selectedYear
        );
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
      header: t('labels.date'),
    },
    {
      accessorKey: 'request_id',
      header: t('labels.requestId'),
    },
    {
      accessorKey: 'status',
      header: t('labels.status'),
    },
    {
      accessorKey: 'userName',
      header: t('labels.editor'),
    },
    {
      accessorKey: 'comment',
      header: t('labels.comment'),
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
          getActiveBudgetingStatus(slot.status_id) === activeStatus;

        return matchesUser && matchesStatus;
      })
      .map(slot => {
        return {
          date: dayjs
            .utc(slot.created_at)
            .tz('Europe/Kyiv')
            .format('DD.MM.YYYY, HH:mm:ss'),
          request_id: slot.budgeting_id,
          status: slot.status_name,
          userName: slot.user_name || '',
          comment: slot.comment,
          className: `statusBudgeting-${slot.status_id}`,
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
            {statusHistoryBudgeting.map(status => (
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

export default BudgetingHistoryPage;
