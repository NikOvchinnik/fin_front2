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
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { UserRole } from '../../../helpers/enums';
import { useTranslation } from 'react-i18next';

const UserEditForm = ({ user, closeModal, onRefresh, userRole }) => {
  const { t } = useTranslation();
  const [rolesOptions, setRolesOptions] = useState([]);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const [isModalConfirmOpen, setModalConfirmOpen] = useState(false);
  const canManageUserRole = [UserRole.CEO, UserRole.FINANCE].includes(
    Number(userRole)
  );
  const canDeleteUser = [UserRole.CEO, UserRole.FINANCE].includes(
    Number(userRole)
  );

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
        setUnitOptions(unitSelector);

        try {
          const subdivisions = await getSubdivisions();
          const subdivisionSelector = subdivisions.map(s => ({
            value: s.id,
            label: s.name,
          }));
          setSubdivisionOptions(subdivisionSelector);
        } catch {
          setSubdivisionOptions([]);
        }
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchData();
  }, [t]);

  const closeModalConfirm = () => {
    setModalConfirmOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteUser(user.user_id);
      setModalConfirmOpen(false);
      onRefresh();
      closeModal();
      Notify.success(t('notifications.userDeleted'));
    } catch (error) {
      Notify.failure(t('notifications.genericError'));
      console.error('Error: ', error);
    }
  };

  const fields = [
    {
      type: 'text',
      name: 'first_name',
      label: t('user.firstName'),
      validation: { required: t('validation.required') },
    },
    {
      type: 'text',
      name: 'last_name',
      label: t('user.lastName'),
      validation: { required: t('validation.required') },
    },
    {
      type: 'text',
      name: 'email',
      label: 'Email',
      validation: { required: t('validation.required') },
    },
    {
      type: 'text',
      name: 'slack_id',
      label: 'Slack ID',
    },
    {
      type: 'select',
      name: 'role_id',
      label: t('user.role'),
      options: rolesOptions,
      validation: { required: t('validation.required') },
      disabled: !canManageUserRole,
    },
    {
      type: 'select',
      name: 'unit_id',
      label: t('labels.unit'),
      options: unitOptions,
    },
    {
      type: 'select',
      name: 'department_id',
      label: t('nav.departments'),
      options: departmentsOptions,
    },
    {
      type: 'select',
      name: 'subdivision_id',
      label: t('labels.subdivision'),
      options: subdivisionOptions,
    },
  ];

  const buttons = [
    ...(canDeleteUser
      ? [
          {
            label: t('actions.delete'),
            className: 'deleteBtn',
            onClick: () => setModalConfirmOpen(true),
          },
        ]
      : []),
    {
      label: t('actions.save'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.editContainer}>
      <Form
        title={t('forms.editUser')}
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
            Notify.success(t('notifications.infoChanged'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
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
          subdivision_id: user.user_subdivision_id || '',
        }}
      />
      <ModalWindow
        isModalOpen={isModalConfirmOpen}
        onCloseModal={closeModalConfirm}
      >
        <ConfirmModal
          title={t('modals.deleteUserTitle')}
          message={t('modals.deleteUserMessage', {
            name: `${user.user_first_name} ${user.user_last_name}`,
          })}
          onConfirm={handleDelete}
          onClose={closeModalConfirm}
        />
      </ModalWindow>
    </div>
  );
};

export default UserEditForm;
