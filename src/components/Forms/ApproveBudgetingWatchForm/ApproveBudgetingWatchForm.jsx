import { useEffect, useState } from 'react';
import { approveBudgetingStatus } from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingWatchForm.module.css';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import {
  ensureCurrentWeekOption,
  getWeeksOfMonth,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';

const ApproveBudgetingWatchForm = ({
  request,
  closeModal,
  onRefresh,
  userRole,
}) => {
  const [weeksOptions, setWeeksOptions] = useState([]);

  const defaultPeriod = dayjs().format('MM.YYYY');
  const requestPeriod = request?.plan_period || '';
  const requestWeekValue = request?.week || '';

  const periodWeeks = getWeeksOfMonth(requestPeriod || defaultPeriod);
  const resolvedRequestWeekValue = resolveWeekValue(periodWeeks, requestWeekValue);
  const defaultWeeks = ensureCurrentWeekOption(periodWeeks, resolvedRequestWeekValue);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setWeeksOptions(defaultWeeks);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }
    };
    fetchData();
  }, []);

  const fields = [
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      options: approveBudgetingStatus,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'select',
      name: 'week',
      label: 'Тиждень',
      options: weeksOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      validation: { required: 'This field is required' },
      readOnly: true,
    },
  ];

  return (
    <div className={style.editContainer}>
      <ul className={style.commentsList}>
        {request.applicant_comment && (
          <li className={style.commentApplicant}>
            Коментар заявника: {request.applicant_comment}
          </li>
        )}
        {request.finance_comment && (
          <li className={style.commentFinance}>
            Коментар фінанси: {request.finance_comment}
          </li>
        )}
        {request.ceo_comment && (
          <li className={style.commentCeo}>
            Коментар CEO/COO/CFO: {request.ceo_comment}
          </li>
        )}
      </ul>
      <Form
        title="Перегляд заявки"
        fields={fields}
        defaultValues={{
          status: request.status?.id,
          comment:
            userRole === 4
              ? request.finance_comment || ''
              : userRole === 1
              ? request.ceo_comment || ''
              : userRole === 2
              ? request.applicant_comment || ''
              : '',
          week: resolvedRequestWeekValue || '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingWatchForm;
