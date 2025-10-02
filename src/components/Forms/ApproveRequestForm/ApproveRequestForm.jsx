import dayjs from 'dayjs';
import {
  changeBuhStatus,
  changeFinStatus,
} from '../../../helpers/axios/statuses';
import { approveStatusBuh, approveStatusFin } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveRequestForm.module.css';
import { Notify } from 'notiflix';

const ApproveRequestForm = ({ request, closeModal, onRefresh, userRole }) => {

  const fields = [
    {
      type: 'select',
      name: 'status',
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
      type: 'date',
      name: 'payment_date_await',
      label: 'Дата оплати',
      validation: {
        required: 'This field is required',
        validate: value => {
          if (!value) return "Дата обов'язкова";
          const selected = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selected < today) return 'Неможна обрати минулу дату';
          return true;
        },
      },
      min: dayjs().format('YYYY-MM-DD'),
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
            const backendFieldName =
              userRole === 4
                ? 'finance_status'
                : userRole === 5
                ? 'buh_status'
                : 'status';

            formData.append(backendFieldName, data.status);
            formData.append('id', request.id);
            formData.append('comment', data.comment?.trim() || '');
            formData.append('payment_date_await', data.payment_date_await);

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
          status: userRole === 4 ? '4' : userRole === 5 ? '5' : '',
          comment: request.comment || '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
        }}
      />
    </div>
  );
};

export default ApproveRequestForm;
