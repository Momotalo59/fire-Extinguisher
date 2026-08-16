import React, { useState, useRef } from 'react';
import { Camera, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowUrlInput?: boolean;
}

export default function PhotoUploader({ label, value, onChange, allowUrlInput = true }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'camera' | 'url'>('camera');
  const [urlInputValue, setUrlInputValue] = useState(value && !value.startsWith('data:') ? value : '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.65 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          onChange(compressedBase64);
        } else {
          onChange(reader.result as string);
        }
        setLoading(false);
      };
      img.onerror = () => {
        onChange(reader.result as string);
        setLoading(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const triggerFile = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    onChange('');
    setUrlInputValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlBlurOrSubmit = () => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300">{label}</label>
        {allowUrlInput && (
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'camera'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera size={11} />
              <span>ถ่ายรูป/อัปโหลด</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'url'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon size={11} />
              <span>ระบุ URL</span>
            </button>
          </div>
        )}
      </div>

      {mode === 'camera' ? (
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[120px] relative transition-all hover:border-slate-750">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {loading ? (
            <div className="text-center space-y-2 py-4">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[10px] text-slate-400 font-bold">กำลังประมวลผลรูปภาพ...</p>
            </div>
          ) : value ? (
            <div className="w-full relative">
              <img
                src={value}
                alt={label}
                referrerPolicy="no-referrer"
                className="w-full h-32 object-cover rounded-lg border border-slate-800"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-lg transition-colors cursor-pointer"
                title="ลบรูปภาพ"
              >
                <Trash2 size={13} />
              </button>
              <div className="absolute bottom-2 left-2 bg-slate-900/90 text-emerald-400 border border-emerald-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>แนบรูปเรียบร้อยแล้ว</span>
              </div>
            </div>
          ) : (
            <div
              onClick={triggerFile}
              className="w-full h-full flex flex-col items-center justify-center py-4 cursor-pointer text-center space-y-2 select-none group"
            >
              <div className="p-3 bg-slate-900 rounded-full text-slate-400 group-hover:text-red-500 group-hover:bg-slate-850 border border-slate-800 transition-all shadow-xs">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">ถ่ายภาพรูปถังดับเพลิงจากมือถือ</p>
                <p className="text-[10px] text-slate-400 mt-0.5">กดที่นี่เพื่อ เปิดกล้องถ่ายภาพ หรือ เลือกรูปจากคลังภาพ</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://example.com/fire-extinguisher.jpg"
            value={urlInputValue}
            onChange={(e) => {
              setUrlInputValue(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={handleUrlBlurOrSubmit}
            className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
          />
          {value && (
            <div className="relative">
              <img
                src={value}
                alt={label}
                referrerPolicy="no-referrer"
                className="w-full h-28 object-cover rounded-lg border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
