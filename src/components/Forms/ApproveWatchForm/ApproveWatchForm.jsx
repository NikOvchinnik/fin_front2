import dayjs from 'dayjs';
import { approveStatus } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveWatchForm.module.css';

const ApproveWatchForm = ({ request, closeModal, onRefresh, userRole }) => {
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      options: approveStatus,
      readOnly: true,
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
      <Form
        title="Перегляд заявки"
        fields={fields}
        defaultValues={{
          status: request.status?.id || '',
          comment: request.comment || '',
          payment_date_await:
            request.payment_date_await || dayjs().format('YYYY-MM-DD'),
        }}
      />
    </div>
  );
};

export default ApproveWatchForm;
