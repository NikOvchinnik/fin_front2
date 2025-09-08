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

const refundIds = [15, 16, 17, 18, 19];

const NewRequestForm = ({ closeModal, onRefresh, formType }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
            ? expenseCategories.filter(e => refundIds.includes(e.id))
            : expenseCategories.filter(e => !refundIds.includes(e.id));
        const expenseCategorySelector = filteredExpenseCategories.map(e => ({
          value: e.id,
          label: e.name,
        }));
        setExpenseCategoryOptions(expenseCategorySelector);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
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
      type: 'text',
      name: 'contractor_id',
      label: 'Контрагент',
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
      label: 'Дата оплати',
      validation: { required: 'This field is required' },
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
      label: 'Save',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.newContainer}>
      <Form
        title="Створити заявку"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              if (key === 'files' && value instanceof FileList) {
                Array.from(value).forEach(file => {
                  formData.append('files', file);
                });
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
  );
};

export default NewRequestForm;
