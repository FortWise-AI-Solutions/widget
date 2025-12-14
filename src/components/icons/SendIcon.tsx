import React from 'react';

interface SendIconProps {
  className?: string;
  fill?: string;
}

export const SendIcon: React.FC<SendIconProps> = ({ className = '', fill = '#9E9E9E' }) => (
  <svg
    width="18"
    height="14"
    viewBox="0 0 18 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M0.00857142 14L18 7L0.00857142 0L0 5.44444L12.8571 7L0 8.55556L0.00857142 14Z"
      fill={fill}
    />
  </svg>
);
