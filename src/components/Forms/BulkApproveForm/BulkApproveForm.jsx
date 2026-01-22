import Form from '../../Form/Form';
import style from './BulkApproveForm.module.css';

const BulkApproveForm = ({
  title,
  selectedCount,
  statusOptions,
  onSubmit,
}) => {
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      options: statusOptions || [],
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
      <p className={style.countText}>
        Обрано рядків: <span>{selectedCount}</span>
      </p>
      <Form
        title={title}
        fields={fields}
        buttons={buttons}
        onSubmit={onSubmit}
        defaultValues={{
          status: statusOptions?.[0]?.value ?? '',
          comment: '',
        }}
      />
    </div>
  );
};

export default BulkApproveForm;
