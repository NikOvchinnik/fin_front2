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
import { defaultPeriods } from '../../../helpers/periods';
import { useSelector } from 'react-redux';
import {
  selectUserId,
  selectUserName,
  selectUserRole,
} from '../../../redux/auth/selectors';
import { postMyBudgeting } from '../../../helpers/axios/budgeting';
import { getProjects } from '../../../helpers/axios/projects';

const BudgetNewForm = ({ closeModal, onRefresh }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);
  const userRole = useSelector(selectUserRole);
  const userId = useSelector(selectUserId);
  const userName = useSelector(selectUserName);
  // const userDepartmentId = useSelector(selectUserDepartmentId);

  const defaultPeriod = dayjs().format('MM.YYYY');

  const getWeeksOfMonth = period => {
    if (!period) return [];

    const [month, year] = period.split('.');
    const start = dayjs(`${year}-${month}-01`);
    const end = start.endOf('month');

    let current = start.startOf('isoWeek');
    const weeks = [];

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const weekStart = current.format('YYYY-MM-DD');
      const weekEnd = current.add(6, 'day').format('YYYY-MM-DD');
      weeks.push({
        value: `${weekStart}_${weekEnd}`,
        label: `${current.format('DD.MM')} - ${current
          .add(6, 'day')
          .format('DD.MM')}`,
      });
      current = current.add(7, 'day');
    }

    return weeks;
  };

  const defaultWeeks = getWeeksOfMonth(defaultPeriod);

  const defaultWeek =
    defaultWeeks.find(week => {
      const [start, end] = week.value.split('_');
      return (
        dayjs().isAfter(dayjs(start).subtract(1, 'day')) &&
        dayjs().isBefore(dayjs(end).add(1, 'day'))
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
          expenseCategories.map(e => ({ value: e.id, label: e.name }))
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
      options: defaultPeriods,
      validation: { required: 'This field is required' },
      onChange: value => setWeeksOptions(getWeeksOfMonth(value)),
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

                Object.entries(data).forEach(([key, value]) => {
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
              amount_opt: '',
              amount_pes: '',
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
