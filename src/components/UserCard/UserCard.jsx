import { useState } from 'react';
import Icon from '../Icon/Icon';
import ModalWindow from '../ModalWindow/ModalWindow';
import style from './UserCard.module.css';
import { Link } from 'react-router-dom';
import UserEditForm from '../Forms/UserEditForm/UserEditForm';
import { Notify } from 'notiflix';
import { UserRole } from '../../helpers/enums';

const UserCard = ({ user, onRefresh, userRole }) => {
  const [isModalOpen, setModalIsOpen] = useState(false);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const getUserPath = () => '/my-requests';

  const handleClick = () => {
    if (
      [UserRole.CEO, UserRole.FINANCE].includes(Number(userRole))
    ) {
      openModal();
    } else if (
      Number(userRole) === UserRole.HEAD_OF_DEPARTMENT &&
      Number(user?.user_role_id) === UserRole.APPLICANT
    ) {
      openModal();
    } else {
      Notify.warning('Ви не можете редагувати користувача');
    }
  };

  return (
    <>
      <div className={style.userContainer}>
        <Link
          to={getUserPath()}
          className={style.userText}
        >
          {user.user_last_name} {user.user_first_name} ({user.user_id})
        </Link>
        <button onClick={handleClick} className={style.userBtn}>
          <Icon id="edit" className={style.userIcon} />
        </button>
      </div>
      <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
        <UserEditForm
          user={user}
          closeModal={closeModal}
          onRefresh={onRefresh}
          userRole={userRole}
        />
      </ModalWindow>
    </>
  );
};

export default UserCard;
