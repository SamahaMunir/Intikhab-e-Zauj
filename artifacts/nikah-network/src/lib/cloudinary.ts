export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
};

/**
 * Get API base URL (development vs production)
 */
function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL || process.env.VITE_API_URL;
  
  if (env) {
    return env;
  }

  // Auto-detect based on environment
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000';
  }

  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel')) {
    return 'https://api.intikhab-e-zauj.pk';
  }

  return 'https://api.intikhab-e-zauj.pk';
}

/**
 * Generate upload signature (server-side - DO NOT expose API secret in frontend)
 */
export async function generateUploadSignature(folder: string): Promise<{
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
}> {
  try {
    // Generate fresh timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    
    console.log('📅 Generated timestamp:', timestamp);
    console.log('📅 Current time:', new Date().toISOString());

    const apiBaseUrl = getApiBaseUrl();
    console.log('🔗 API Base URL:', apiBaseUrl);

    const response = await fetch(`${apiBaseUrl}/api/cloudinary/signature`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ folder, timestamp }),
    });

    console.log('📨 Response status:', response.status);

    const text = await response.text();
    console.log('📨 Response text:', text.substring(0, 100));

    if (!text) {
      throw new Error('Empty response from server');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Response was:', text);
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate signature');
    }

    console.log('✅ Signature received:', data.signature?.substring(0, 10) + '...');

    return data;
  } catch (error) {
    console.error('❌ Signature generation error:', error);
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