import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './NewRequestForm.module.css';
import { Notify } from 'notiflix';
import { getProjects } from '../../../helpers/axios/projects';
import {
  getCurrencies,
  getExpenseCategories,
  getPaymentForms,
} from '../../../helpers/axios/payments';
import { periodOptions } from '../../../helpers/paymentPeriods';
import dayjs from 'dayjs';
import { postRequest } from '../../../helpers/axios/requests';
import {
  getContractors,
  postContractors,
} from '../../../helpers/axios/contractors';
import Loader from '../../Loader/Loader';

const refundIds = [15, 16, 17, 18, 19];

const NewRequestForm = ({ closeModal, onRefresh, formType }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);

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

        const paymentForms = await getPaymentForms();
        const paymentFormSelector = paymentForms.map(p => ({
          value: p.id,
          label: p.name,
        }));
        setPaymentFormOptions(paymentFormSelector);

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
      type: 'autocomplete-select',
      name: 'project_id',
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
      type: 'autocomplete-select',
      name: 'payment_form_id',
      label: 'Форма оплати',
      options: paymentFormOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'autocomplete-input',
      name: 'contractor_id',
      label: 'Контрагент',
      options: contractorsOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'text',
      name: 'payment_details',
      label: 'Реквізити',
      validation: { required: 'This field is required' },
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: 'Призначення',
      validation: { required: 'This field is required' },
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: 'Дата оплати(тільки вт. або чт.)',
      validation: {
        required: 'This field is required',
        validate: value => {
          if (!value) return "Дата обов'язкова";
          const selected = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selected < today) return 'Неможна обрати минулу дату';
          const day = selected.getDay();
          if (day !== 2 && day !== 4) return 'Можна обрати тільки Вт або Чт';
          return true;
        },
      },
      min: dayjs().format('YYYY-MM-DD'),
    },
    {
      type: 'autocomplete-select',
      name: 'payment_period',
      label: 'Період оплати',
      options: periodOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'number-select-group',
      number: {
        name: 'amount',
        label: 'Сума',
        validation: { required: 'This field is required' },
      },
      select: {
        name: 'currency_id',
        label: 'Валюта',
        options: currencyOptions,
        validation: { required: 'This field is required' },
      },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
    },
    {
      type: 'file',
      name: 'files',
      label: 'Файли',
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
            title="Створити заявку"
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

                await postRequest(formData);
                onRefresh();
                closeModal();
                Notify.success('Нову заявку створено!');
              } catch (error) {
                Notify.failure('Сталася помилка, спробуйте ще раз');
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              project_id: '',
              payment_form_id: '',
              contractor_id: '',
              payment_details: '',
              purpose: '',
              amount: '',
              currency_id: '',
              payment_period: '',
              payment_date_await: dayjs().format('YYYY-MM-DD'),
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
