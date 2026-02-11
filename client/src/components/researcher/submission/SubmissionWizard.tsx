import React, { useState, useEffect } from 'react';
import { SubmissionData, STEPS } from './types';
import { StepSidebar } from './StepSidebar';
import { StepClassification } from './StepClassification';
import { StepSeverity } from './StepSeverity';
import { StepDetails } from './StepDetails';
import { StepReview } from './StepReview';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Save, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '@/config';

export const SubmissionWizard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const programId = searchParams.get('program');

    const [currentStep, setCurrentStep] = useState(1);
    const [programScope, setProgramScope] = useState<any[]>([]); // To store assets
    const [loadingProgram, setLoadingProgram] = useState(false);

    const [data, setData] = useState<SubmissionData>({
        target: null, 
        assetType: null,
        category: null,
        bugType: null,
        cwe: null,
        severityMode: 'manual',
        severity: 'None',
        cvssVector: { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' },
        cvssScore: 0.0,
        title: '',
        vulnerabilityDetails: '',
        validationSteps: '',
        impact: '',
        files: [],
        agreedToTerms: false
    });

    // Fetch Program Scope if programId exists
    useEffect(() => {
        if (!programId) return;
        const fetchProgram = async () => {
            setLoadingProgram(true);
            try {
                const res = await fetch(`${API_URL}/programs/${programId}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.data && json.data.scope) {
                        setProgramScope(json.data.scope);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch program scope", error);
            } finally {
                setLoadingProgram(false);
            }
        };
        fetchProgram();
    }, [programId]);

    const updateData = (updates: Partial<SubmissionData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const canProceed = () => {
        if (currentStep === 1) return data.target && data.category;
        if (currentStep === 2) return data.severity !== 'None';
        if (currentStep === 3) return data.title.length > 2 && data.vulnerabilityDetails.length > 2 && data.impact.length > 2;
        return true;
    };

    const handleSubmit = async () => {
        try {
            // Format CVSS Vector from Object to String
            // Example: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N
            const vec = data.cvssVector as any;
            const cvssString = `CVSS:3.1/AV:${vec.AV}/AC:${vec.AC}/PR:${vec.PR}/UI:${vec.UI}/S:${vec.S}/C:${vec.C}/I:${vec.I}/A:${vec.A}`;

            const token = localStorage.getItem('token');
            console.log("Submitting report with token:", token ? "Present" : "Missing"); // Debug Log

            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_URL}/reports`, {
                method: 'POST',
                headers,
                credentials: 'include', // Ensure cookies are sent if needed
                body: JSON.stringify({
                    programId, // From URL
                    ...data,
                    cvssVector: cvssString // Send formatted string
                })
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.message || 'Submission failed');

            toast({
                title: "Report Submitted Successfully",
                description: `Your report has been received.`,
            });
            navigate('/researcher/reports'); // Redirect to reports list
        } catch (error: any) {
            toast({
                title: "Submission Error",
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 max-w-7xl mx-auto pb-24 animate-fade-in">
            {/* Left Column: Sidebar (25%) */}
            <div className="lg:col-span-1 hidden lg:block">
                <StepSidebar currentStep={currentStep} />
            </div>

            {/* Right Column: Content (75%) */}
            <div className="lg:col-span-3 space-y-8">
                
                {/* Step Content */}
                <div className="min-h-[500px]">
                    {currentStep === 1 && (
                        <StepClassification 
                            data={data} 
                            updateData={updateData} 
                            programScope={programScope} // Pass fetched scope
                            isLoading={loadingProgram}
                        />
                    )}
                    {currentStep === 2 && <StepSeverity data={data} updateData={updateData} />}
                    {currentStep === 3 && <StepDetails data={data} updateData={updateData} />}
                    {currentStep === 4 && <StepReview data={data} updateData={updateData} />}
                </div>

                {/* Navigation Buttons (Sticky Bottom or Inline) */}
                <div className="flex items-center justify-between pt-8 border-t border-zinc-200 dark:border-white/10">
                    <Button 
                        variant="ghost" 
                        onClick={prevStep} 
                        disabled={currentStep === 1}
                        className="text-zinc-500"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-4">
                        {currentStep === 4 && (
                             <Button variant="ghost" className="text-zinc-500">
                                <Save className="w-4 h-4 mr-2" />
                                Save Draft
                            </Button>
                        )}

                        {currentStep < 4 ? (
                             <Button 
                                onClick={nextStep} 
                                disabled={!canProceed()}
                                className="bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                            >
                                Next: {STEPS[currentStep]?.label || 'Review'}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                             <Button 
                                onClick={handleSubmit} 
                                disabled={!data.agreedToTerms}
                                className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold px-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit Report
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
