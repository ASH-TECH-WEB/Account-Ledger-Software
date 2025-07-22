// utils/dateFormatter.js

export const formatDate = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };
  
  // Example: formatDate(new Date()) -> "16/07/2025"
  