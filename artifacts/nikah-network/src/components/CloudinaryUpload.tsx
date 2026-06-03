import { useState } from 'react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/** Generic upload widget — used for test/documents (NOT profile photos). */
export default function CloudinaryUpload() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { uploadFile, uploading, error, progress } = useCloudinaryUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use 'general' type — no face detection, stored in general/ folder
    const result = await uploadFile(file, 'general');
    if (result?.url) setImageUrl(result.url);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {uploading && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Uploading… {progress}%</p>
          <Progress value={progress} />
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {imageUrl && (
        <div className="space-y-2">
          <p className="text-green-600 text-sm font-medium">✅ Upload successful!</p>
          <img src={imageUrl} alt="Uploaded" className="max-w-xs rounded-lg border" />
          <p className="text-xs text-gray-500 break-all">{imageUrl}</p>
        </div>
      )}
    </div>
  );
}
