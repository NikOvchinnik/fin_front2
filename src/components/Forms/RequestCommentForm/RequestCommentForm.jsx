import Form from '../../Form/Form';
import style from './RequestCommentForm.module.css';
import { Notify } from 'notiflix';

const RequestCommentForm = ({ user, closeModal, onRefresh }) => {
  const fields = [
    {
      type: 'select',
      name: 'role_id',
      label: 'Роль',
      options: rolesOptions,
      validation: { required: 'This field is required' },
    },
    {
      type: 'text',
      name: 'first_name',
      label: 'Ім’я',
      validation: { required: 'This field is required' },
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
        title="Edit user"
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

            await patchUser(user.user_id, formData);
            onRefresh();
            closeModal();
            Notify.success('Інформацію змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          first_name: user.user_first_name || '',
          last_name: user.user_last_name || '',
        }}
      />
    </div>
  );
};

export default RequestCommentForm;
