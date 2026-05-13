import React, { useCallback, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function ImageUpload({ onImageSelected, onClear, isLoading = false }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [onImageSelected]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onImageSelected(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreview(null);
    onClear();
  };

  if (preview) {
    return (
      <div className="relative w-full h-36 rounded-xl overflow-hidden group" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <img src={preview} alt="Receipt preview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-300 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <button
              onClick={clearImage}
              className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2.5 rounded-full border border-white/20 text-white"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-36 rounded-xl flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        border: dragActive ? '1px solid rgba(212,175,55,0.55)' : '1px dashed rgba(255,255,255,0.1)',
        background: dragActive ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.01)',
        boxShadow: dragActive ? '0 0 20px rgba(212,175,55,0.08)' : 'none',
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isLoading}
      />
      <div className="flex flex-col items-center gap-3 pointer-events-none text-center px-4">
        <UploadCloud
          className="h-7 w-7 transition-colors duration-300"
          style={{ color: dragActive ? '#D4AF37' : 'rgba(255,255,255,0.2)' }}
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ color: dragActive ? '#D4AF37' : 'rgba(255,255,255,0.5)' }}>Upload receipt</span>
            {' '}or drag & drop
          </p>
          <p className="text-[9px] mt-1 tracking-wide" style={{ color: 'rgba(255,255,255,0.18)' }}>PNG, JPG, GIF</p>
        </div>
      </div>
    </div>
  );
}
