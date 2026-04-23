import React from "react";

const TagBadge = ({ type }) => {
  if (type === 'boolean' || type === 'bool') return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ADE80' }}>BOOL</span>
  );
  if (type === 'number' || type === 'num') return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>NUM</span>
  );
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>STR</span>
  );
};

export default TagBadge;
