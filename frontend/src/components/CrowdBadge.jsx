import React from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STYLES = {
  low: { bg: 'bg-status-green/15', text: 'text-status-green', border: 'border-status-green/30' },
  moderate: { bg: 'bg-status-yellow/15', text: 'text-status-yellow', border: 'border-status-yellow/30' },
  high: { bg: 'bg-status-red/15', text: 'text-status-red', border: 'border-status-red/30' },
};

export const CrowdBadge = ({ level = null, size = 'sm' }) => {
  const { t } = useTranslation();
  if (!level || !STYLES[level]) return null;
  const s = STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-mono ${s.bg} ${s.text} ${s.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      title={`${t('crowd.label')}: ${t(`crowd.${level}`)}`}
    >
      <Users className="w-3 h-3" />
      {t(`crowd.${level}`)}
    </span>
  );
};

export default CrowdBadge;
