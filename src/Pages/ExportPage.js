import React from 'react';

export const ExportPage = () => {
  const download = (type) => {
    const url = type === 'daily' ? '/api/export/today' : '/api/export/month';
    window.location.href = url; // triggers download
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Export Transactions</h2>
      <div className="space-x-4">
        <button
          onClick={() => download('daily')}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download Today’s Excel
        </button>
        <button
          onClick={() => download('monthly')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Download Full Month Excel
        </button>
      </div>
    </div>
  );
};