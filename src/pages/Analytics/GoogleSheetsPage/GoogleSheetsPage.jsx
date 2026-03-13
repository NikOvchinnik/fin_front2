import { useState } from 'react';
import DocTitle from '../../../components/DocTitle/DocTitle';
import style from './GoogleSheetsPage.module.css';
import Loader from '../../../components/Loader/Loader';
import dayjs from 'dayjs';
import { yearsOptions } from '../../../helpers/years';
import Form from '../../../components/Form/Form';
import { exportBudgetingToGoogle } from '../../../helpers/axios/budgeting';
import { exportRequestsToGoogle } from '../../../helpers/axios/requests';
import { Notify } from 'notiflix';

const GoogleSheetsPage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedYearRequest, setSelectedYearRequest] = useState(
    dayjs().year()
  );
  const [selectedYearBudgeting, setSelectedYearBudgeting] = useState(
    dayjs().year()
  );

  const handleSubmit = async type => {
    setLoading(true);
    try {
      let response;
      if (type === 'requests') {
        response = await exportRequestsToGoogle(selectedYearRequest);
      } else if (type === 'budgetings') {
        response = await exportBudgetingToGoogle(selectedYearBudgeting);
      } else {
        throw new Error('Unknown export type');
      }

      Notify.success('Дані відправлені!');
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>GoogleSheets</DocTitle>
          <div className={style.titleContainer}>
            <h2>Гугл таблиці аналітика</h2>
          </div>

          <div className={style.formsSelectorContainer}>
            <div className={style.formContainer}>
              {' '}
              <h3>Аналітика заявок на рік</h3>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'year',
                    label: 'Рік',
                    options: yearsOptions(),
                    button: {
                      type: 'button',
                      label: 'Експорт',
                      onClick: () => handleSubmit('requests'),
                      className: 'submitBtn',
                    },
                    onChange: value => setSelectedYearRequest(value),
                  },
                ]}
                defaultValues={{
                  year: selectedYearRequest,
                }}
              />
            </div>
            <div className={style.formContainer}>
              <h3>Аналітика бюджетування на рік</h3>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'year',
                    label: 'Рік',
                    options: yearsOptions(),
                    button: {
                      type: 'button',
                      label: 'Експорт',
                      onClick: () => handleSubmit('budgetings'),
                      className: 'submitBtn',
                    },
                    onChange: value => setSelectedYearBudgeting(value),
                  },
                ]}
                defaultValues={{
                  year: selectedYearBudgeting,
                }}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default GoogleSheetsPage;
