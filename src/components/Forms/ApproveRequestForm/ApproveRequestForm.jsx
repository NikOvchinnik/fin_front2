import { changeFinStatus } from '../../../helpers/axios/statuses';
import { statusSelector } from '../../../helpers/status';
import Form from '../../Form/Form';
import style from './ApproveRequestForm.module.css';
import { Notify } from 'notiflix';

const ApproveRequestForm = ({ request, closeModal, onRefresh }) => {
  console.log(request);
  

  const fields = [
    {
      type: 'select',
      name: 'finance_status',
      label: 'Статус',
      options: statusSelector,
      validation: { required: 'This field is required' },
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Коментар',
    },
  ];

  const buttons = [
    {
      label: 'Save',
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

            // await changeFinStatus(formData);
            onRefresh();
            closeModal();
            Notify.success('Статус заявки змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          finance_status: '',
          comment: '',
        }}
      />
    </div>
  );
};

export default ApproveRequestForm;
