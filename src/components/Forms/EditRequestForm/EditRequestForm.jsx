import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './EditRequestForm.module.css';
import { Notify } from 'notiflix';
import { getProjects } from '../../../helpers/axios/projects';
import {
  getCurrencies,
  getExpenseCategories,
  getPaymentForms,
} from '../../../helpers/axios/payments';
import { periodOptions } from '../../../helpers/paymentPeriods';
import dayjs from 'dayjs';
import { deleteRequest, postRequest } from '../../../helpers/axios/requests';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import ModalWindow from '../../ModalWindow/ModalWindow';

const EditRequestForm = ({ request, closeModal, onRefresh, formType }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);

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
        const expenseCategorySelector = expenseCategories.map(e => ({
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

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteRequest(request.id);
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success('Заявку видалено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

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
      label: 'Delete',
      className: 'deleteBtn',
      onClick: () => setModalConfirmOpen(true),
    },
    {
      label: 'Save',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      <Form
        title="Редагувати заявку"
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
            formData.append('id', request.id);
            await postRequest(formData);
            onRefresh();
            closeModal();
            Notify.success('Інформацію змінено!');
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
      <ModalWindow
        isModalOpen={isModalConfirmOpen}
        onCloseModal={closeModalConfirm}
      >
        <ConfirmModal
          title="Видалити заявку"
          message={`Ви впевнені, що хочете видалити заявку  ${request.contractor_id}?`}
          onConfirm={handleDelete}
          onClose={closeModalConfirm}
        />
      </ModalWindow>
    </div>
  );
};

export default EditRequestForm;
