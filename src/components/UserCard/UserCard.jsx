import { useState } from 'react';
import Icon from '../Icon/Icon';
import ModalWindow from '../ModalWindow/ModalWindow';
import style from './UserCard.module.css';
import { Link } from 'react-router-dom';
import UserEditForm from '../Forms/UserEditForm/UserEditForm';
import TransferUserDataForm from '../Forms/TransferUserDataForm/TransferUserDataForm';
import { Notify } from 'notiflix';
import { UserRole } from '../../helpers/enums';
import { useTranslation } from 'react-i18next';

const UserCard = ({ user, onRefresh, userRole }) => {
  const { t } = useTranslation();
  const [isModalOpen, setModalIsOpen] = useState(false);

  const [transferTarget, setTransferTarget] = useState(null);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    if (transferTarget) {
      onRefresh();
    }
    setModalIsOpen(false);
    setTransferTarget(null);
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
      Notify.warning(t('notifications.cannotEditUser'));
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
      <ModalWindow
        isModalOpen={isModalOpen}
        onCloseModal={closeModal}
        customStyles={transferTarget ? { width: '480px' } : {}}
        // Перенесення заявок/бюджетів — свідома дія з наслідками, тож тут
        // навмисно немає "тихого" закриття (клік поза модалкою/Esc/хрестик) —
        // лише явні кнопки "Пропустити"/"Перенести", щоб адмін не закрив
        // модалку випадково, не зрозумівши, що нічого не передалось.
        closeOnDismiss={!transferTarget}
        closeBtn={!transferTarget}
      >
        {transferTarget ? (
          <TransferUserDataForm
            fromUser={transferTarget}
            closeModal={closeModal}
          />
        ) : (
          <UserEditForm
            user={user}
            closeModal={closeModal}
            onRefresh={onRefresh}
            userRole={userRole}
            onDeactivated={setTransferTarget}
          />
        )}
      </ModalWindow>
    </>
  );
};

export default UserCard;
