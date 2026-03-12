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
import {
  deleteLink,
  deleteRequest,
  deleteRequestCEO,
  updateRequest,
} from '../../../helpers/axios/requests';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import ModalWindow from '../../ModalWindow/ModalWindow';
import {
  getContractors,
  postContractors,
} from '../../../helpers/axios/contractors';
import Icon from '../../Icon/Icon';
import Loader from '../../Loader/Loader';

const refundIds = [15, 16, 17, 18, 19];

const EditRequestForm = ({ request, closeModal, onRefresh, formType, userRole }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [isModalLinkOpen, setModalLinkOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(request);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRequestData(request);
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

        if (
          request.expense_category &&
          !request.expense_category_active
        ) {
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
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [request]);

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const closeModalLink = () => {
    setModalLinkOpen(false);
  };

  const handleDelete = async () => {
    try {
      if(userRole === 1 || userRole === 4 || userRole === 5) {
        deleteRequestCEO(request.id);
      }
      else { 
        await deleteRequest(request.id);
      }
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success('Заявку видалено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const handleDeleteLink = async () => {
    try {
      await deleteLink(selectedLink.id);
      closeModalLink();
      setRequestData(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== selectedLink.id),
      }));
      setSelectedLink(null);
      onRefresh();
      Notify.success('Інформацію змінено!');
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
      validation:
        formType === 'all'
          ? { required: 'This field is required' }
          : {
              required: 'This field is required',
              validate: value => {
                if (!value) return "Дата обов'язкова";
                const selected = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selected < today) return 'Неможна обрати минулу дату';
                const day = selected.getDay();
                if (day !== 2 && day !== 4)
                  return 'Можна обрати тільки Вт або Чт';
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
      label: 'Видалити',
      className: 'deleteBtn',
      onClick: () => setModalConfirmOpen(true),
    },
    {
      label: 'Зберегти',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className={style.editContainer}>
          {requestData.files?.length > 0 && (
            <ul className={style.linkContainer}>
              {requestData.files.map((file, index) => (
                <li key={file.id}>
                  <a href={file.file_url} target="_blank" rel="noreferrer">
                    Link {index + 1}
                  </a>
                  <button
                    className={style.deleteBtn}
                    onClick={() => {
                      setSelectedLink(file);
                      setModalLinkOpen(true);
                    }}
                  >
                    <Icon id="trash" className={style.deleteIcon} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul className={style.commentsList}>
            {request.comment && (
              <li className={style.commentApplicant}>
                Коментар заявника: {request.comment}
              </li>
            )}
            {request.finance_comment && (
              <li className={style.commentFinance}>
                Коментар фінанси: {request.finance_comment}
              </li>
            )}
            {request.accounting_comment && (
              <li className={style.commentBuh}>
                Коментар бухгалтерія: {request.accounting_comment}
              </li>
            )}
          </ul>
          <Form
            title="Редагувати заявку"
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

                formData.append('id', request.id);

                await updateRequest(formData);
                onRefresh();
                closeModal();
                Notify.success('Інформацію змінено!');
              } catch (error) {
                Notify.failure('Сталася помилка, спробуйте ще раз');
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              project_id: requestData.project_id || '',
              expense_category_id: requestData.expense_category_id || '',
              payment_form_id: requestData.payment_form_id || '',
              contractor_id: requestData.contractor_id || '',
              payment_details: requestData.payment_details || '',
              purpose: requestData.purpose || '',
              payment_date_await:
                requestData.payment_date_await || dayjs().format('YYYY-MM-DD'),
              payment_period: requestData.payment_period || '',
              amount: requestData.amount ?? 0,
              currency_id: requestData.currency?.id || '',
              comment: requestData.comment || '',
              files: [],
            }}
          />
          <ModalWindow
            isModalOpen={isModalConfirmOpen}
            onCloseModal={closeModalConfirm}
          >
            <ConfirmModal
              title="Видалити заявку"
              message={`Ви впевнені, що хочете видалити заявку  ${request.contractor}?`}
              onConfirm={handleDelete}
              onClose={closeModalConfirm}
            />
          </ModalWindow>
          <ModalWindow
            isModalOpen={isModalLinkOpen}
            onCloseModal={closeModalLink}
          >
            <ConfirmModal
              title="Видалити файл"
              message={`Ви впевнені, що хочете видалити файл ${selectedLink?.file_url}?`}
              onConfirm={handleDeleteLink}
              onClose={closeModalLink}
            />
          </ModalWindow>
        </div>
      )}
    </>
  );
};

export default EditRequestForm;
