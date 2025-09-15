import { approveBudgetingStatus } from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingWatchForm.module.css';

const ApproveBudgetingWatchForm = ({
  request,
  closeModal,
  onRefresh,
  userRole,
}) => {
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      options: approveBudgetingStatus,
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
        title="Перегляд заявки"
        fields={fields}
        defaultValues={{
          status: request.status?.id,
          comment:
            userRole === 4
              ? request.finance_comment || ''
              : userRole === 1
              ? request.ceo_comment || ''
              : userRole === 2
              ? request.applicant_comment || ''
              : '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingWatchForm;
