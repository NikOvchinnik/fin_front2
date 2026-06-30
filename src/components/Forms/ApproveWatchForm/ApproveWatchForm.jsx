import dayjs from 'dayjs';
import { approveStatus } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveWatchForm.module.css';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/auth/selectors';
import {
  getDepartmentName,
  getSubdivisionName,
} from '../../../helpers/departmentField';
import { isFinanceRole } from '../../../helpers/roles';

const ApproveWatchForm = ({ request }) => {
  const { t } = useTranslation();
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isFinanceRole(userRole);
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
      options: translateOptions(approveStatus, t),
      readOnly: true,
      validation: { required: t('validation.required') },
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: t('labels.paymentDeadline'),
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
        {request.ceo_comment && (
          <li className={style.commentFinance}>
            {t('labels.ceoComment')}: {request.ceo_comment}
          </li>
        )}
      </ul>
      <Form
        title={t('forms.watchRequest')}
        fields={fields}
        defaultValues={{
          department: getDepartmentName(request),
          subdivision: getSubdivisionName(request),
          status: request.status?.id || '',
          comment: '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
        }}
      />
    </div>
  );
};

export default ApproveWatchForm;
