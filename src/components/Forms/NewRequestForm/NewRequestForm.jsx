import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './NewRequestForm.module.css';
import { Notify } from 'notiflix';
import { getUnits } from '../../../helpers/axios/units';
import {
  getCurrencies,
  getExpenseCategories,
  getPaymentForms,
} from '../../../helpers/axios/payments';
import { periodOptions } from '../../../helpers/paymentPeriods';
import dayjs from 'dayjs';
import { createRequest } from '../../../helpers/axios/requests';
import {
  getContractors,
  postContractors,
} from '../../../helpers/axios/contractors';
import Loader from '../../Loader/Loader';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/auth/selectors';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { mapSubdivisionOptions } from '../../../helpers/departmentField';
import { isFinanceRole } from '../../../helpers/roles';

const refundIds = [15, 16, 17, 18, 19];

const NewRequestForm = ({ closeModal, onRefresh, formType }) => {
  const { t } = useTranslation();
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isFinanceRole(userRole);
  const [UnitOptions, setUnitOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);

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

        const paymentForms = await getPaymentForms();
        const paymentFormSelector = paymentForms.map(p => ({
          value: p.id,
          label: p.name,
        }));
        setPaymentFormOptions(paymentFormSelector);

        if (canViewSubdivision) {
          const subdivisions = await getSubdivisions();
          setSubdivisionOptions(mapSubdivisionOptions(subdivisions));
        }

        const currencies = await getCurrencies();
        const currencySelector = currencies.map(c => ({
          value: c.id,
          label: c.name,
        }));
        setCurrencyOptions(currencySelector);

        const expenseCategories = await getExpenseCategories();
        const filteredExpenseCategories =
          formType === 'refund'
            ? expenseCategories.filter(
                e => e.is_active && refundIds.includes(e.id)
              )
            : expenseCategories.filter(
                e => e.is_active && !refundIds.includes(e.id)
              );
        const expenseCategorySelector = filteredExpenseCategories.map(e => ({
          value: e.id,
          label: e.name,
        }));
        setExpenseCategoryOptions(expenseCategorySelector);

        const contractors = await getContractors();
        const contractorSelector = contractors.map(e => ({
          value: e.id,
          label: e.name,
        }));
        setContractorsOptions(contractorSelector);
      } catch {
        Notify.failure(t('notifications.genericError'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canViewSubdivision]);

  const getNextTuesdayOrThursday = () => {
    const date = dayjs();
    const day = date.day(); // 0=Нд, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб

    // Сьогоднішній день обирати не можна, навіть якщо сьогодні саме Вт чи Чт —
    // тому в цих двох випадках свідомо перескакуємо на наступний відповідний день.
    if (day === 0 || day === 1) return date.day(2); // Нд/Пн → цей вівторок
    if (day === 2 || day === 3) return date.day(4); // Вт/Ср → цей четвер
    return date.add(1, 'week').day(2); // Чт/Пт/Сб → наступний вівторок
  };

  const fields = [
    {
      type: 'autocomplete-select',
      name: 'unit_id',
      label: t('labels.department'),
      options: UnitOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'autocomplete-select',
      name: 'expense_category_id',
      label: t('labels.expenseCategory'),
      options: expenseCategoryOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'autocomplete-select',
      name: 'payment_form_id',
      label: t('labels.paymentForm'),
      options: paymentFormOptions,
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
      type: 'autocomplete-input',
      name: 'contractor_id',
      label: t('labels.contractor'),
      options: contractorsOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'text',
      name: 'payment_details',
      label: t('labels.paymentDetails'),
      validation: { required: t('validation.required') },
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: t('labels.purpose'),
      validation: { required: t('validation.required') },
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: t('labels.paymentDateRestricted'),
      validation: {
        required: t('validation.required'),
        validate: value => {
          if (!value) return t('validation.dateRequired');
          // "YYYY-MM-DD" парситься new Date() як UTC-північ, а не локальна —
          // на позитивних часових поясах (Україна) це зсуває час на 2-3 год
          // вперед і ламає порівняння з "сьогодні". Будуємо дату вручну
          // з компонентів, щоб обидві дати рахувались в локальному часі.
          const [year, month, dayOfMonth] = value.split('-').map(Number);
          const selected = new Date(year, month - 1, dayOfMonth);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selected < today) return t('validation.pastDateNotAllowed');
          if (selected.getTime() === today.getTime())
            return t('validation.todayNotAllowed');
          const day = selected.getDay();
          if (day !== 2 && day !== 4) return t('validation.onlyTueOrThu');
          return true;
        },
      },
      min: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    },
    {
      type: 'autocomplete-select',
      name: 'payment_period',
      label: t('labels.paymentPeriod'),
      options: translateOptions(periodOptions, t),
      validation: { required: t('validation.required') },
    },
    {
      type: 'number-select-group',
      number: {
        name: 'amount',
        label: t('labels.amount'),
        validation: { required: t('validation.required') },
      },
      select: {
        name: 'currency_id',
        label: t('labels.currency'),
        options: currencyOptions,
        validation: { required: t('validation.required') },
      },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: t('labels.comment'),
    },
    {
      type: 'file',
      name: 'files',
      label: t('labels.files'),
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
            title={t('forms.createRequest')}
            fields={fields}
            buttons={buttons}
            onSubmit={async data => {
              try {
                setLoading(true);
                let contractorId = data.contractor_id;

                const existingContractor = contractorsOptions.find(c => {
                  if (String(c.value) === String(contractorId)) return true;

                  if (typeof contractorId === 'string') {
                    return c.label.toLowerCase() === contractorId.toLowerCase();
                  }

                  return false;
                });

                if (existingContractor) {
                  contractorId = existingContractor.value;
                } else {
                  const newContractor = await postContractors({
                    name: contractorId,
                  });
                  contractorId = newContractor.id;
                }

                const formData = new FormData();

                Object.entries({
                  ...data,
                  contractor_id: contractorId,
                }).forEach(([key, value]) => {
                  if (key === 'files' && value) {
                    if (value instanceof FileList || Array.isArray(value)) {
                      Array.from(value).forEach(file =>
                        formData.append('files', file)
                      );
                    }
                  } else {
                    if (typeof value === 'string') value = value.trim();
                    formData.append(key, value ?? '');
                  }
                });

                await createRequest(formData);
                onRefresh();
                closeModal();
                Notify.success(t('notifications.requestCreated'));
              } catch (error) {
                Notify.failure(t('notifications.genericError'));
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              unit_id: '',
              payment_form_id: '',
              ...(canViewSubdivision ? { subdivision_id: '' } : {}),
              contractor_id: '',
              payment_details: '',
              purpose: '',
              amount: '',
              currency_id: '',
              payment_period: '',
              payment_date_await:
                getNextTuesdayOrThursday().format('YYYY-MM-DD'),
              expense_category_id: '',
              comment: '',
              files: '',
            }}
          />
        </div>
      )}
    </>
  );
};

export default NewRequestForm;
