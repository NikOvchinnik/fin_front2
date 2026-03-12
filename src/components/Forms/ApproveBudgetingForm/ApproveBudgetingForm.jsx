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
import { ensureCurrentWeekOption } from '../../../helpers/budgetingWeekOptions';

const ApproveBudgetingForm = ({ request, closeModal, onRefresh, userRole }) => {
  const [weeksOptions, setWeeksOptions] = useState([]);

  const defaultPeriod = dayjs().format('MM.YYYY');
  const requestPeriod = request?.plan_period || '';
  const requestWeekValue = request?.week || '';

  const getWeeksOfMonth = period => {
    if (!period) return [];

    const [month, year] = period.split('.');
    const startOfMonth = dayjs(`${year}-${month}-01`);
    const endOfMonth = startOfMonth.endOf('month');

    const weeks = [];
    let currentStart = startOfMonth;

    if (currentStart.day() !== 1) {
      const offset = currentStart.day() === 0 ? 6 : currentStart.day() - 1;
      currentStart = currentStart.subtract(offset, 'day');
      if (currentStart.isBefore(startOfMonth)) currentStart = startOfMonth;
    }

    while (
      currentStart.isBefore(endOfMonth) ||
      currentStart.isSame(endOfMonth, 'day')
    ) {
      let weekStart = currentStart;
      let weekEnd = weekStart.add(6 - weekStart.day() + 1, 'day');
      if (weekEnd.isAfter(endOfMonth)) weekEnd = endOfMonth;

      weeks.push({ start: weekStart, end: weekEnd });

      currentStart = weekEnd.add(1, 'day');
    }

    const hasTueOrThu = week => {
      for (
        let d = week.start;
        d.isBefore(week.end) || d.isSame(week.end, 'day');
        d = d.add(1, 'day')
      ) {
        const dow = d.day();
        if (dow === 2 || dow === 4) return true;
      }
      return false;
    };

    const adjusted = [];
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      if (!hasTueOrThu(week)) {
        if (i > 0) {
          adjusted[adjusted.length - 1].end = week.end;
        } else if (weeks[i + 1]) {
          weeks[i + 1].start = week.start;
        }
      } else {
        adjusted.push(week);
      }
    }

    return adjusted.map((week, index) => {
      const weekName = `Week ${index + 1}`;
      return { value: weekName, label: weekName };
    });
  };

  const defaultWeeks = ensureCurrentWeekOption(
    getWeeksOfMonth(requestPeriod || defaultPeriod),
    requestWeekValue
  );

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
    },
    {
      type: 'select',
      name: 'week',
      label: 'Тиждень',
      options: weeksOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      validation: { required: 'This field is required' },
    },
  ];

  const buttons = [
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
          try {
            const formData = new FormData();
            formData.append('status_id', data.status);
            formData.append('comment', data.comment?.trim() || '');
            formData.append('week', data.week);

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
          week: requestWeekValue || '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingForm;
