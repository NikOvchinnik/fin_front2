import { useEffect, useState } from 'react';
import { postUser } from '../../../helpers/axios/users';
import Form from '../../Form/Form';
import style from './UserNewForm.module.css';
import { Notify } from 'notiflix';
import { getRoles } from '../../../helpers/axios/roles';
import { getDepartments } from '../../../helpers/axios/departments';
import { getProjects } from '../../../helpers/axios/projects';
import { UserRole } from '../../../helpers/enums';
import { useTranslation } from 'react-i18next';

const UserNewForm = ({ closeModal, onRefresh, userRole }) => {
  const { t } = useTranslation();
  const [rolesOptions, setRolesOptions] = useState([]);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [projectsOptions, setProjectsOptions] = useState([]);
  const canManageUserRoles = [UserRole.CEO, UserRole.FINANCE].includes(
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

        const projects = await getProjects();
        const projectSelector = projects.map(p => ({
          value: p.id,
          label: p.name,
        }));
        setProjectsOptions(projectSelector);
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchData();
  }, []);

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
      disabled: !canManageUserRoles,
    },
    {
      type: 'select',
      name: 'project_id',
      label: t('labels.department'),
      options: projectsOptions,
    },
    {
      type: 'select',
      name: 'department_id',
      label: t('nav.departments'),
      options: departmentsOptions,
    },
  ];

  const buttons = [
    {
      label: t('actions.save'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.newContainer}>
      <Form
        title={t('forms.newUser')}
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

            await postUser(formData);
            onRefresh();
            closeModal();
            Notify.success(t('notifications.userCreated'));
          } catch (error) {
            Notify.failure(t('notifications.genericError'));
            console.error('Error: ', error);
          }
        }}
        defaultValues={{
          first_name: '',
          last_name: '',
          email: '',
          slack_id: '',
          role_id: 3,
          department_id: 1,
          project_id: 6,
        }}
      />
    </div>
  );
};

export default UserNewForm;
