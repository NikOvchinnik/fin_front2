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
import { useTranslation } from 'react-i18next';

const GoogleSheetsPage = () => {
  const { t } = useTranslation();
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
      if (type === 'requests') {
        await exportRequestsToGoogle(selectedYearRequest);
      } else if (type === 'budgetings') {
        await exportBudgetingToGoogle(selectedYearBudgeting);
      } else {
        throw new Error('Unknown export type');
      }

      Notify.success(t('notifications.dataSent'));
    } catch (err) {
      Notify.failure(t('notifications.genericError'));
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
            <h2>{t('analytics.googleSheets')}</h2>
          </div>

          <div className={style.formsSelectorContainer}>
            <div className={style.formContainer}>
              {' '}
              <h3>{t('analytics.requestsYear')}</h3>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'year',
                    label: t('labels.year'),
                    options: yearsOptions(),
                    button: {
                      type: 'button',
                      label: t('actions.export'),
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
              <h3>{t('analytics.budgetingYear')}</h3>
              <Form
                fields={[
                  {
                    type: 'select',
                    name: 'year',
                    label: t('labels.year'),
                    options: yearsOptions(),
                    button: {
                      type: 'button',
                      label: t('actions.export'),
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
