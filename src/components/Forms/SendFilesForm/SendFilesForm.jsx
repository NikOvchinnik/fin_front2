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
import { UserRole } from '../../../helpers/enums';

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
  const [documentLinks, setDocumentLinks] = useState(['']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRequestData(request);
        setDocumentLinks(['']);
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

  const handleAddDocumentLink = () => {
    setDocumentLinks(prev => [...prev, '']);
  };

  const handleDocumentLinkChange = (index, value) => {
    setDocumentLinks(prev =>
      prev.map((link, linkIndex) => (linkIndex === index ? value : link))
    );
  };

  const handleRemoveDocumentLink = index => {
    setDocumentLinks(prev => {
      if (prev.length === 1) {
        return [''];
      }

      return prev.filter((_, linkIndex) => linkIndex !== index);
    });
  };

  const isValidHttpUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
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
              userRole === UserRole.FINANCE
                ? approveFilesFin
                : userRole === UserRole.ACCOUNTANT
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
          <h2 className={style.modalTitle}>Додати документи</h2>
          {requestData.files?.length > 0 && (
            <div className={style.addedLinksBlock}>
              <p className={style.linksTitle}>Додані файли</p>
              {requestData.files.map((file, index) => (
                <div key={file.id} className={style.addedLinkRow}>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className={style.addedLink}
                    title={file.file_url}
                  >
                    {`Посилання: ${file.file_url}`}
                  </a>
                  <button
                    type="button"
                    className={style.removeLinkBtn}
                    onClick={() => {
                      setSelectedLink(file);
                      setModalLinkOpen(true);
                    }}
                    aria-label={`Видалити Link ${index + 1}`}
                  >
                    <Icon id="trash" className={style.removeLinkIcon} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={style.linksBlock}>
            <p className={style.linksTitle}>Додати новий файл</p>
            {documentLinks.map((link, index) => (
              <div key={index} className={style.linkInputRow}>
                <input
                  type="url"
                  className={style.linkInput}
                  placeholder="Додати посилання на файл"
                  value={link}
                  onChange={e =>
                    handleDocumentLinkChange(index, e.target.value)
                  }
                />
                <button
                  type="button"
                  className={style.removeLinkBtn}
                  onClick={() => handleRemoveDocumentLink(index)}
                  aria-label="Видалити поле лінка"
                >
                  <Icon id="trash" className={style.removeLinkIcon} />
                </button>
                {index === documentLinks.length - 1 ? (
                  <button
                    type="button"
                    className={style.addLinkBtn}
                    onClick={handleAddDocumentLink}
                  >
                    +
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <Form
            fields={fields}
            buttons={buttons}
            onSubmit={async data => {
              try {
                setLoading(true);
                const formData = new FormData();
                const files = data.files ? Array.from(data.files) : [];
                const links = documentLinks
                  .map(link => link.trim())
                  .filter(Boolean);
                const statusId = Number(
                  data.status_id ??
                    requestData?.status_id ??
                    requestData?.status?.id
                );

                const invalidLink = links.find(link => !isValidHttpUrl(link));
                if (invalidLink) {
                  Notify.failure(`Invalid document link: ${invalidLink}`);
                  return;
                }

                formData.append('id', request.id);
                if (!Number.isNaN(statusId) && statusId > 0) {
                  formData.append('status_id', statusId);
                }
                files.forEach(file => formData.append('files[]', file));
                links.forEach(link => formData.append('document_links[]', link));

                await sendFilesRequest(formData);
                onRefresh();
                closeModal();
                Notify.success('Інформацію змінено!');
              } catch (error) {
                if (error?.response?.status === 400) {
                  const message =
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    'Некоректні дані для додавання документів';
                  Notify.failure(message);
                } else {
                  Notify.failure('Сталася помилка, спробуйте ще раз');
                }
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
