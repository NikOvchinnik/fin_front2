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
import { selectUserName, selectUserRole } from '../../../redux/auth/selectors';
import { postMyBudgeting } from '../../../helpers/axios/budgeting';
import { getUnits } from '../../../helpers/axios/units';
import {
  getWeeksOfMonth,
  resolveWeekRangeValue,
} from '../../../helpers/budgetingWeekOptions';
import { useTranslation } from 'react-i18next';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { mapSubdivisionOptions } from '../../../helpers/departmentField';
import { isFinanceRole } from '../../../helpers/roles';

const BudgetNewForm = ({ closeModal, onRefresh }) => {
  const { t } = useTranslation();
  const [UnitOptions, setUnitOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);
  const userName = useSelector(selectUserName);
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isFinanceRole(userRole);

  const defaultPeriod = dayjs().format('MM.YYYY');

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
        const units = await getUnits();
        const UnitSelector = units.map(p => ({
          value: p.id,
          label: p.name,
        }));
        setUnitOptions(UnitSelector);

        if (canViewSubdivision) {
          const subdivisions = await getSubdivisions();
          setSubdivisionOptions(mapSubdivisionOptions(subdivisions));
        }

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
      } catch {
        Notify.failure(t('notifications.genericError'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canViewSubdivision]);

  const fields = [
    {
      type: 'text',
      name: 'applicant',
      label: t('labels.applicant'),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'unit',
      label: t('labels.department'),
      options: UnitOptions,
      validation: { required: t('validation.required') },
    },
    ...(canViewSubdivision
      ? [
          {
            type: 'autocomplete-select',
            name: 'subdivision_id',
            label: t('labels.subdivision'),
            options: subdivisionOptions,
          },
        ]
      : []),
    {
      type: 'autocomplete-select',
      name: 'expense_category_id',
      label: t('labels.expenseCategory'),
      options: expenseCategoryOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'select',
      name: 'period',
      label: t('labels.plannedPeriod'),
      options: generateDefaultPeriods(12),
      validation: { required: t('validation.required') },
      onChange: (value, setValue) => {
        setWeeksOptions(getWeeksOfMonth(value));
        setValue('week', '', { shouldValidate: true });
      },
    },
    {
      type: 'select',
      name: 'week',
      label: t('labels.week'),
      options: weeksOptions,
      validation: {
        required: t('validation.required'),
        validate: value =>
          weeksOptions.some(option => option.value === value) ||
          t('validation.selectWeekForPeriod'),
      },
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: t('labels.purpose'),
      validation: { required: t('validation.required') },
    },
    {
      type: 'number-number-group',
      number1: {
        name: 'amount_opt',
        label: t('labels.optimisticAmount'),
        validation: { required: t('validation.required') },
      },
      number2: {
        name: 'amount_pes',
        label: t('labels.pessimisticAmount'),
        validation: { required: t('validation.required') },
      },
    },
    {
      type: 'select',
      name: 'currency',
      label: t('labels.currency'),
      options: currencyOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: t('labels.comment'),
    },
  ];

  const buttons = [
    {
      label: t('actions.create'),
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
            title={t('forms.createBudget')}
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
                Notify.success(t('notifications.newBudgetCreated'));
              } catch (error) {
                Notify.failure(t('notifications.genericError'));
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              applicant: userName,
              unit: '',
              ...(canViewSubdivision ? { subdivision_id: '' } : {}),
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
