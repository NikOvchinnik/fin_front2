import { useState } from 'react';
import style from './ExpandableText.module.css';
import { useTranslation } from 'react-i18next';

const ExpandableText = ({ text, limit = 80 }) => {
  const { t } = useTranslation();
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
          {expanded ? t('expandable.hide') : t('expandable.showAll')}
        </button>
      )}
    </span>
  );
};

export default ExpandableText;
