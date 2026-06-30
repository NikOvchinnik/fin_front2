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
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/auth/selectors';
import { getDepartments } from '../../../helpers/axios/departments';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import {
  getDepartmentId,
  getSubdivisionId,
  mapDepartmentOptions,
  mapSubdivisionOptions,
} from '../../../helpers/departmentField';
import { isAccountantRole } from '../../../helpers/roles';

const BudgetEditForm = ({ request, closeModal, onRefresh }) => {
  const { t } = useTranslation();
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isAccountantRole(userRole);
  const [projectOptions, setProjectOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
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

        const departments = await getDepartments();
        setDepartmentOptions(mapDepartmentOptions(departments));

        if (canViewSubdivision) {
          const subdivisions = await getSubdivisions();
          setSubdivisionOptions(mapSubdivisionOptions(subdivisions));
        }

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
      } catch {
        Notify.failure(t('notifications.genericError'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canViewSubdivision]);

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMyBudgeting(request.id);
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success(t('notifications.budgetDeleted'));
    } catch (error) {
      Notify.failure(t('notifications.genericError'));
      console.error('Error: ', error);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreBudgeting(request.id);
      onRefresh();
      closeModal();
      Notify.success(t('notifications.budgetRestored'));
    } catch (error) {
      Notify.failure(t('notifications.genericError'));
      console.error('Error: ', error);
    }
  };

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
      name: 'project',
      label: t('labels.department'),
      options: projectOptions,
      validation: { required: t('validation.required') },
    },
    {
      type: 'autocomplete-select',
      name: 'department_id',
      label: t('labels.departmentName'),
      options: departmentOptions,
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
      options: periods,
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
          label: t('actions.restore'),
          className: 'submitBtn',
          type: 'button',
          onClick: handleRestore,
        },
      ]
    : [
        {
          label: t('actions.delete'),
          className: 'deleteBtn',
          onClick: () => setModalConfirmOpen(true),
        },
        {
          label: t('actions.save'),
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
                {t('labels.applicantComment')}: {request.applicant_comment}
              </li>
            )}
            {request.finance_comment && (
              <li className={style.commentFinance}>
                {t('labels.financeComment')}: {request.finance_comment}
              </li>
            )}
            {request.ceo_comment && (
              <li className={style.commentCeo}>
                {t('labels.ceoComment')}: {request.ceo_comment}
              </li>
            )}
          </ul>
          <Form
            title={t('forms.editBudget')}
            fields={mappedFields}
            buttons={buttons}
            onSubmit={async data => {
              if (isDeleted) {
                Notify.warning(t('notifications.deletedBudgetCannotEdit'));
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
                Notify.success(t('notifications.infoChanged'));
              } catch (error) {
                Notify.failure(t('notifications.genericError'));
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              applicant: request.applicant || '',
              project: request.project_id || '',
              department_id: getDepartmentId(request),
              subdivision_id: getSubdivisionId(request),
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
              title={t('modals.deleteBudgetTitle')}
              message={t('modals.deleteBudgetMessage', {
                name: request.purpose,
              })}
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
