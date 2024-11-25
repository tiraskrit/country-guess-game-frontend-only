import React from 'react';

export const Alert = ({ children, className = '' }) => {
  return (
    <div className={`p-4 rounded-md bg-blue-50 border border-blue-200 ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ children, className = '' }) => {
  return (
    <p className={`text-blue-800 ${className}`}>
      {children}
    </p>
  );
};

export const AlertTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-blue-900 font-semibold mb-2 ${className}`}>
      {children}
    </h3>
  );
};