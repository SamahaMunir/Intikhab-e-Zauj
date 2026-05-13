import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

interface DataEntryFormData {
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | '';
  dob: string;
  city: string;
  education: string;
  profession: string;
  fatherName: string;
  heightCm: string;
  photoUrl: string;
  notes: string;
  source: 'whatsapp' | 'paper' | 'other' | '';
}

export default function StaffDataEntry() {
  const [formData, setFormData] = useState<DataEntryFormData>({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    city: '',
    education: '',
    profession: '',
    fatherName: '',
    heightCm: '',
    photoUrl: '',
    notes: '',
    source: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { uploadFile, uploading: photoUploading } = useCloudinaryUpload();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const result = await uploadFile(file, 'documents');
    if (result && typeof result === 'object' && 'url' in result) {
      setFormData(prev => ({ ...prev, photoUrl: result.url }));
      setErrors(prev => ({ ...prev, photoUrl: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name required';
    if (!formData.phone.match(/^\d{10,}/)) newErrors.phone = 'Valid phone required';
    if (!formData.gender) newErrors.gender = 'Gender required';
    if (!formData.dob) newErrors.dob = 'DOB required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    if (!formData.education) newErrors.education = 'Education required';
    if (!formData.source) newErrors.source = 'Source required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Create user with pending status
      const response = await fetch(`${apiUrl}/api/staff/create-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || `${formData.phone}@intikhab-offline.pk`,
          phone: formData.phone,
          gender: formData.gender,
          dob: formData.dob,
          city: formData.city,
          education: formData.education,
          profession: formData.profession || 'Not specified',
          fatherName: formData.fatherName,
          height: parseInt(formData.heightCm) || 0,
          profilePhoto: formData.photoUrl,
          profileStatus: 'pending',
          completion: 60,
          source: formData.source,
          notes: formData.notes,
          enteredBy: JSON.parse(localStorage.getItem('user') || '{}').email,
          enteredAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      console.log('✅ User created:', data);
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        gender: '',
        dob: '',
        city: '',
        education: '',
        profession: '',
        fatherName: '',
        heightCm: '',
        photoUrl: '',
        notes: '',
        source: '',
      });
      setPhotoPreview(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('❌ Error:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to create user',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Offline Data Entry</h1>
        <p className="text-muted-foreground mt-1">Register users from WhatsApp, paper forms, or other offline sources</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New User Registration</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="flex gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">User created successfully! Profile pending approval.</p>
              </div>
            )}

            {errors.submit && (
              <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Data Source */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Data Source *</label>
              <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v as any }))}>
                <SelectTrigger className={errors.source ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="paper">Paper Form</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.source && <p className="text-sm text-red-600">{errors.source}</p>}
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Photo (Optional)</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {photoPreview ? (
                  <div className="space-y-3">
                    <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded mx-auto object-cover" />
                    <label>
                      <span className="text-sm text-primary cursor-pointer hover:underline">Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        disabled={photoUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <span className="text-sm">Click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      disabled={photoUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="03001234567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Email (Optional)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="optional@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Gender *</label>
                <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v as any }))}>
                  <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">DOB *</label>
                <Input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  className={errors.dob ? 'border-red-500' : ''}
                />
                {errors.dob && <p className="text-sm text-red-600">{errors.dob}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Height (cm)</label>
                <Input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => setFormData(prev => ({ ...prev, heightCm: e.target.value }))}
                  placeholder="170"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">City *</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Education *</label>
                <Select value={formData.education} onValueChange={(v) => setFormData(prev => ({ ...prev, education: v }))}>
                  <SelectTrigger className={errors.education ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Matric">Matric</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Bachelors">Bachelors</SelectItem>
                    <SelectItem value="Masters">Masters</SelectItem>
                    <SelectItem value="PhD">PhD</SelectItem>
                  </SelectContent>
                </Select>
                {errors.education && <p className="text-sm text-red-600">{errors.education}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Profession</label>
                <Input
                  value={formData.profession}
                  onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                  placeholder="Job title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Father's Name</label>
                <Input
                  value={formData.fatherName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Additional Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information (e.g., family background, preferences)"
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || photoUploading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating User...
                </>
              ) : (
                'Create User Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
