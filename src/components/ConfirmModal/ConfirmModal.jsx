import style from "./ConfirmModal.module.css"

const ConfirmModal = ({ title, message, onConfirm, onClose }) => {
  return (
    <div className={style.confirmContainer}>
      <h3 className={style.confirmTitle}>{title}</h3>
      <p className={style.confirmText}>{message}</p>
      <div className={style.buttonContainer}>
        <button onClick={onClose} className={style.confirmBtnCancel}>
          Cancel
        </button>
        <button onClick={onConfirm} className={style.confirmBtn}>
          Ok
        </button>
      </div>
    </div>
  );
};

export default ConfirmModal;
