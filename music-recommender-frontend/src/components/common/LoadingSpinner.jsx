import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Загрузка...', centered = true }) => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };
  
  const spinnerClasses = `${sizes[size]} border-4 border-gray-300 border-t-black animate-spin`;
  
  const content = (
    <div className="flex flex-col items-center gap-3">
      <div className={spinnerClasses} />
      {text && <p className="text-gray-500 text-sm">{text}</p>}
    </div>
  );
  
  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-32">
        {content}
      </div>
    );
  }
  
  return content;
};

export default LoadingSpinner;