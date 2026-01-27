import style from './ModalColumnsForm.module.css';


const ModalColumnsForm = ({
  columns,
  closeModal,
  visibleColumns,
  handleColumnToggle,
}) => {
  const getHeaderLabel = col => {
    if (typeof col.header === 'string') return col.header;
    const children = col.header?.props?.children;
    if (Array.isArray(children)) return children[0];
    return children ?? col.accessorKey;
  };
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
            {getHeaderLabel(col)}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ModalColumnsForm;
