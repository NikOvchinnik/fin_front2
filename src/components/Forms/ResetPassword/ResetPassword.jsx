import { forgotPassword } from '../../../helpers/axios/users';
import Form from '../../Form/Form';
import style from './ResetPassword.module.css';
import { Notify } from 'notiflix';

const ResetPassword = ({ closeModal }) => {
  const fields = [
    {
      type: 'text',
      name: 'email',
      label: 'Email',
      validation: { required: 'This field is required' },
    },
  ];

  const buttons = [
    {
      label: 'Скинути пароль',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.newContainer}>
      <Form
        title="Введіть вашу електронну пошту — ми надішлемо вам лист для скидання паролю"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            formData.append('email', data.email.trim());
            await forgotPassword(formData);
            closeModal();
            Notify.success('Листа надіслано на вашу пошту!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          email: '',
        }}
      />
    </div>
  );
};

export default ResetPassword;
