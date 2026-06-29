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
import { createRequest } from '../../../helpers/axios/requests';
import { getContractors } from '../../../helpers/axios/contractors';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';
import { getDepartments } from '../../../helpers/axios/departments';
import {
  getDepartmentId,
  mapDepartmentOptions,
} from '../../../helpers/departmentField';

const refundIds = [15, 16, 17, 18, 19];

const WatchRequestForm = ({
  request,
  closeModal,
  onRefresh,
  onCopyCreated,
  formType,
}) => {
  const { t } = useTranslation();
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);

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

        const departments = await getDepartments();
        setDepartmentOptions(mapDepartmentOptions(departments));

        const currencies = await getCurrencies();
        const currencySelector = currencies.map(c => ({
          value: c.id,
          label: c.name,
        }));
        setCurrencyOptions(currencySelector);

        const expenseCategories = await getExpenseCategories();
        let filteredExpenseCategories;
        if (formType === 'refund') {
          filteredExpenseCategories = expenseCategories.filter(
            e => e.is_active && refundIds.includes(e.id)
          );
        } else if (formType === 'request') {
          filteredExpenseCategories = expenseCategories.filter(
            e => e.is_active && !refundIds.includes(e.id)
          );
        } else {
          filteredExpenseCategories = expenseCategories.filter(
            e => e.is_active
          );
        }

        let options = filteredExpenseCategories.map(e => ({
          value: e.id,
          label: e.name,
        }));

        if (request.expense_category && !request.expense_category_active) {
          options.push({
            value: request.expense_category_id,
            label: request.expense_category,
          });
        }

        setExpenseCategoryOptions(options);

        const contractors = await getContractors();
        const contractorSelector = contractors.map(e => ({
          value: e.id,
          label: e.name,
        }));
        setContractorsOptions(contractorSelector);
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchData();
  }, []);

  const fields = [
    {
      type: 'autocomplete-select',
      name: 'project_id',
      label: t('labels.department'),
      options: projectOptions,
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'expense_category_id',
      label: t('labels.expenseCategory'),
      options: expenseCategoryOptions,
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'payment_form_id',
      label: t('labels.paymentForm'),
      options: paymentFormOptions,
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'department_id',
      label: t('labels.departmentName'),
      options: departmentOptions,
      readOnly: true,
    },
    {
      type: 'autocomplete-input',
      name: 'contractor_id',
      label: t('labels.contractor'),
      options: contractorsOptions,
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'text',
      name: 'payment_details',
      label: t('labels.paymentDetails'),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'purpose',
      label: t('labels.purpose'),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: t('labels.date'),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'autocomplete-select',
      name: 'payment_period',
      label: t('labels.paymentPeriod'),
      options: translateOptions(periodOptions, t),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'number-select-group',
      number: {
        name: 'amount',
        label: t('labels.amount'),
        validation: { required: t('validation.required') },
        readOnly: true,
      },
      select: {
        name: 'currency_id',
        label: t('labels.currency'),
        options: currencyOptions,
        validation: { required: t('validation.required') },
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
      label: t('actions.copy'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      {request.files?.length > 0 && (
        <ul className={style.linkContainer}>
          {request.files.map((file, index) => (
            <li key={file.id}>
              <a href={file.file_url} target="_blank" rel="noreferrer">
                Link {index + 1}
              </a>
            </li>
          ))}
        </ul>
      )}
      <ul className={style.commentsList}>
        {request.comment && (
          <li className={style.commentApplicant}>
            {t('labels.applicantComment')}: {request.comment}
          </li>
        )}
        {request.finance_comment && (
          <li className={style.commentFinance}>
            {t('labels.financeComment')}: {request.finance_comment}
          </li>
        )}
        {request.accounting_comment && (
          <li className={style.commentBuh}>
            {t('labels.accountingComment')}: {request.accounting_comment}
          </li>
        )}
      </ul>
      <Form
        title={t('forms.watchRequest')}
        fields={fields}
        buttons={formType === 'all' ? [] : buttons}
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

            const response = await createRequest(formData);
            const createdRequestId = response?.financial_request_id ?? null;

            if (onCopyCreated && createdRequestId != null) {
              await onCopyCreated(createdRequestId);
            } else {
              await onRefresh();
              closeModal();
            }
            Notify.success(t('notifications.requestCreated'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          project_id: request.project_id || '',
          expense_category_id: request.expense_category_id || '',
          payment_form_id: request.payment_form_id || '',
          department_id: getDepartmentId(request),
          contractor_id: request.contractor_id || '',
          payment_details: request.payment_details || '',
          purpose: request.purpose || '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
          payment_period: request.payment_period || '',
          amount: request.amount ?? 0,
          currency_id: request.currency?.id || '',
          comment: request.comment || '',
        }}
      />
    </div>
  );
};

export default WatchRequestForm;
