import {
  changeBuhStatus,
  changeFinStatus,
} from '../../../helpers/axios/statuses';
import { approveStatusBuh, approveStatusFin } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveRequestForm.module.css';
import { Notify } from 'notiflix';

const ApproveRequestForm = ({ request, closeModal, onRefresh, userRole }) => {
  console.log(request);

  const fields = [
    {
      type: 'select',
      name: 'finance_status',
      label: 'Статус',
      options:
        userRole === 4
          ? approveStatusFin
          : userRole === 5
          ? approveStatusBuh
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
      <Form
        title="Погодження заявки"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
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

            if (userRole === 4) await changeFinStatus(formData);
            if (userRole === 5) await changeBuhStatus(formData);
            onRefresh();
            closeModal();
            Notify.success('Статус заявки змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          finance_status: userRole === 4 ? '10' : userRole === 5 ? '18' : '',
          comment: request.comment || '',
        }}
      />
    </div>
  );
};

export default ApproveRequestForm;
