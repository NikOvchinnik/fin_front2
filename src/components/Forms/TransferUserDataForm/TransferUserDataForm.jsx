import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './TransferUserDataForm.module.css';
import { Notify } from 'notiflix';
import { getUsers, transferUserData } from '../../../helpers/axios/users';
import { useTranslation } from 'react-i18next';

const TransferUserDataForm = ({ fromUser, closeModal }) => {
  const { t } = useTranslation();
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const users = await getUsers();
        setUserOptions(
          users
            .filter(u => u.user_id !== fromUser.user_id)
            .map(u => ({
              value: u.user_id,
              label: `${u.user_last_name} ${u.user_first_name}`,
            }))
        );
      } catch {
        Notify.failure(t('notifications.genericError'));
      }
    };
    fetchData();
  }, [fromUser.user_id, t]);

  const fields = [
    {
      type: 'checkbox',
      name: 'transfer_requests',
      label: t('userTransfer.requests'),
    },
    {
      type: 'autocomplete-select',
      name: 'to_user_id_requests',
      label: t('userTransfer.newResponsibleForRequests'),
      options: userOptions,
    },
    {
      type: 'checkbox',
      name: 'transfer_budgets',
      label: t('userTransfer.budgets'),
    },
    {
      type: 'autocomplete-select',
      name: 'to_user_id_budgets',
      label: t('userTransfer.newResponsibleForBudgets'),
      options: userOptions,
    },
  ];

  const handleSkip = () => {
    closeModal();
  };

  const buttons = [
    {
      label: t('userTransfer.skip'),
      className: 'editBtn',
      onClick: handleSkip,
    },
    {
      label: t('actions.transfer'),
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <div className={style.container}>
      <Form
        title={`${t('forms.transferUserData')} — ${fromUser.user_last_name} ${fromUser.user_first_name}`}
        fields={fields}
        buttons={buttons}
        onSubmit={async data => {
          const wantsRequests = !!data.transfer_requests;
          const wantsBudgets = !!data.transfer_budgets;

          if (!wantsRequests && !wantsBudgets) {
            Notify.warning(t('userTransfer.selectAtLeastOne'));
            return;
          }
          if (wantsRequests && !data.to_user_id_requests) {
            Notify.warning(t('userTransfer.selectUserForRequests'));
            return;
          }
          if (wantsBudgets && !data.to_user_id_budgets) {
            Notify.warning(t('userTransfer.selectUserForBudgets'));
            return;
          }

          // Два незалежні запити (не один спільний) — щоб заявки й бюджети
          // можна було передати різним людям; бекенд це вже підтримує
          // (transfer_requests/transfer_budgets — незалежні прапорці).
          const runTransfer = async (toUserId, requests, budgets) => {
            const formData = new FormData();
            formData.append('from_user_id', fromUser.user_id);
            formData.append('to_user_id', toUserId);
            formData.append('transfer_requests', requests);
            formData.append('transfer_budgets', budgets);
            return transferUserData(formData);
          };

          let requestsResult = null;
          let budgetsResult = null;
          let requestsFailed = false;
          let budgetsFailed = false;

          if (wantsRequests) {
            try {
              requestsResult = await runTransfer(data.to_user_id_requests, true, false);
            } catch (error) {
              requestsFailed = true;
              console.error('Transfer requests error: ', error);
            }
          }

          if (wantsBudgets) {
            try {
              budgetsResult = await runTransfer(data.to_user_id_budgets, false, true);
            } catch (error) {
              budgetsFailed = true;
              console.error('Transfer budgets error: ', error);
            }
          }

          if (requestsFailed || budgetsFailed) {
            const parts = [];
            if (wantsRequests) {
              parts.push(
                requestsFailed
                  ? t('userTransfer.requestsFailed')
                  : t('userTransfer.requestsDone', {
                      count: requestsResult?.request_count ?? 0,
                    })
              );
            }
            if (wantsBudgets) {
              parts.push(
                budgetsFailed
                  ? t('userTransfer.budgetsFailed')
                  : t('userTransfer.budgetsDone', {
                      count: budgetsResult?.budget_count ?? 0,
                    })
              );
            }
            Notify.warning(parts.join(' '));
            // Модалку лишаємо відкритою — щоб адмін побачив, що саме не
            // вдалось, і міг спробувати ще раз (чекбокси/вибір лишаються).
            return;
          }

          Notify.success(
            t('userTransfer.success', {
              requests: requestsResult?.request_count ?? 0,
              budgets: budgetsResult?.budget_count ?? 0,
            })
          );
          closeModal();
        }}
        defaultValues={{
          transfer_requests: false,
          to_user_id_requests: '',
          transfer_budgets: false,
          to_user_id_budgets: '',
        }}
      />
    </div>
  );
};

export default TransferUserDataForm;
