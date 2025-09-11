import {
  approveStatus,
} from '../../../helpers/status';
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
        }}
      />
    </div>
  );
};

export default ApproveWatchForm;
