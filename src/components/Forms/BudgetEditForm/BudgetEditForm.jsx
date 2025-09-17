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
  postMyBudgeting,
} from '../../../helpers/axios/budgeting';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import ModalWindow from '../../ModalWindow/ModalWindow';
import { getProjects } from '../../../helpers/axios/projects';

const BudgetEditForm = ({ request, closeModal, onRefresh }) => {
  const [projectOptions, setProjectOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeksOptions, setWeeksOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);

  const defaultPeriod = dayjs().format('MM.YYYY');

  const getWeeksOfMonth = period => {
    if (!period) return [];

    const [month, year] = period.split('.');
    const startOfMonth = dayjs(`${year}-${month}-01`);
    const endOfMonth = startOfMonth.endOf('month');

    const weeks = [];
    let currentStart = startOfMonth;

    while (
      currentStart.isBefore(endOfMonth) ||
      currentStart.isSame(endOfMonth, 'day')
    ) {
      let weekStart = currentStart;
      let weekEnd = currentStart.add(6 - currentStart.day() + 1, 'day');

      if (weekEnd.isAfter(endOfMonth)) {
        weekEnd = endOfMonth;
      }

      weeks.push({
        value: `${weekStart.format('YYYY-MM-DD')}_${weekEnd.format(
          'YYYY-MM-DD'
        )}`,
        label: `${weekStart.format('DD.MM')} - ${weekEnd.format('DD.MM')}`,
      });

      currentStart = weekEnd.add(1, 'day');
    }

    return weeks;
  };

  const defaultWeeks = getWeeksOfMonth(request.plan_period || defaultPeriod);

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
      options: generateDefaultPeriods(12),
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
                Коментар CEO: {request.ceo_comment}
              </li>
            )}
          </ul>
          <Form
            title="Редагувати бюджет"
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
                formData.append('id', request.id);

                await postMyBudgeting(formData);
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
              period: request.plan_period || '',
              week: request.week || '',
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
