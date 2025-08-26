import Modal from 'react-modal';
import style from './ModalWindow.module.css';
import Icon from '../Icon/Icon';
import { useEffect } from 'react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

Modal.setAppElement('#root');

const ModalWindow = ({
  isModalOpen,
  onCloseModal,
  children,
  customStyles = {},
  closeBtn = true,
}) => {
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add(style.modalOpen);
    } else {
      document.body.classList.remove(style.modalOpen);
    }
  }, [isModalOpen]);

  const defaultStyles = {
    overlay: {
      backgroundColor: 'rgba(47, 47, 47, 0.6)',
      zIndex: 1000,
    },
    content: {
      position: 'relative',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'fit-content',
      maxWidth: '100%',
      maxHeight: '90%',
      borderRadius: '24px',
      padding: '0',
      overflow: 'hidden',
      border: 'none',
    },
  };

  const mergedStyles = customStyles => ({
    overlay: { ...defaultStyles.overlay },
    content: { ...defaultStyles.content, ...customStyles },
  });

  return (
    <Modal
      isOpen={isModalOpen}
      onRequestClose={onCloseModal}
      shouldFocusAfterRender={true}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      style={mergedStyles(customStyles)}
    >
      {closeBtn && (
        <button className={style.closeBtn} onClick={onCloseModal} type="button">
          <Icon id="close" className={style.closeIcon} />
        </button>
      )}
      <SimpleBar style={{ maxHeight: '90vh' }}>{children}</SimpleBar>
    </Modal>
  );
};

export default ModalWindow;
