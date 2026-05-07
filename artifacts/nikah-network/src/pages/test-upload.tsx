import { useEffect } from 'react';
import CloudinaryUpload from '@/components/CloudinaryUpload';

export default function TestUpload() {
  useEffect(() => {
    // Test env vars
    console.log('✅ Test Upload Page Loaded');
    console.log('Cloud Name:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', import.meta.env.VITE_CLOUDINARY_API_KEY);
  }, []);

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Test Cloudinary Upload</h1>
      <CloudinaryUpload />
    </div>
  );
}