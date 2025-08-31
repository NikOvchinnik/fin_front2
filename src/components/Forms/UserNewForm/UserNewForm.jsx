import { useEffect, useState } from 'react';
import { postUser } from '../../../helpers/axios/users';
import Form from '../../Form/Form';
import style from './UserNewForm.module.css';
import { Notify } from 'notiflix';
import { getRoles } from '../../../helpers/axios/roles';
import { getDepartments } from '../../../helpers/axios/departments';
import { getUnits } from '../../../helpers/axios/units';

const UserNewForm = ({ closeModal, onRefresh }) => {
  const [rolesOptions, setRolesOptions] = useState([]);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [unitsOptions, setUnitsOptions] = useState([]);

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
      label: 'Save new user',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.newContainer}>
      <Form
        title="New user"
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
            Notify.success('Нового юзера створено!');
          } catch (error) {
            Notify.failure('Сталася помилка, спробуйте ще раз');
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
          unit_id: 6,
        }}
      />
    </div>
  );
};

export default UserNewForm;
