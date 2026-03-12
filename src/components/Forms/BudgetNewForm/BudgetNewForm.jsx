import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './BudgetNewForm.module.css';
import { Notify } from 'notiflix';
import {
  getCurrencies,
  getExpenseCategories,
} from '../../../helpers/axios/payments';
import dayjs from 'dayjs';
import Loader from '../../Loader/Loader';
import { generateDefaultPeriods } from '../../../helpers/periods';
import { useSelector } from 'react-redux';
import {
  selectUserId,
  selectUserName,
  selectUserRole,
} from '../../../redux/auth/selectors';
import { postMyBudgeting } from '../../../helpers/axios/budgeting';
import { getProjects } from '../../../helpers/axios/projects';
import { resolveWeekRangeValue } from '../../../helpers/budgetingWeekOptions';

const BudgetNewForm = ({ closeModal, onRefresh }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);
  const userRole = useSelector(selectUserRole);
  const userId = useSelector(selectUserId);
  const userName = useSelector(selectUserName);

  const defaultPeriod = dayjs().format('MM.YYYY');

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
      return {
        value: weekName,
        label: weekName,
        start: week.start,
        end: week.end,
      };
    });
  };

  const defaultWeeks = getWeeksOfMonth(defaultPeriod);

  const defaultWeek =
    defaultWeeks.find(week => {
      return (
        dayjs().isAfter(dayjs(week.start).subtract(1, 'day')) &&
        dayjs().isBefore(dayjs(week.end).add(1, 'day'))
      );
    })?.value || '';

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
        setExpenseCategoryOptions(
          expenseCategories
            .filter(e => e.is_active)
            .map(e => ({ value: e.id, label: e.name }))
        );

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
    },
    {
      type: 'autocomplete-select',
      name: 'expense_category_id',
      label: 'Стаття витрат',
      options: expenseCategoryOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'select',
      name: 'period',
      label: 'Плановий період',
      options: generateDefaultPeriods(12),
      validation: { required: 'This field is required' },
      onChange: (value, setValue) => {
        setWeeksOptions(getWeeksOfMonth(value));
        setValue('week', '', { shouldValidate: true });
      },
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
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: 'Призначення',
      validation: { required: 'This field is required' },
    },
    {
      type: 'number-number-group',
      number1: {
        name: 'amount_opt',
        label: 'Оптимістична сума',
        validation: { required: 'This field is required' },
      },
      number2: {
        name: 'amount_pes',
        label: 'Песимістична сума',
        validation: { required: 'This field is required' },
      },
    },
    {
      type: 'select',
      name: 'currency',
      label: 'Валюта',
      options: currencyOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
    },
  ];

  const buttons = [
    {
      label: 'Створити',
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
          <Form
            title="Створити бюджет"
            fields={fields}
            buttons={buttons}
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

                await postMyBudgeting(formData);
                onRefresh();
                closeModal();
                Notify.success('Новий бюджет створено!');
              } catch (error) {
                Notify.failure('Сталася помилка, спробуйте ще раз');
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              applicant: userName,
              project: '',
              expense_category_id: '',
              period: defaultPeriod,
              week: defaultWeek,
              purpose: '',
              amount_opt: 0,
              amount_pes: 0,
              currency: '',
              comment: '',
            }}
          />
        </div>
      )}
    </>
  );
};

export default BudgetNewForm;
