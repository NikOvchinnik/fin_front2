import { useEffect, useState } from 'react';
import { updateBudgetingStatus } from '../../../helpers/axios/budgeting';
import {
  approveBudgetingStatusCEO,
  approveBudgetingStatusFin,
  approveBudgetingStatusHd,
} from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingForm.module.css';
import { Notify } from 'notiflix';
import dayjs from 'dayjs';
import {
  ensureCurrentWeekOption,
  getWeeksOfMonth,
  resolveWeekRangeValue,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';
import { isDeletedRecord } from '../../../helpers/softDelete';

const ApproveBudgetingForm = ({ request, closeModal, onRefresh, userRole }) => {
  const [weeksOptions, setWeeksOptions] = useState([]);
  const isDeleted = isDeletedRecord(request);

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
      options:
        userRole === 4
          ? approveBudgetingStatusFin
          : userRole === 1
          ? approveBudgetingStatusCEO
          : userRole === 2
          ? approveBudgetingStatusHd
          : [],
      validation: { required: 'This field is required' },
      readOnly: isDeleted,
    },
    {
      type: 'select',
      name: 'week',
      label: 'Тиждень',
      options: weeksOptions,
      validation: { required: 'This field is required' },
      readOnly: isDeleted,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      validation: { required: 'This field is required' },
      readOnly: isDeleted,
    },
  ];

  const buttons = isDeleted
    ? []
    : [
        {
          label: 'Відправити',
          className: 'submitBtn',
          type: 'submit',
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
        title="Погодження бюджету"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          if (isDeleted) {
            Notify.warning('Видалений бюджет не можна змінювати');
            return;
          }
          try {
            const formData = new FormData();
            formData.append('status_id', data.status);
            formData.append('comment', data.comment?.trim() || '');
            formData.append('week', resolveWeekRangeValue(weeksOptions, data.week));

            await updateBudgetingStatus(request.id, formData);
            onRefresh();
            closeModal();
            Notify.success('Статус бюджету змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          status:
            userRole === 4 ? 7 : userRole === 1 ? 9 : userRole === 2 ? 5 : '',
          comment: '',
          week: resolvedRequestWeekValue || '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingForm;
