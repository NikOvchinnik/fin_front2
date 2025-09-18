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

const schemaYup = Yup.object().shape({
  password: Yup.string().required('*вкажіть новий пароль'),
  confirmPassword: Yup.string().required('*підтвердіть пароль'),
});

const defaultValues = {
  password: '',
  confirmPassword: '',
};

const ResetPasswordPage = () => {
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
    resolver: yupResolver(schemaYup),
  });

  const onSubmit = async data => {
    if (!token) {
      Notify.failure('Токен не знайдено...');
      return;
    }

    if (data.password !== data.confirmPassword) {
      Notify.failure('Паролі не співпадають');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('new_password', data.password);
      await resetPassword(formData);
      Notify.success('Пароль успішно змінено!');
      navigate('/');
    } catch (err) {
      Notify.failure('Сталася помилка при зміні пароля');
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
            <p className={style.error}>Недійсний або відсутній токен.</p>
          ) : (
            <div className={style.loginContent}>
              <NavLink to="/">
                <img src="/logo_black.svg" alt="logo" className={style.logo} />
              </NavLink>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className={style.formContainer}
              >
                <h2 className={style.formTitle}>Скидання паролю</h2>
                <div className={style.inputContainer}>
                  <label className={style.formLabel}>
                    <input
                      className={style.formInput}
                      type={isPasswordVisible ? 'text' : 'password'}
                      placeholder="Пароль"
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
                      placeholder="Підтвердіть пароль"
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
                  Змінити пароль
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
