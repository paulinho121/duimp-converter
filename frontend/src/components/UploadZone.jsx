import React, { useRef, useState } from 'react';

export default function UploadZone({ label, accept, icon, file, onFile, multiple = false }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  // No modo múltiplo, `file` é um array de File; caso contrário, um único File.
  const selecionados = multiple ? (file || []) : (file ? [file] : []);
  const temArquivo = selecionados.length > 0;

  function emit(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    onFile(multiple ? arr : arr[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    emit(e.dataTransfer.files);
  }

  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-white'}
        ${temArquivo ? 'border-green-500 bg-green-50' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-semibold text-gray-700">{label}</p>
      {temArquivo ? (
        <div className="mt-2 w-full max-w-xs">
          {multiple && (
            <p className="text-sm text-green-700 font-semibold text-center mb-1">
              {selecionados.length} arquivo(s) selecionado(s)
            </p>
          )}
          {selecionados.map((f, i) => (
            <p key={i} className="text-xs text-green-700 font-medium truncate text-center">{f.name}</p>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-gray-400">
          {multiple ? 'Arraste ou clique para selecionar (pode ser mais de um)' : 'Arraste ou clique para selecionar'}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => emit(e.target.files)}
      />
    </div>
  );
}
