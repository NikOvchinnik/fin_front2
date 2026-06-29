import { useEffect, useState } from 'react';
import { updateBudgetingStatus } from '../../../helpers/axios/budgeting';
import {
  approveBudgetingStatusCEO,
  approveBudgetingStatusFin,
  approveBudgetingStatusHd,
} from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingForm.module.css';
import { Notify } from 'notiflix';
import dayjs from 'dayjs';
import {
  ensureCurrentWeekOption,
  getWeeksOfMonth,
  resolveWeekRangeValue,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';
import { isDeletedRecord } from '../../../helpers/softDelete';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';
import { getDepartmentName } from '../../../helpers/departmentField';

const ApproveBudgetingForm = ({ request, closeModal, onRefresh, userRole }) => {
  const { t } = useTranslation();
  const [weeksOptions, setWeeksOptions] = useState([]);
  const isDeleted = isDeletedRecord(request);

  const defaultPeriod = dayjs().format('MM.YYYY');
  const requestPeriod = request?.plan_period || '';
  const requestWeekValue = request?.week || '';

  const periodWeeks = getWeeksOfMonth(requestPeriod || defaultPeriod);
  const resolvedRequestWeekValue = resolveWeekValue(periodWeeks, requestWeekValue);
  const defaultWeeks = ensureCurrentWeekOption(periodWeeks, resolvedRequestWeekValue);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setWeeksOptions(defaultWeeks);
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchData();
  }, []);

  const fields = [
    {
      type: 'text',
      name: 'department',
      label: t('labels.departmentName'),
      readOnly: true,
    },
    {
      type: 'select',
      name: 'status',
      label: t('labels.status'),
      options: translateOptions(
        userRole === 4
          ? approveBudgetingStatusFin
          : userRole === 1
          ? approveBudgetingStatusCEO
          : userRole === 2
          ? approveBudgetingStatusHd
          : [],
        t
      ),
      validation: { required: t('validation.required') },
      readOnly: isDeleted,
    },
    {
      type: 'select',
      name: 'week',
      label: t('labels.week'),
      options: weeksOptions,
      validation: { required: t('validation.required') },
      readOnly: isDeleted,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: t('labels.comment'),
      validation: { required: t('validation.required') },
      readOnly: isDeleted,
    },
  ];

  const buttons = isDeleted
    ? []
    : [
        {
          label: t('actions.send'),
          className: 'submitBtn',
          type: 'submit',
        },
      ];

  return (
    <div className={style.editContainer}>
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
        title={t('forms.approveBudget')}
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          if (isDeleted) {
            Notify.warning(t('notifications.deletedBudgetCannotChange'));
            return;
          }
          try {
            const formData = new FormData();
            formData.append('status_id', data.status);
            formData.append('comment', data.comment?.trim() || '');
            formData.append('week', resolveWeekRangeValue(weeksOptions, data.week));

            await updateBudgetingStatus(request.id, formData);
            onRefresh();
            closeModal();
            Notify.success(t('notifications.budgetStatusChanged'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          department: getDepartmentName(request),
          status:
            userRole === 4 ? 7 : userRole === 1 ? 9 : userRole === 2 ? 5 : '',
          comment: '',
          week: resolvedRequestWeekValue || '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingForm;
