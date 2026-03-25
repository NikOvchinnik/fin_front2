import { useState, useCallback } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './SearchPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getRequestById } from '../../helpers/axios/requests';
import { searchType } from '../../helpers/history';
import Form from '../../components/Form/Form';
import { getBudgetingById } from '../../helpers/axios/budgeting';
import RequestSearch from '../../components/RequestSearch/RequestSearch';
import BudgetSearch from '../../components/BudgetSearch/BudgetSearch';
import {
  deletedFilterTabs,
  getDeletedFilterParam,
} from '../../helpers/softDelete';

const SearchPage = () => {
  const [loadingTable, setLoadingTable] = useState(false);
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequestType, setSelectedRequestType] = useState('request');
  const [selectedDeletedFilter, setSelectedDeletedFilter] = useState('false');
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async (id, type, deleted = selectedDeletedFilter) => {
    if (!id) {
      Notify.failure('Введіть ID заявки');
      return;
    }
    try {
      setLoadingTable(true);
      setDataRequests([]);
      setSubmitted(false);

      if (type === 'request') {
        const res = await getRequestById({
          id,
          deleted: getDeletedFilterParam(deleted),
        });
        setDataRequests([res]);
        setSelectedRequestType('request');
        setSubmitted(true);
      } else if (type === 'budgeting') {
        const res = await getBudgetingById({
          id,
          deleted: getDeletedFilterParam(deleted),
        });
        setDataRequests([res]);
        setSelectedRequestType('budgeting');
        setSubmitted(true);
      }
    } catch (err) {
      const message = err.response?.data?.message;

      if (err.response?.status === 404 || /not found/i.test(message)) {
        Notify.failure('Заявку не знайдено');
      } else {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }

      setSubmitted(false);
      setDataRequests([]);
    } finally {
      setLoadingTable(false);
    }
  }, [selectedDeletedFilter]);

  return (
    <section className={style.mainContainer}>
      <DocTitle>Search</DocTitle>
      <div className={style.formContainer}>
        <Form
          fields={[
            {
              type: 'select',
              name: 'type',
              label: 'Тип заявки',
              options: searchType,
            },
            {
              type: 'select',
              name: 'deleted_filter',
              label: 'Показувати',
              options: deletedFilterTabs,
              onChange: value => setSelectedDeletedFilter(value),
            },
            {
              type: 'text',
              name: 'id',
              label: 'ID заявки',
              button: {
                label: 'Search',
                className: 'searchBtn',
                type: 'submit',
              },
            },
          ]}
          styleForm="formRowContainer"
          onSubmit={data => {
            fetchData(data.id.trim(), data.type, data.deleted_filter);
          }}
          defaultValues={{
            id: '',
            type: selectedRequestType || 'request',
            deleted_filter: selectedDeletedFilter,
          }}
        />
      </div>
      {submitted &&
        (loadingTable ? (
          <Loader />
        ) : selectedRequestType === 'budgeting' ? (
          <BudgetSearch
            dataRequests={dataRequests}
            onRefresh={fetchData}
            deletedFilter={selectedDeletedFilter}
          />
        ) : (
          <RequestSearch
            dataRequests={dataRequests}
            onRefresh={fetchData}
            deletedFilter={selectedDeletedFilter}
          />
        ))}
    </section>
  );
};

export default SearchPage;
