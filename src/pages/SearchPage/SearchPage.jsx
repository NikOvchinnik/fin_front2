import { useState, useCallback } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './SearchPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getRequestById } from '../../helpers/axios/requests';
import { searchType } from '../../helpers/status';
import Form from '../../components/Form/Form';
import { getBudgetingById } from '../../helpers/axios/budgeting';
import RequestSearch from '../../components/RequestSearch/RequestSearch';
import BudgetSearch from '../../components/BudgetSearch/BudgetSearch';

const SearchPage = () => {
  const [loadingTable, setLoadingTable] = useState(false);
  const [dataRequests, setDataRequests] = useState([]);
  const [selectedRequestType, setSelectedRequestType] = useState('request');
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async (id, type) => {
    if (!id) {
      Notify.failure('Введіть ID заявки');
      return;
    }
    try {
      setLoadingTable(true);
      setDataRequests([]);
      setSubmitted(false);

      if (type === 'request') {
        const res = await getRequestById({ id });
        setDataRequests([res]);
        setSelectedRequestType('request');
        setSubmitted(true);
      } else if (type === 'budgeting') {
        const res = await getBudgetingById({ id });
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
  }, []);

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
            fetchData(data.id.trim(), data.type);
          }}
          defaultValues={{
            id: '',
            type: selectedRequestType || 'request',
          }}
        />
      </div>
      {submitted &&
        (loadingTable ? (
          <Loader />
        ) : selectedRequestType === 'budgeting' ? (
          <BudgetSearch dataRequests={dataRequests} onRefresh={fetchData} />
        ) : (
          <RequestSearch dataRequests={dataRequests} onRefresh={fetchData} />
        ))}
    </section>
  );
};

export default SearchPage;
