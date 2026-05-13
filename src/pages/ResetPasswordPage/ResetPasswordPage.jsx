import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import style from './ResetPasswordPage.module.css';
import { Notify } from 'notiflix';
import { resetPassword } from '../../helpers/axios/users';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { NavLink } from 'react-router-dom';
import Icon from '../../components/Icon/Icon';
import Loader from '../../components/Loader/Loader';
import DocTitle from '../../components/DocTitle/DocTitle';
import { useTranslation } from 'react-i18next';

const defaultValues = {
  password: '',
  confirmPassword: '',
};

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setPasswordConfirmVisible] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);
    setLoading(false);
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues,
    resolver: yupResolver(
      Yup.object().shape({
        password: Yup.string().required(t('validation.newPasswordRequired')),
        confirmPassword: Yup.string().required(
          t('validation.confirmPasswordRequired')
        ),
      })
    ),
  });

  const onSubmit = async data => {
    if (!token) {
      Notify.failure(t('notifications.tokenNotFound'));
      return;
    }

    if (data.password !== data.confirmPassword) {
      Notify.failure(t('notifications.passwordMismatch'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('new_password', data.password);
      await resetPassword(formData);
      Notify.success(t('notifications.passwordChanged'));
      navigate('/');
    } catch (err) {
      Notify.failure(t('notifications.passwordChangeError'));
      console.error(err);
    }
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Reset Password</DocTitle>
          {!token ? (
            <p className={style.error}>{t('auth.invalidToken')}</p>
          ) : (
            <div className={style.loginContent}>
              <NavLink to="/">
                <img src="/logo_black.svg" alt="logo" className={style.logo} />
              </NavLink>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className={style.formContainer}
              >
                <h2 className={style.formTitle}>{t('auth.resetPassword')}</h2>
                <div className={style.inputContainer}>
                  <label className={style.formLabel}>
                    <input
                      className={style.formInput}
                      type={isPasswordVisible ? 'text' : 'password'}
                      placeholder={t('auth.passwordPlaceholder')}
                      {...register('password')}
                    />
                    <button
                      onClick={() => setPasswordVisible(!isPasswordVisible)}
                      type="button"
                      className={style.formBtnIcon}
                    >
                      <Icon id="eye" className={style.formIcon} />
                    </button>
                  </label>
                  {errors.password && (
                    <p className={style.errorText}>{errors.password.message}</p>
                  )}
                </div>
                <div className={style.inputContainer}>
                  <label className={style.formLabel}>
                    <input
                      className={style.formInput}
                      type={isPasswordConfirmVisible ? 'text' : 'password'}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      {...register('confirmPassword')}
                    />
                    <button
                      onClick={() =>
                        setPasswordConfirmVisible(!isPasswordConfirmVisible)
                      }
                      type="button"
                      className={style.formBtnIcon}
                    >
                      <Icon id="eye" className={style.formIcon} />
                    </button>
                  </label>
                  {errors.confirmPassword && (
                    <p className={style.errorText}>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <button type="submit" className={style.formBtnSubmit}>
                  {t('auth.changePassword')}
                </button>
              </form>
            </div>
          )}
        </section>
      )}
    </>
  );
};

export default ResetPasswordPage;
