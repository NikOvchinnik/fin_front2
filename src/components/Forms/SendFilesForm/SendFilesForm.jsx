import { useEffect, useState } from 'react';
import Form from '../../Form/Form';
import style from './SendFilesForm.module.css';
import { Notify } from 'notiflix';

import {
  deleteLink,
  sendFilesRequest,
} from '../../../helpers/axios/requests';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import ModalWindow from '../../ModalWindow/ModalWindow';
import Icon from '../../Icon/Icon';
import Loader from '../../Loader/Loader';
import { approveFilesBuh, approveFilesFin } from '../../../helpers/status';

const SendFilesForm = ({
  request,
  closeModal,
  onRefresh,
  formType,
  userRole,
}) => {
  const [isModalLinkOpen, setModalLinkOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(request);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRequestData(request);
      } catch (err) {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [request]);

  const closeModalLink = () => {
    setModalLinkOpen(false);
  };

  const handleDeleteLink = async () => {
    try {
      await deleteLink(selectedLink.id);
      closeModalLink();
      setRequestData(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== selectedLink.id),
      }));
      setSelectedLink(null);
      onRefresh();
      Notify.success('Інформацію змінено!');
    } catch (error) {
      Notify.failure('Сталася помилка, спробуйте ще раз');
      console.error('Error: ', error);
    }
  };

  const fields = [
    ...(formType === 'requests'
      ? [
          {
            type: 'select',
            name: 'status_id',
            label: 'Статус',
            options:
              userRole === 4
                ? approveFilesFin
                : userRole === 5
                ? approveFilesBuh
                : [],
            validation: { required: 'This field is required' },
          },
        ]
      : []),
    {
      type: 'file',
      name: 'files',
      label: 'Файли',
    },
  ];

  const buttons = [
    {
      label: 'Зберегти',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className={style.editContainer}>
          {requestData.files?.length > 0 && (
            <ul className={style.linkContainer}>
              {requestData.files.map((file, index) => (
                <li key={file.id}>
                  <a href={file.file_url} target="_blank" rel="noreferrer">
                    Link {index + 1}
                  </a>
                  <button
                    className={style.deleteBtn}
                    onClick={() => {
                      setSelectedLink(file);
                      setModalLinkOpen(true);
                    }}
                  >
                    <Icon id="trash" className={style.deleteIcon} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Form
            title="Додати документи"
            fields={fields}
            buttons={buttons}
            onSubmit={async data => {
              try {
                setLoading(true);
                const formData = new FormData();

                Object.entries(data).forEach(([key, value]) => {
                  if (key === 'files' && value) {
                    if (value instanceof FileList || Array.isArray(value)) {
                      Array.from(value).forEach(file =>
                        formData.append('files', file)
                      );
                    }
                  } else {
                    if (typeof value === 'string') value = value.trim();
                    formData.append(key, value ?? '');
                  }
                });

                formData.append('id', request.id);

                await sendFilesRequest(formData);
                onRefresh();
                closeModal();
                Notify.success('Інформацію змінено!');
              } catch (error) {
                Notify.failure('Сталася помилка, спробуйте ще раз');
                console.error('Error: ', error);
              } finally {
                setLoading(false);
              }
            }}
            defaultValues={{
              status_id: request.status_id || '',
              files: [],
            }}
          />
          <ModalWindow
            isModalOpen={isModalLinkOpen}
            onCloseModal={closeModalLink}
          >
            <ConfirmModal
              title="Видалити файл"
              message={`Ви впевнені, що хочете видалити файл ${selectedLink?.file_url}?`}
              onConfirm={handleDeleteLink}
              onClose={closeModalLink}
            />
          </ModalWindow>
        </div>
      )}
    </>
  );
};

export default SendFilesForm;
