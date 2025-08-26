const Icon = ({ id, width, height, className = '' }) => {
  return (
    <svg
      className={`${className}`}
      style={{ background: 'transparent' }}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <use href={`/icons/icons.svg#icon-${id}`}></use>
    </svg>
  );
};

export default Icon;
