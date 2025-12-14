import React from 'react';

interface CloseIconProps {
  className?: string;
}

export const CloseIcon: React.FC<CloseIconProps> = ({ className = '' }) => {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      <path 
        d="M19 5L5 19M5 5L19 19" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};