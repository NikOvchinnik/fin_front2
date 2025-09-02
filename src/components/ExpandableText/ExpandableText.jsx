import { useState } from 'react';
import style from './ExpandableText.module.css';

const ExpandableText = ({ text, limit = 80 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span>-</span>;

  const isLong = text.length > limit;
  const displayText = expanded || !isLong ? text : text.slice(0, limit) + '...';

  return (
    <span className={style.expandable}>
      {displayText}
      {isLong && (
        <button
          type="button"
          className={style.toggleBtn}
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? ' Сховати' : ' Показати все'}
        </button>
      )}
    </span>
  );
};

export default ExpandableText;
