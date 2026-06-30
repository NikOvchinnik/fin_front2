import { useEffect, useState } from 'react';
import { approveBudgetingStatus } from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingWatchForm.module.css';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import {
  ensureCurrentWeekOption,
  getWeeksOfMonth,
  resolveWeekValue,
} from '../../../helpers/budgetingWeekOptions';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';
import {
  getDepartmentName,
  getSubdivisionName,
} from '../../../helpers/departmentField';
import { isAccountantRole } from '../../../helpers/roles';

const ApproveBudgetingWatchForm = ({
  request,
  userRole,
}) => {
  const { t } = useTranslation();
  const [weeksOptions, setWeeksOptions] = useState([]);
  const canViewSubdivision = isAccountantRole(userRole);

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
    ...(canViewSubdivision
      ? [
          {
            type: 'text',
            name: 'subdivision',
            label: t('labels.subdivision'),
            readOnly: true,
          },
        ]
      : []),
    {
      type: 'select',
      name: 'status',
      label: t('labels.status'),
      options: translateOptions(approveBudgetingStatus, t),
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'select',
      name: 'week',
      label: t('labels.week'),
      options: weeksOptions,
      validation: { required: t('validation.required') },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: t('labels.comment'),
      validation: { required: t('validation.required') },
      readOnly: true,
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
        title={t('forms.watchBudget')}
        fields={fields}
        defaultValues={{
          department: getDepartmentName(request),
          subdivision: getSubdivisionName(request),
          status: request.status?.id,
          comment:
            userRole === 4
              ? request.finance_comment || ''
              : userRole === 1
              ? request.ceo_comment || ''
              : userRole === 2
              ? request.applicant_comment || ''
              : '',
          week: resolvedRequestWeekValue || '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingWatchForm;
