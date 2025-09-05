import { useState } from 'react';
import Icon from '../Icon/Icon';
import ModalWindow from '../ModalWindow/ModalWindow';
import style from './UserCard.module.css';
import { Link } from 'react-router-dom';
import UserEditForm from '../Forms/UserEditForm/UserEditForm';
import { Notify } from 'notiflix';

const UserCard = ({ user, onRefresh, userRole }) => {
  const [isModalOpen, setModalIsOpen] = useState(false);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const getUserPath = (role, id) => {
    switch (role) {
      case 1:
        return `/my_requests/${user.user_id}`;
      case 2:
        return `/my_requests/${user.user_id}`;
      case 3:
        return `/my_requests/${user.user_id}`;
      case 4:
        return `/my_requests/${user.user_id}`;
      case 5:
        return `/my_requests/${user.user_id}`;
      default:
        return `/my_requests/${user.user_id}`;
    }
  };


  const handleClick = () => {
    if (userRole === 1) {
      openModal();
    } else if (userRole === 2 && user?.user_role_id === 3) {
      openModal();
    } else {
      Notify.warning('Ви не можете редагувати користувача');
    }
  };

  return (
    <>
      <div className={style.userContainer}>
        <Link
          to={getUserPath(user.user_role_id, user.user_id)}
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
