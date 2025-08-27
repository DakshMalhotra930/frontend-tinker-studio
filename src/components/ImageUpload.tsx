import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({ onImageSelect, disabled = false, className = '' }: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB');
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onImageSelect(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setFileName('');
    onImageSelect(null);
    // Reset the input
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium">Upload Problem Image (Optional)</label>
      
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => document.getElementById('image-upload')?.click()}
          disabled={disabled}
          className="flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Choose Image</span>
        </Button>
        
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={disabled}
        />
        
        {imagePreview && (
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">{fileName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeImage}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      
      {imagePreview && (
        <div className="relative">
          <img 
            src={imagePreview} 
            alt="Problem" 
            className="max-w-xs rounded border shadow-sm" 
          />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Supported formats: JPG, PNG, GIF. Max size: 5MB
      </p>
    </div>
  );
}
