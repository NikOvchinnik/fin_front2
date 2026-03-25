import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './BudgetEditForm.module.css';
import { Notify } from 'notiflix';
import {
  getCurrencies,
  getExpenseCategories,
} from '../../../helpers/axios/payments';
import dayjs from 'dayjs';
import Loader from '../../Loader/Loader';
import { generateDefaultPeriods } from '../../../helpers/periods';
import {
  deleteMyBudgeting,
  restoreBudgeting,
  updateMyBudgeting,
} from '../../../helpers/axios/budgeting';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import ModalWindow from '../../ModalWindow/ModalWindow';
import { getProjects } from '../../../helpers/axios/projects';
import {
  ensureCurrentWeekOption,
  getWeeksOfMonth,
  resolveWeekRangeValue,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';
import { isDeletedRecord } from '../../../helpers/softDelete';

const BudgetEditForm = ({ request, closeModal, onRefresh }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);
  const isDeleted = isDeletedRecord(request);

  const defaultPeriod = dayjs().format('MM.YYYY');
  const requestPeriod = request?.plan_period || '';
  const requestWeekValue = request?.week || '';

  const savedPeriod = requestPeriod || null;

  const periods = generateDefaultPeriods(12);

  if (savedPeriod && !periods.some(p => p.value === savedPeriod)) {
    periods.unshift({
      value: savedPeriod,
      label: savedPeriod,
    });
  }

  const periodWeeks = getWeeksOfMonth(requestPeriod || defaultPeriod);
  const resolvedRequestWeekValue = resolveWeekValue(periodWeeks, requestWeekValue);
  const defaultWeeks = ensureCurrentWeekOption(periodWeeks, resolvedRequestWeekValue);

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
        const currentCategory = request.expense_category;
        let options = expenseCategories
          .filter(e => e.is_active)
          .map(e => ({ value: e.id, label: e.name }));

        if (currentCategory && !currentCategory.is_active) {
          options.push({
            value: currentCategory.id,
            label: currentCategory.name,
          });
        }

        setExpenseCategoryOptions(options);

        setWeeksOptions(defaultWeeks);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMyBudgeting(request.id);
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success('Бюджет видалено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreBudgeting(request.id);
      onRefresh();
      closeModal();
      Notify.success('Бюджет відновлено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

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
      options: periods,
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

  const mappedFields = isDeleted
    ? fields.map(field => {
        if (field.type === 'number-number-group') {
          return {
            ...field,
            number1: { ...field.number1, readOnly: true },
            number2: { ...field.number2, readOnly: true },
          };
        }
        return { ...field, readOnly: true };
      })
    : fields;

  const buttons = isDeleted
    ? [
        {
          label: 'Відновити',
          className: 'submitBtn',
          type: 'button',
          onClick: handleRestore,
        },
      ]
    : [
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
        <div className={style.newContainer}>
          <ul className={style.commentsList}>
            {request.applicant_comment && (
              <li className={style.commentApplicant}>
                Коментар заявника: {request.applicant_comment}
              </li>
            )}
            {request.finance_comment && (
              <li className={style.commentFinance}>
                Коментар фінанси: {request.finance_comment}
              </li>
            )}
            {request.ceo_comment && (
              <li className={style.commentCeo}>
                Коментар CEO/COO/CFO: {request.ceo_comment}
              </li>
            )}
          </ul>
          <Form
            title="Редагувати бюджет"
            fields={mappedFields}
            buttons={buttons}
            onSubmit={async data => {
              if (isDeleted) {
                Notify.warning('Видалений бюджет не можна редагувати');
                return;
              }
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
                formData.append('id', request.id);

                await updateMyBudgeting(formData);
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
              applicant: request.applicant || '',
              project: request.project_id || '',
              expense_category_id: request.expense_category?.id || '',
              period: requestPeriod || '',
              week: resolvedRequestWeekValue || '',
              purpose: request.purpose || '',
              amount_opt: request.amount_optimistic ?? 0,
              amount_pes: request.amount_pessimistic ?? 0,
              currency: request.currency_id || '',
              comment: request.applicant_comment || '',
            }}
          />
          <ModalWindow
            isModalOpen={isModalConfirmOpen}
            onCloseModal={closeModalConfirm}
          >
            <ConfirmModal
              title="Видалити бюджет"
              message={`Ви впевнені, що хочете видалити бюджет ${request.purpose}?`}
              onConfirm={handleDelete}
              onClose={closeModalConfirm}
            />
          </ModalWindow>
        </div>
      )}
    </>
  );
};

export default BudgetEditForm;
