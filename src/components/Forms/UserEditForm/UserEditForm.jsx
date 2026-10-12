import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './UserEditForm.module.css';
import { Notify } from 'notiflix';
import { patchUser } from '../../../helpers/axios/users';
import { getRoles } from '../../../helpers/axios/roles';
import { getDepartments } from '../../../helpers/axios/departments';
import { getUnits } from '../../../helpers/axios/units';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { UserRole } from '../../../helpers/enums';
import { useTranslation } from 'react-i18next';

const UserEditForm = ({ user, closeModal, onRefresh, userRole, onDeactivated }) => {
  const { t } = useTranslation();
  const [rolesOptions, setRolesOptions] = useState([]);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const canManageUserRole = [UserRole.CEO, UserRole.FINANCE].includes(
    Number(userRole)
  );
  const canManageActiveStatus = [UserRole.CEO, UserRole.FINANCE].includes(
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
    {
      type: 'switch',
      name: 'is_payroll_manager',
      label: t('user.isPayrollManager'),
      readOnly: !canManageUserRole,
    },
    {
      type: 'switch',
      name: 'is_active',
      label: t('user.isActive'),
      readOnly: !canManageActiveStatus,
    },
  ];

  const buttons = [
    ...(canManageActiveStatus
      ? [
          {
            label: t('actions.delete'),
            className: 'deleteBtn',
            // Поки не підключено — див. нотатку в коді. Деактивація тепер
            // робиться через перемикач "Активний користувач" вище.
            disabled: true,
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

            const justDeactivated =
              user.user_is_active !== false && data.is_active === false;
            if (justDeactivated && onDeactivated) {
              // onRefresh() навмисно НЕ викликаємо тут — він одразу прибрав
              // би цього користувача з поточного таба "Активні" на сторінці
              // Users, через що демонтувався б і цей компонент разом з
              // модалкою перенесення, яка має зʼявитись. Оновлюємо список
              // лише після завершення (чи пропуску) перенесення (у
              // TransferUserDataForm, яку рендерить батьківський UserCard).
              onDeactivated(user);
            } else {
              onRefresh();
              closeModal();
            }
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
          is_payroll_manager: Boolean(user.user_is_payroll_manager),
          is_active: user.user_is_active !== false,
        }}
      />
    </div>
  );
};

export default UserEditForm;
