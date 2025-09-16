import style from './LoginForm.module.css';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { NavLink } from 'react-router-dom';
import Icon from '../Icon/Icon';
import { useState } from 'react';
import { Notify } from 'notiflix/build/notiflix-notify-aio';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/auth/slice';
import { loginUser } from '../../helpers/axios/users';
import ResetPassword from '../Forms/ResetPassword/ResetPassword';
import ModalWindow from '../../components/ModalWindow/ModalWindow';

const schemaYup = Yup.object().shape({
  login: Yup.string().required('*вкажіть ваш email'),
  password: Yup.string().required('*вкажіть ваш пароль'),
});

const defaultValues = {
  login: '',
  password: '',
};

const LoginForm = () => {
  const dispatch = useDispatch();
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const [isModalOpen, setModalIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues,
    resolver: yupResolver(schemaYup),
  });

  const onSubmit = async data => {
    try {
      const formData = new FormData();
      formData.append('email', data.login);
      formData.append('password', data.password);
      const res = await loginUser(formData);
      dispatch(loginSuccess(res));
      setShowEmailTooltip(false);
      setPasswordVisible(false);
    } catch (err) {
      if (err.response?.status === 401) {
        Notify.failure('Невірний логін або пароль');
      } else {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }
    }
  };

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div className={style.loginContainer}>
      <div className={style.loginContent}>
        <NavLink to="/">
          <img src="/logo.svg" alt="logo" className={style.logo} />
        </NavLink>
        <form onSubmit={handleSubmit(onSubmit)} className={style.formContainer}>
          <h2 className={style.formTitle}>Вхід</h2>
          <div className={style.inputContainer}>
            <label className={style.formLabel}>
              <input
                className={style.formInput}
                type="text"
                placeholder="Вкажіть email"
                {...register('login')}
              />
              <button
                onClick={() => setShowEmailTooltip(!showEmailTooltip)}
                type="button"
                className={style.formBtnIcon}
              >
                <Icon id="info" className={style.formIcon} />
              </button>
            </label>
            {showEmailTooltip && (
              <p className={style.tooltipText}>
                Введіть вашу email адресу (наприклад: example@gmail.com)
              </p>
            )}
            {errors.login && (
              <p className={style.errorText}>{errors.login.message}</p>
            )}
          </div>
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
          <button type="submit" className={style.formBtnSubmit}>
            Увійти
          </button>
        </form>
        <button
          onClick={openModal}
          type="button"
          className={style.formBtnReset}
        >
          Не пам'ятаю пароль
        </button>
      </div>
      <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
        <ResetPassword closeModal={closeModal} />
      </ModalWindow>
    </div>
  );
};

export default LoginForm;
