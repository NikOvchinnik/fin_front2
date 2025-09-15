import { updateBudgetingStatus } from '../../../helpers/axios/budgeting';
import {
  approveBudgetingStatusCEO,
  approveBudgetingStatusFin,
  approveBudgetingStatusHd,
} from '../../../helpers/budgetingStatuses';
import Form from '../../Form/Form';
import style from './ApproveBudgetingForm.module.css';
import { Notify } from 'notiflix';

const ApproveBudgetingForm = ({ request, closeModal, onRefresh, userRole }) => {
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      options:
        userRole === 4
          ? approveBudgetingStatusFin
          : userRole === 1
          ? approveBudgetingStatusCEO
          : userRole === 2
          ? approveBudgetingStatusHd
          : [],
      validation: { required: 'This field is required' },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
      validation: { required: 'This field is required' },
    },
  ];

  const buttons = [
    {
      label: 'Відправити',
      className: 'submitBtn',
      type: 'submit',
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
        title="Погодження бюджету"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            formData.append('status_id', data.status);
            formData.append('comment', data.comment?.trim() || '');

            await updateBudgetingStatus(request.id, formData);
            onRefresh();
            closeModal();
            Notify.success('Статус бюджету змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          status:
            userRole === 4 ? 7 : userRole === 1 ? 9 : userRole === 2 ? 5 : '',
          comment: '',
        }}
      />
    </div>
  );
};

export default ApproveBudgetingForm;
