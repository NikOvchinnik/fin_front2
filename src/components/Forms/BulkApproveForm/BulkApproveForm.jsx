import Form from '../../Form/Form';
import style from './BulkApproveForm.module.css';
import { useTranslation } from 'react-i18next';

const BulkApproveForm = ({
  title,
  selectedCount,
  statusOptions,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const fields = [
    {
      type: 'select',
      name: 'status',
      label: t('labels.status'),
      options: statusOptions || [],
      validation: { required: t('validation.required') },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: t('labels.comment'),
      validation: { required: t('validation.required') },
    },
  ];

  const buttons = [
    {
      label: t('actions.send'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      <p className={style.countText}>
        {t('forms.selectedRows', { count: selectedCount })}
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
