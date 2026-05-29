import React, { useRef, useState } from 'react';

export default function UploadZone({ label, accept, icon, file, onFile }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-white'}
        ${file ? 'border-green-500 bg-green-50' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-semibold text-gray-700">{label}</p>
      {file
        ? <p className="mt-2 text-sm text-green-700 font-medium truncate max-w-xs">{file.name}</p>
        : <p className="mt-1 text-xs text-gray-400">Arraste ou clique para selecionar</p>
      }
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
    </div>
  );
}
