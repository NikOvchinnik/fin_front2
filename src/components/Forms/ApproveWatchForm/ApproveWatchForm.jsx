import dayjs from 'dayjs';
import { approveStatus } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveWatchForm.module.css';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';

const ApproveWatchForm = ({ request }) => {
  const { t } = useTranslation();
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: t('fields.status'),
      options: translateOptions(approveStatus, t),
      readOnly: true,
      validation: { required: 'This field is required' },
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: t('fields.paymentDeadline'),
      validation: { required: 'This field is required' },
      readOnly: true,
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      validation: { required: 'This field is required' },
      readOnly: true,
    },
  ];

  return (
    <div className={style.editContainer}>
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
        title="Перегляд заявки"
        fields={fields}
        defaultValues={{
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
