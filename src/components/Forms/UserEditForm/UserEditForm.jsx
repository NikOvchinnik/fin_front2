import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import ModalWindow from '../../ModalWindow/ModalWindow';
import style from './UserEditForm.module.css';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import { Notify } from 'notiflix';
import { deleteUser, patchUser } from '../../../helpers/axios/users';
import { getRoles } from '../../../helpers/axios/roles';
import { getDepartments } from '../../../helpers/axios/departments';
import { getUnits } from '../../../helpers/axios/units';

const UserEditForm = ({ user, closeModal, onRefresh, userRole }) => {
  const [rolesOptions, setRolesOptions] = useState([]);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [unitsOptions, setUnitsOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const roles = await getRoles();
        const roleSelector = roles.map(r => ({
          value: r.id,
          label: r.name,
        }));
        setRolesOptions(roleSelector);

        const departments = await getDepartments();
        const departmentSelector = departments.map(d => ({
          value: d.id,
          label: d.name,
        }));
        setDepartmentsOptions(departmentSelector);

        const units = await getUnits();
        const unitSelector = units.map(u => ({
          value: u.id,
          label: u.name,
        }));
        setUnitsOptions(unitSelector);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }
    };
    fetchData();
  }, []);

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteUser(user.user_id);
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success('Юзера видалено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const fields = [
    {
      type: 'text',
      name: 'first_name',
      label: 'Ім’я',
      validation: { required: 'This field is required' },
    },
    {
      type: 'text',
      name: 'last_name',
      label: 'Прізвище',
      validation: { required: 'This field is required' },
    },
    {
      type: 'text',
      name: 'email',
      label: 'Email',
      validation: { required: 'This field is required' },
    },
    {
      type: 'text',
      name: 'slack_id',
      label: 'Slack ID',
    },
    {
      type: 'select',
      name: 'role_id',
      label: 'Роль',
      options: rolesOptions,
      validation: { required: 'This field is required' },
      disabled: userRole !== 1,
    },
    {
      type: 'select',
      name: 'department_id',
      label: 'Департамент',
      options: departmentsOptions,
    },
    {
      type: 'select',
      name: 'unit_id',
      label: 'Підрозділ',
      options: unitsOptions,
    },
  ];

  const buttons = [
    {
      label: 'Delete',
      className: 'deleteBtn',
      onClick: () => setModalConfirmOpen(true),
    },
    {
      label: 'Save',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      <Form
        title="Edit user"
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'string') {
                value = value.trim();
              }

              if (value !== null && value !== undefined && value !== '') {
                formData.append(key, value);
              } else {
                formData.append(key, '');
              }
            });

            await patchUser(user.user_id, formData);
            onRefresh();
            closeModal();
            Notify.success('Інформацію змінено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          first_name: user.user_first_name || '',
          last_name: user.user_last_name || '',
          email: user.user_email || '',
          slack_id: user.user_slack_id || '',
          role_id: user.user_role_id || '',
          department_id: user.user_department_id || '',
          unit_id: user.user_unit_id || '',
        }}
      />
      <ModalWindow
        isModalOpen={isModalConfirmOpen}
        onCloseModal={closeModalConfirm}
      >
        <ConfirmModal
          title="Delete user"
          message={`Ви впевнені, що хочете видалити юзера ${user.first_name} ${user.last_name}?`}
          onConfirm={handleDelete}
          onClose={closeModalConfirm}
        />
      </ModalWindow>
    </div>
  );
};

export default UserEditForm;
