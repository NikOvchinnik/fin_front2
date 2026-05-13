import { forgotPassword } from '../../../helpers/axios/users';
import Form from '../../Form/Form';
import style from './ResetPassword.module.css';
import { Notify } from 'notiflix';
import { useTranslation } from 'react-i18next';

const ResetPassword = ({ closeModal }) => {
  const { t } = useTranslation();
  const fields = [
    {
      type: 'text',
      name: 'email',
      label: 'Email',
      validation: { required: t('validation.required') },
    },
  ];

  const buttons = [
    {
      label: t('auth.resetPassword'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.newContainer}>
      <Form
        title={t('auth.resetPasswordEmailTitle')}
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            formData.append('email', data.email.trim());
            await forgotPassword(formData);
            closeModal();
            Notify.success(t('notifications.emailSent'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
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
