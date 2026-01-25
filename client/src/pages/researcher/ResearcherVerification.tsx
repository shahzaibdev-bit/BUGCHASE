import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Camera, Upload, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { title: 'Upload CNIC', description: 'Upload a clear front photo of your Pakistani CNIC.' },
  { title: 'Live Verification', description: 'Take a live selfie to verify your identity.' },
  { title: 'Processing', description: 'We are analyzing your documents.' }
];

export default function ResearcherVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCnicFile(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setCameraError("Unable to access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(-1, 1); // Mirror
        ctx.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedImage(blob);
            setCapturedPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedPreview(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!cnicFile || !capturedImage || !user) return;

    setIsProcessing(true);
    setCurrentStep(2); // Move to processing UI

    const formData = new FormData();
    formData.append('id_card', cnicFile);
    formData.append('live_face', capturedImage, 'live_face.jpg');
    formData.append('researcher_id', user._id);

    try {
      // 1. Call Python Service
      const response = await fetch('http://localhost:8000/verify-kyc', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // 2. Call Node Backend to Update Status
        const backendRes = await fetch('/api/users/verify-kyc-status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header if you are using Bearer tokens, or rely on cookies
            },
            body: JSON.stringify({ verified: true, confidence: data.confidence })
        });
        
        if (backendRes.ok) {
            toast.success("Identity Verified Successfully!", { description: "You have been awarded the Verified Badge." });
            setTimeout(() => navigate('/researcher/profile'), 2000);
        } else {
            toast.error("Verification passed technically, but failed to update profile. Contact support.");
             setIsProcessing(false);
             setCurrentStep(1);
        }

      } else {
        toast.error("Verification Failed", { description: data.message || "Face match failed." });
        setIsProcessing(false);
        setCurrentStep(1); // Go back to capture step
      }
    } catch (error) {
      console.error("Verification Error:", error);
      toast.error("System Error", { description: "Could not connect to verification engine. Ensure it is running." });
      setIsProcessing(false);
      setCurrentStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/95 flex items-center justify-center p-4">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:50px_50px] pointer-events-none" />
      
      <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white relative z-10 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
               <ShieldCheck className="w-8 h-8 text-black dark:text-white" />
            </div>
            <div>
                <CardTitle className="text-2xl font-bold">Identity Verification</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Complete KYC to earn your Verified Researcher badge.</CardDescription>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((step, idx) => (
                <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-500 ${idx <= currentStep ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            ))}
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px] flex flex-col justify-center py-6">
          
          {/* STEP 1: UPLOAD CNIC */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-zinc-50 dark:bg-zinc-950/50 cursor-pointer group relative">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  {cnicFile ? (
                    <div className="flex flex-col items-center gap-4">
                        <img src={URL.createObjectURL(cnicFile)} alt="Preview" className="h-40 object-contain rounded-lg shadow-lg bg-white dark:bg-black" />
                        <p className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> {cnicFile.name}
                        </p>
                    </div>
                  ) : (
                    <>
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-zinc-400 dark:text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Upload Front of CNIC</h3>
                        <p className="text-zinc-500 text-sm max-w-xs">Supports JPG, PNG or WEBP. Make sure text is clear and readable.</p>
                    </>
                  )}
               </div>
            </div>
          )}

          {/* STEP 2: LIVE CAMERA */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-inner">
                    {capturedPreview ? (
                        <img src={capturedPreview} alt="Live Capture" className="w-full h-full object-cover" />
                    ) : (
                        <>
                            {!stream && !cameraError && (
                                <Button onClick={startCamera} variant="outline" className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    <Camera className="mr-2 h-4 w-4" /> Allow Camera Access
                                </Button>
                            )}
                            {cameraError && (
                                <div className="text-red-400 text-center px-4">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                    {cameraError}
                                </div>
                            )}
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover transform -scale-x-100 ${!stream ? 'hidden' : ''}`} 
                            />
                        </>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="text-center">
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        {capturedPreview 
                            ? "Photo captured. Proceed if it is clear." 
                            : "Position your face in the center and ensure good lighting."}
                    </p>
                </div>
            </div>
          )}

          {/* STEP 3: PROCESSING (Loader) */}
          {currentStep === 2 && (
             <div className="flex flex-col items-center justify-center text-center space-y-6 py-10 animate-in fade-in zoom-in-95">
                 <div className="relative">
                     <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 blur-xl rounded-full animate-pulse opacity-50" />
                     <Loader2 className="w-16 h-16 text-black dark:text-white animate-spin relative z-10" />
                 </div>
                 <div>
                     <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Verifying Identity...</h3>
                     <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                        Our AI engine is analyzing your CNIC solidity and matching it with your live face. This may take up to 30 seconds.
                     </p>
                 </div>
             </div>
          )}

        </CardContent>

        {currentStep < 2 && (
            <CardFooter className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <Button 
                variant="ghost" 
                onClick={() => {
                    if (currentStep === 0) navigate(-1);
                    else setCurrentStep(c => c - 1);
                }}
                className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> {currentStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            
            {currentStep === 0 ? (
                <Button 
                    disabled={!cnicFile} 
                    onClick={() => setCurrentStep(1)}
                    className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                >
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            ) : (
                <>
                    {capturedPreview ? (
                         <div className="flex gap-3">
                             <Button variant="outline" onClick={retakePhoto} className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                 Retake
                             </Button>
                             <Button onClick={handleSubmit} className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black">
                                 Submit Verification
                             </Button>
                         </div>
                    ) : (
                        <Button 
                            disabled={!stream} 
                            onClick={capturePhoto}
                            className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                            <Camera className="w-4 h-4 mr-2" /> Capture Photo
                        </Button>
                    )}
                </>
            )}
            </CardFooter>
        )}
      </Card>
      
      {/* Background Blobs (Monochrome) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-200/50 dark:bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-300/50 dark:bg-zinc-700/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
