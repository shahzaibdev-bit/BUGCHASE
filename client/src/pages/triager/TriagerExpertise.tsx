import React, { useState, useEffect } from 'react';
import { Shield, Code, Globe, Smartphone, Database, Cloud, Lock, Zap, Save, CheckCircle, FileText, Wifi, Pencil, X, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/config';

const expertiseAreas = [
  { id: 'web', label: 'Web Application Security', icon: Globe, description: 'XSS, CSRF, SQL Injection' },
  { id: 'api', label: 'API Security', icon: Code, description: 'REST, GraphQL, Auth' },
  { id: 'mobile', label: 'Mobile Security', icon: Smartphone, description: 'iOS and Android apps' },
  { id: 'cloud', label: 'Cloud Security', icon: Cloud, description: 'AWS, Azure, GCP' },
  { id: 'source', label: 'Source Code', icon: FileText, description: 'Static analysis' }, 
  { id: 'iot', label: 'IoT & Firmware', icon: Wifi, description: 'Embedded systems' }, 
  { id: 'crypto', label: 'Cryptography', icon: Lock, description: 'Encryption, Hashing' },
  { id: 'database', label: 'Database Security', icon: Database, description: 'SQL, NoSQL, Data' },
];

const severityPreferences = [
  { id: 'critical', label: 'Critical', color: 'bg-red-500', badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { id: 'high', label: 'High', color: 'bg-orange-500', badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-500', badgeColor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 'low', label: 'Low', color: 'bg-green-500', badgeColor: 'bg-green-500/10 text-green-500 border-green-500/20' },
];

export default function TriagerExpertise() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [availability, setAvailability] = useState(true);
  const [maxReports, setMaxReports] = useState([10]);
  const [expertise, setExpertise] = useState<Record<string, boolean>>({});
  const [severities, setSeverities] = useState<Record<string, boolean>>({});

  const fetchPreferences = () => {
    fetch(`${API_URL}/triager/profile`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data.preferences) {
                const prefs = data.data.preferences;
                if (prefs.isAvailable !== undefined) setAvailability(prefs.isAvailable);
                if (prefs.maxConcurrentReports) setMaxReports([prefs.maxConcurrentReports]);
                
                const expMap: Record<string, boolean> = {};
                expertiseAreas.forEach(a => expMap[a.id] = (prefs.expertise || []).includes(a.id));
                setExpertise(expMap);

                const sevMap: Record<string, boolean> = {};
                severityPreferences.forEach(s => sevMap[s.id] = (prefs.severityPreferences || []).includes(s.id));
                setSeverities(sevMap);
            }
        })
        .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const toggleExpertise = (id: string) => {
    if (!isEditing) return;
    setExpertise(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSeverity = (id: string) => {
    if (!isEditing) return;
    setSeverities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCancel = () => {
      setIsEditing(false);
      fetchPreferences(); 
      toast({ title: "Cancelled", description: "Changes discarded" });
  }

  const handleSave = async () => {
      setSaving(true);
      
      const selectedExpertise = Object.entries(expertise).filter(([_, v]) => v).map(([k]) => k);
      const selectedSeverities = Object.entries(severities).filter(([_, v]) => v).map(([k]) => k);

      try {
          const res = await fetch(`${API_URL}/triager/preferences`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  expertise: selectedExpertise,
                  severityPreferences: selectedSeverities,
                  maxConcurrentReports: maxReports[0],
                  isAvailable: availability
              })
          });
          
          if (res.ok) {
              toast({ title: "Success", description: "Preferences saved successfully" });
              setIsEditing(false);
          } else {
              toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
          }
      } catch (error) {
           toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
      } finally {
          setSaving(false);
      }
  };

  const activeExpertiseCount = Object.entries(expertise).filter(([_, active]) => active).length;
  const activeSeverities = severityPreferences.filter(s => severities[s.id]);
  const activeExpertiseList = expertiseAreas.filter(a => expertise[a.id]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold text-foreground font-mono">Expertise Settings</h1>
            <p className="text-muted-foreground text-sm">Configure your triage preferences and availability</p>
        </div>
        {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200">
                <Pencil className="h-4 w-4" />
                Edit Settings
            </Button>
        )}
      </div>

      {!isEditing ? (
        // === READ ONLY SUMMARY VIEW ===
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Availability Status Card */}
            <GlassCard className="p-6 col-span-1 md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${availability ? 'bg-green-500/10 text-green-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        <Zap className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Triager Availability</h3>
                        <p className="text-sm text-muted-foreground">
                            You are currently <span className={`font-semibold ${availability ? 'text-green-500' : 'text-zinc-500'}`}>{availability ? 'Available' : 'Unavailable'}</span> for new reports.
                        </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-8 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                     <div className="text-center">
                         <span className="block text-2xl font-mono font-bold text-foreground">{maxReports[0]}</span>
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Max Reports</span>
                     </div>
                     <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />
                     <div className="text-center">
                         <span className="block text-2xl font-mono font-bold text-foreground">{activeExpertiseCount}</span>
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Skills</span>
                     </div>
                 </div>
            </GlassCard>

            {/* 2. My Expertise Summary */}
            <GlassCard className="p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5" /> My Expertise
                </h3>
                {activeExpertiseList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {activeExpertiseList.map(area => (
                            <div key={area.id} className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <area.icon className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm font-medium text-foreground">{area.label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p>No expertise areas selected.</p>
                    </div>
                )}
            </GlassCard>

            {/* 3. Severity Preferences Summary */}
            <GlassCard className="p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Severity Preferences
                </h3>
                {activeSeverities.length > 0 ? (
                     <div className="flex flex-wrap gap-3">
                         {activeSeverities.map(sev => (
                             <Badge key={sev.id} className={`px-3 py-1 text-sm font-medium border ${sev.badgeColor}`}>
                                 {sev.label}
                             </Badge>
                         ))}
                     </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <p>No severity preferences set.</p>
                        <p className="text-xs mt-1">You will receive reports of all severities.</p>
                    </div>
                )}
            </GlassCard>
        </div>
      ) : (
        // === EDIT FORM MODE ===
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Availability Edit */}
                <GlassCard className="p-6 lg:col-span-1">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${availability ? 'bg-green-500/10' : 'bg-foreground/10'}`}>
                        <Zap className={`h-6 w-6 ${availability ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                        <p className="font-semibold text-foreground">Availability</p>
                        <p className="text-sm text-muted-foreground">
                            {availability ? 'Accepting reports' : 'Not accepting'}
                        </p>
                        </div>
                    </div>
                    <Switch checked={availability} onCheckedChange={setAvailability} />
                    </div>

                    <div className="pt-4 border-t border-border/30 space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Max Concurrent Reports</Label>
                        <span className="font-mono font-semibold text-primary">{maxReports[0]}</span>
                    </div>
                    <Slider
                        value={maxReports}
                        onValueChange={setMaxReports}
                        max={20}
                        min={1}
                        step={1}
                        className="py-2"
                    />
                    </div>
                </div>
                </GlassCard>

                {/* Expertise Edit */}
                <GlassCard className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Select Expertise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expertiseAreas.map((area) => (
                    <div
                        key={area.id}
                        onClick={() => toggleExpertise(area.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        expertise[area.id]
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/30 bg-foreground/5 hover:border-border/50'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${expertise[area.id] ? 'bg-primary/10' : 'bg-foreground/10'}`}>
                            <area.icon className={`h-5 w-5 ${expertise[area.id] ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground">{area.label}</p>
                                <Switch 
                                    checked={expertise[area.id]} 
                                    onCheckedChange={() => toggleExpertise(area.id)} 
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </GlassCard>
            </div>

            {/* Severity Edit */}
            <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Severity Preferences</h3>
                <div className="flex flex-wrap gap-4">
                {severityPreferences.map((severity) => (
                    <div
                    key={severity.id}
                    onClick={() => toggleSeverity(severity.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        severities[severity.id]
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/30 bg-foreground/5 hover:border-border/50'
                    }`}
                    >
                    <div className={`w-3 h-3 rounded-full ${severity.color}`} />
                    <span className="font-medium text-foreground">{severity.label}</span>
                    <Switch 
                        checked={severities[severity.id]} 
                        onCheckedChange={() => toggleSeverity(severity.id)} 
                        onClick={(e) => e.stopPropagation()}
                    />
                    </div>
                ))}
                </div>
            </GlassCard> 


            {/* Save Actions */}
            <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
                <Button className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
