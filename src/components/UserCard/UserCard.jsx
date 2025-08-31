import { useState } from 'react';
import Icon from '../Icon/Icon';
import ModalWindow from '../ModalWindow/ModalWindow';
import style from './UserCard.module.css';
import { Link } from 'react-router-dom';
import UserEditForm from '../Forms/UserEditForm/UserEditForm';

const UserCard = ({ user, onRefresh }) => {
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
        return `/`;
      case 2:
        return `/`;
      case 3:
        return `/`;
      case 4:
        return `/`;
      case 5:
        return `/`;
      default:
        return `/`;
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
        <button onClick={openModal} className={style.userBtn}>
          <Icon id="edit" className={style.userIcon} />
        </button>
      </div>
      <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
        <UserEditForm
          user={user}
          closeModal={closeModal}
          onRefresh={onRefresh}
        />
      </ModalWindow>
    </>
  );
};

export default UserCard;
