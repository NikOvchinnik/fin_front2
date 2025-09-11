import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './WatchRequestForm.module.css';
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
import { getContractors } from '../../../helpers/axios/contractors';

const refundIds = [15, 16, 17, 18, 19];

const WatchRequestForm = ({ request, closeModal, onRefresh, formType }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);

  console.log(request);

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

        const contractors = await getContractors();
        const contractorSelector = contractors.map(e => ({
          value: e.id,
          label: e.name,
        }));
        setContractorsOptions(contractorSelector);
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
      type: 'autocomplete-select',
      name: 'payment_form_id',
      label: 'Форма оплати',
      options: paymentFormOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'autocomplete-input',
      name: 'contractor_id',
      label: 'Контрагент',
      options: contractorsOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'text',
      name: 'payment_details',
      label: 'Реквізити',
      validation: { required: 'This field is required' },
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
      type: 'date',
      name: 'payment_date_await',
      label: 'Дата оплати',
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'payment_period',
      label: 'Період оплати',
      options: periodOptions,
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'number-select-group',
      number: {
        name: 'amount',
        label: 'Сума',
        validation: { required: 'This field is required' },
        readOnly: true,
      },
      select: {
        name: 'currency_id',
        label: 'Валюта',
        options: currencyOptions,
        validation: { required: 'This field is required' },
        readOnly: true,
      },
    },
    // {
    //   type: 'textarea',
    //   name: 'comment',
    //   label: 'Коментар',
    //   readOnly: true,
    // },
  ];

  const buttons = [
    {
      label: 'Зробити копію',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      <h2 className={style.title}>Перегляд заявки</h2>
      {request.comment && (
        <p className={style.comment}>
          <span>Коментар:</span>
          {request.comment}
        </p>
      )}
      <Form
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
          project_id: request.project_id || '',
          expense_category_id: request.expense_category_id || '',
          payment_form_id: request.payment_form_id || '',
          contractor_id: request.contractor_id || '',
          payment_details: request.payment_details || '',
          purpose: request.purpose || '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
          payment_period: request.payment_period || '',
          amount: request.amount ?? '',
          currency_id: request.currency_id || '',
          comment: request.comment || '',
          files: request.files || '',
        }}
      />
    </div>
  );
};

export default WatchRequestForm;
