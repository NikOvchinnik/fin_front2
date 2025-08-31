import { useState, useEffect, useCallback, useMemo } from 'react';
import DocTitle from '../../components/DocTitle/DocTitle';
import style from './UsersPage.module.css';
import { Notify } from 'notiflix';
import Loader from '../../components/Loader/Loader';
import { getUsers } from '../../helpers/axios/users';
import Icon from '../../components/Icon/Icon';
import Table from '../../components/Table/Table';
import UserCard from '../../components/UserCard/UserCard';
import ModalWindow from '../../components/ModalWindow/ModalWindow';
import UserNewForm from '../../components/Forms/UserNewForm/UserNewForm';
import { getRoles } from '../../helpers/axios/roles';

const UsersPage = () => {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalIsOpen] = useState(false);
  const [dataUsers, setDataUsers] = useState([]);
  const [rolesMap, setRolesMap] = useState({});
  const [sortOrder, setSortOrder] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const users = await getUsers();
      setDataUsers(users);

      const roles = await getRoles();

      const roleMap = roles.reduce((acc, r) => {
        acc[r.name] = { id: r.id, label: r.name };
        return acc;
      }, {});
      setRolesMap(roleMap);

      setSortOrder(
        roles.reduce((acc, r) => {
          acc[r.name] = false;
          return acc;
        }, {})
      );
    } catch (err) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const sortByName = (arr, isAsc) =>
    [...arr].sort((a, b) =>
      isAsc
        ? a.user_last_name.localeCompare(b.user_last_name)
        : b.user_last_name.localeCompare(a.user_last_name)
    );

  const usersByRole = useMemo(() => {
    return Object.entries(rolesMap).reduce((acc, [key, { id }]) => {
      acc[key] = sortByName(
        dataUsers.filter(user => user.user_role_id === id),
        sortOrder[key]
      );
      return acc;
    }, {});
  }, [dataUsers, sortOrder, rolesMap]);

  const maxLength = Math.max(...Object.values(usersByRole).map(u => u.length));

  const filteredUsers = useMemo(() => {
    return Array.from({ length: maxLength }).map((_, i) => {
      return Object.keys(rolesMap).reduce((row, roleKey) => {
        const user = usersByRole[roleKey][i];
        row[roleKey] = user ? (
          <UserCard
            key={`${roleKey}-${user.id}`}
            user={user}
            onRefresh={fetchData}
          />
        ) : null;
        return row;
      }, {});
    });
  }, [maxLength, usersByRole, fetchData, rolesMap]);

  const columns = Object.entries(rolesMap).map(([key, { label }]) => ({
    accessorKey: key,
    header: (
      <div className={style.sortContainer}>
        <p>{label}</p>
        <button
          className={style.btnContainer}
          onClick={() => setSortOrder(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <Icon id="sort" className={style.sortIcon} />
        </button>
      </div>
    ),
  }));

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <section className={style.mainContainer}>
          <DocTitle>Users</DocTitle>
          <button onClick={openModal} className={style.addUserBtn}>
            Add new user <span>+</span>
          </button>
          <Table
            data={filteredUsers}
            columns={columns}
            styles="userTable"
            fixedFirstColumn={false}
            visibleColumns={5}
            visibleColumnsMobile={2}
          />
          <ModalWindow isModalOpen={isModalOpen} onCloseModal={closeModal}>
            <UserNewForm closeModal={closeModal} onRefresh={fetchData} />
          </ModalWindow>
        </section>
      )}
    </>
  );
};

export default UsersPage;
