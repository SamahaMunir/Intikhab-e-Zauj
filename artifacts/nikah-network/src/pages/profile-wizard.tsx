import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

export default function ProfileWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { uploadFile, uploading: photoUploading } = useCloudinaryUpload();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    phone: '',
    gender: '',
    // Step 2
    dob: '',
    city: '',
    education: '',
    // Step 3
    profilePhoto: '',
    // Step 4
    profession: '',
    income: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const result = await uploadFile(file, 'profiles');
    if (result && typeof result === 'object' && 'url' in result) {
      setFormData(prev => ({ ...prev, profilePhoto: result.url }));
    }
  };

  const saveStep = async () => {
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      let stepData = {};
      if (step === 1) {
        if (!formData.name || !formData.phone || !formData.gender) {
          throw new Error('Please fill all fields');
        }
        stepData = { name: formData.name, phone: formData.phone, gender: formData.gender };
      } else if (step === 2) {
        if (!formData.dob || !formData.city || !formData.education) {
          throw new Error('Please fill all fields');
        }
        stepData = { dob: formData.dob, city: formData.city, education: formData.education };
      } else if (step === 3) {
        if (!formData.profilePhoto) {
          throw new Error('Please upload a photo');
        }
        stepData = { profilePhoto: formData.profilePhoto };
      } else if (step === 4) {
        if (!formData.profession) {
          throw new Error('Please enter profession');
        }
        stepData = { profession: formData.profession, income: formData.income };
      }

      const response = await fetch(`${apiUrl}/api/profile/complete-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ step, data: stepData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save step');
      }

      if (step < 4) {
        setStep(step + 1);
      } else {
        // ✅ PROFILE COMPLETE - GO TO PAYMENT
        console.log('✅ Profile completed!');
        setLocation('/app/payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-100 to-purple-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-serif">Complete Your Profile</CardTitle>
            <CardDescription>Step {step} of 4 - Required before payment</CardDescription>
            <Progress value={progressPercent} className="mt-4" />
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Basic Information</h3>

                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    name="name"
                    placeholder="Ahmed Ali"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    name="phone"
                    placeholder="03001234567"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Personal Information</h3>

                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    name="city"
                    placeholder="Karachi"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Education *</Label>
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select education</option>
                    <option value="Matric">Matric</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Bachelors">Bachelors</option>
                    <option value="Masters">Masters</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Profile Photo</h3>
                <p className="text-sm text-muted-foreground">Upload a clear photo (JPG/PNG) - shown as blurred until payment</p>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {photoPreview ? (
                    <div className="space-y-3">
                      <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg mx-auto object-cover" />
                      <label>
                        <span className="text-sm text-primary cursor-pointer hover:underline">Change photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          disabled={photoUploading || loading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <span className="text-sm">Click to upload photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        disabled={photoUploading || loading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Professional Information</h3>

                <div className="space-y-2">
                  <Label>Profession *</Label>
                  <Input
                    name="profession"
                    placeholder="Engineer, Doctor, etc."
                    value={formData.profession}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Annual Income (Optional)</Label>
                  <Input
                    name="income"
                    placeholder="e.g., 500,000 - 1,000,000"
                    value={formData.income}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>
                    After this step, you'll proceed to payment (4000 PKR). Then you can start browsing profiles!
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex gap-4 pt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                  ← Previous
                </Button>
              )}
              <Button
                onClick={saveStep}
                disabled={loading || photoUploading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : step === 4 ? (
                  'Complete & Go to Payment'
                ) : (
                  'Next →'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}