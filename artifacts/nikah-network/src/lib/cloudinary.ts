console.log('🔍 Cloudinary Config:');
console.log('Cloud Name:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
console.log('API Key:', import.meta.env.VITE_CLOUDINARY_API_KEY);

// ✅ EXPORT cloudinaryConfig
export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
};

/**
 * Generate upload signature (server-side - DO NOT expose API secret in frontend)
 */
export async function generateUploadSignature(folder: string): Promise<{
  signature: string;
  timestamp: number;
}> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${apiUrl}/api/cloudinary/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ folder }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Failed to generate signature: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    return data;
  } catch (error) {
    console.error('Error generating signature:', error);
    throw error;
  }
}

/**
 * Format Cloudinary URL with optimizations
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  } = {}
): string {
  const { width, height, crop = 'fill', quality = 'auto' } = options;
  
  let url = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload`;
  
  const transforms = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`c_${crop}`);
  transforms.push(`q_${quality}`);
  
  if (transforms.length > 0) {
    url += `/${transforms.join(',')}`;
  }
  
  url += `/${publicId}`;
  
  return url;
}