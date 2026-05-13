import dayjs from 'dayjs';
import {
  changeBuhStatus,
  changeFinStatus,
} from '../../../helpers/axios/requests';
import { approveStatusBuh, approveStatusFin } from '../../../helpers/status';
import { FinancialRequestStatus, UserRole } from '../../../helpers/enums';
import Form from '../../Form/Form';
import style from './ApproveRequestForm.module.css';
import { Notify } from 'notiflix';
import { isDeletedRecord } from '../../../helpers/softDelete';
import { useTranslation } from 'react-i18next';
import { translateOptions } from '../../../helpers/i18nOptions';

const ApproveRequestForm = ({ request, closeModal, onRefresh, userRole }) => {
  const { t } = useTranslation();
  const isDeleted = isDeletedRecord(request);

  const fields = [
    {
      type: 'select',
      name: 'status',
      label: t('labels.status'),
      options: translateOptions(
        userRole === UserRole.FINANCE
          ? approveStatusFin
          : userRole === UserRole.ACCOUNTANT
          ? approveStatusBuh
          : [],
        t
      ),
      validation: { required: t('validation.required') },
      readOnly: isDeleted,
    },
    {
      type: 'date',
      name: 'payment_date_await',
      label: t('labels.paymentDeadline'),
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
        title={t('forms.approveRequests')}
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          if (isDeleted) {
            Notify.warning(t('notifications.deletedRequestCannotChange'));
            return;
          }
          try {
            const formData = new FormData();
            const backendFieldName =
              userRole === UserRole.FINANCE
                ? 'finance_status'
                : userRole === UserRole.ACCOUNTANT
                ? 'buh_status'
                : 'status';

            formData.append(backendFieldName, data.status);
            formData.append('id', request.id);
            formData.append('comment', data.comment?.trim() || '');
            formData.append('payment_date_await', data.payment_date_await);

            if (userRole === UserRole.FINANCE)
              await changeFinStatus(formData);
            if (userRole === UserRole.ACCOUNTANT)
              await changeBuhStatus(formData);
            onRefresh();
            closeModal();
            Notify.success(t('notifications.requestStatusChanged'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          status:
            userRole === UserRole.FINANCE
              ? FinancialRequestStatus.SENT_TO_PAYMENT
              : userRole === UserRole.ACCOUNTANT
              ? FinancialRequestStatus.ACCOUNTANT_PAID
              : '',
          comment: '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
        }}
      />
    </div>
  );
};

export default ApproveRequestForm;
