import style from './ModalColumnsForm.module.css';


const ModalColumnsForm = ({
  columns,
  closeModal,
  visibleColumns,
  handleColumnToggle,
}) => {
  return (
    <div className={style.newContainer}>
      <h3 className={style.title}>Вибір колонок</h3>
      <div className={style.columnsList}>
        {columns.map(col => (
          <label key={col.accessorKey} className={style.columnItem}>
            <input
              type="checkbox"
              checked={
                visibleColumns === 'All' ||
                visibleColumns.includes(col.accessorKey)
              }
              onChange={() => handleColumnToggle(col.accessorKey)}
            />
            {col.header.props?.children[0] || col.header}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ModalColumnsForm;
