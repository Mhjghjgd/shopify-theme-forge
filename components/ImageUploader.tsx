'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

export default function ImageUploader({ onImagesChange, maxImages = 5 }: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);

  const uploadImage = async (img: UploadedImage): Promise<string> => {
    const formData = new FormData();
    formData.append('file', img.file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url as string;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const remaining = maxImages - images.length;
      const toAdd = acceptedFiles.slice(0, remaining);

      const newImages: UploadedImage[] = toAdd.map((file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
        uploading: true,
      }));

      setImages((prev) => [...prev, ...newImages]);

      // Upload each image
      const uploaded = await Promise.all(
        newImages.map(async (img) => {
          try {
            const url = await uploadImage(img);
            return { ...img, uploading: false, url };
          } catch {
            return { ...img, uploading: false, error: 'Upload failed' };
          }
        })
      );

      setImages((prev) => {
        const updated = prev.map((img) => {
          const found = uploaded.find((u) => u.id === img.id);
          return found || img;
        });
        const urls = updated.filter((i) => i.url).map((i) => i.url!);
        onImagesChange(urls);
        return updated;
      });
    },
    [images.length, maxImages, onImagesChange]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      const urls = updated.filter((i) => i.url).map((i) => i.url!);
      onImagesChange(urls);
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    disabled: images.length >= maxImages,
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-[#6366f1] bg-[#6366f1]/10'
            : 'border-[#2a2a2a] hover:border-[#6366f1]/50 hover:bg-white/2',
          images.length >= maxImages && 'opacity-40 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#6366f1]/15 rounded-full flex items-center justify-center">
            <Upload size={20} className="text-[#6366f1]" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">
              {isDragActive ? 'Drop images here...' : 'Drag & drop reference images'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {images.length}/{maxImages} images · JPG, PNG, WEBP · Max 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group bg-[#1a1a1a]">
              <Image
                src={img.preview}
                alt="Reference"
                fill
                className="object-cover"
                sizes="120px"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => removeImage(img.id)}
                  className="w-8 h-8 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Loading state */}
              {img.uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Error state */}
              {img.error && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                  <span className="text-xs text-red-200">Failed</span>
                </div>
              )}

              {/* Success indicator */}
              {img.url && !img.uploading && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] text-white">✓</span>
                </div>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {images.length < maxImages &&
            Array.from({ length: Math.min(2, maxImages - images.length) }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg border border-dashed border-[#2a2a2a] flex items-center justify-center"
              >
                <ImageIcon size={20} className="text-zinc-700" />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
