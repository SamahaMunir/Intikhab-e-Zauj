import { useState } from 'react';
import { cloudinaryConfig, generateUploadSignature } from '@/lib/cloudinary';

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    folder: string = 'profiles'
  ): Promise<{ publicId: string; url: string; size: number; type: string } | null> => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum 10MB allowed.');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.');
      }

      setProgress(20);

      // Get upload signature from backend
      const { signature, timestamp } = await generateUploadSignature(folder);
      console.log('✅ Signature received:', { signature, timestamp });
      setProgress(40);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      // If we received a signature from the server, use signed upload (do not send upload_preset)
      if (signature && timestamp) {
        formData.append('signature', signature);
        formData.append('timestamp', timestamp.toString());
        formData.append('api_key', cloudinaryConfig.apiKey);
      } else {
        // Fallback to unsigned preset (ensure this preset exists in your Cloudinary account)
        formData.append('upload_preset', 'intikhab_unsigned');
      }

      setProgress(60);

      console.log('📤 Uploading to Cloudinary...');

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('📊 Cloudinary response status:', response.status);
      console.log('📊 Response headers:', response.headers);

      const responseText = await response.text();
      console.log('📊 Raw response:', responseText);

      if (!response.ok) {
        console.error('❌ Upload error:', responseText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Invalid response from Cloudinary');
      }

      console.log('✅ Cloudinary response:', data);

      setProgress(90);

      const publicId = data.public_id;
      const secureUrl = data.secure_url;

      if (!publicId || !secureUrl) {
        throw new Error('Missing publicId or URL in response');
      }

      console.log('✅ File uploaded successfully:', secureUrl);
      setProgress(100);

      return {
        publicId,
        url: secureUrl,
        size: data.bytes,
        type: data.resource_type,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('❌ Upload error:', errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error, progress };
}