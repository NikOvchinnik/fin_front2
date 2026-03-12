import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './BudgetWatchForm.module.css';
import { Notify } from 'notiflix';
import {
  getCurrencies,
  getExpenseCategories,
} from '../../../helpers/axios/payments';
import dayjs from 'dayjs';
import Loader from '../../Loader/Loader';
import { generateDefaultPeriods } from '../../../helpers/periods';
import { postMyBudgeting } from '../../../helpers/axios/budgeting';
import { getProjects } from '../../../helpers/axios/projects';
import {
  ensureCurrentWeekOption,
  resolveWeekRangeValue,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';

const BudgetWatchForm = ({
  request,
  closeModal,
  onRefresh,
  onCopyCreated,
  formType,
}) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);

  const defaultPeriod = dayjs().format('MM.YYYY');
  const requestPeriod = request?.plan_period || '';
  const requestWeekValue = request?.week || '';

  const savedPeriod = requestPeriod || null;

  const periods = generateDefaultPeriods(12);

  if (savedPeriod && !periods.some(p => p.value === savedPeriod)) {
    periods.unshift({
      value: savedPeriod,
      label: savedPeriod,
    });
  }

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
      return { value: weekName, label: weekName, start: week.start, end: week.end };
    });
  };

  const periodWeeks = getWeeksOfMonth(requestPeriod || defaultPeriod);
  const resolvedRequestWeekValue = resolveWeekValue(periodWeeks, requestWeekValue);
  const defaultWeeks = ensureCurrentWeekOption(periodWeeks, resolvedRequestWeekValue);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projects = await getProjects();
        const projectSelector = projects.map(p => ({
          value: p.id,
          label: p.name,
        }));
        setProjectOptions(projectSelector);

        const currencies = await getCurrencies();
        setCurrencyOptions(
          currencies.map(c => ({ value: c.id, label: c.name }))
        );

        const expenseCategories = await getExpenseCategories();
        const currentCategory = request.expense_category;
        let options = expenseCategories
          .filter(e => e.is_active)
          .map(e => ({ value: e.id, label: e.name }));

        if (currentCategory && !currentCategory.is_active) {
          options.push({
            value: currentCategory.id,
            label: currentCategory.name,
          });
        }

        setExpenseCategoryOptions(options);

        setWeeksOptions(defaultWeeks);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fields = [
    {
      type: 'text',
      name: 'applicant',
      label: 'Заявник',
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'project',
      label: 'Підрозділ',
      options: projectOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'expense_category_id',
      label: 'Стаття витрат',
      options: expenseCategoryOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'select',
      name: 'period',
      label: 'Плановий період',
      options: periods,
      validation: { required: 'This field is required' },
      onChange: (value, setValue) => {
        setWeeksOptions(getWeeksOfMonth(value));
        setValue('week', '', { shouldValidate: true });
      },
      readOnly: true,
    },
    {
      type: 'select',
      name: 'week',
      label: 'Тиждень',
      options: weeksOptions,
      validation: {
        required: 'This field is required',
        validate: value =>
          weeksOptions.some(option => option.value === value) ||
          'Оберіть тиждень для обраного періоду',
      },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: 'Призначення',
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'number-number-group',
      number1: {
        name: 'amount_opt',
        label: 'Оптимістична сума',
        validation: { required: 'This field is required' },
        readOnly: true,
      },
      number2: {
        name: 'amount_pes',
        label: 'Песимістична сума',
        validation: { required: 'This field is required' },
        readOnly: true,
      },
    },
    {
      type: 'select',
      name: 'currency',
      label: 'Валюта',
      options: currencyOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      readOnly: true,
    },
  ];

  const buttons = [
    {
      label: 'Зробити копію',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className={style.newContainer}>
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
            title="Перегляд бюджету"
            fields={fields}
            buttons={formType === 'all' ? [] : buttons}
            onSubmit={async data => {
              try {
                setLoading(true);
                const formData = new FormData();
                const submitData = {
                  ...data,
                  week: resolveWeekRangeValue(weeksOptions, data.week),
                };

                Object.entries(submitData).forEach(([key, value]) => {
                  if (typeof value === 'string') {
                    value = value.trim();
                  }
                  if (value !== null && value !== undefined && value !== '') {
                    formData.append(key, value);
                  } else {
                    formData.append(key, '');
                  }
                });

                const response = await postMyBudgeting(formData);
                const createdBudgetingId = response?.budgeting_id ?? null;

                if (onCopyCreated && createdBudgetingId != null) {
                  await onCopyCreated(createdBudgetingId);
                } else {
                  await onRefresh();
                  closeModal();
                }
                Notify.success('Бюджет створено!');
              } catch (error) {
                Notify.failure('Сталася помилка, спробуйте ще раз');
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              applicant: request.applicant || '',
              project: request.project_id || '',
              expense_category_id: request.expense_category?.id || '',
              period: requestPeriod || '',
              week: resolvedRequestWeekValue || '',
              purpose: request.purpose || '',
              amount_opt: request.amount_optimistic ?? 0,
              amount_pes: request.amount_pessimistic ?? 0,
              currency: request.currency_id || '',
              comment: request.applicant_comment || '',
            }}
          />
        </div>
      )}
    </>
  );
};

export default BudgetWatchForm;
