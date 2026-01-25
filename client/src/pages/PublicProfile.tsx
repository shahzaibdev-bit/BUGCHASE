import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  Calendar, 
  Twitter, 
  Linkedin, 
  Trophy, 
  Target, 
  Bug, 
  Lock, 
  AlertCircle,
  BadgeCheck,
  Github,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PublicProfileData {
  isPrivate: boolean;
  nickname: string;
  name?: string;
  avatar?: string;
  country?: string;
  bio?: string;
  isVerified?: boolean;
  reputationScore?: number;
  trustScore?: number;
  linkedAccounts?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt?: string;
  skills?: string[];
  status?: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/p/${username}`);
        const data = await res.json();

        if (res.ok) {
          setProfile(data.data);
        } else {
          setError(data.message || 'Profile not found');
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchProfile();
  }, [username]);

  // Helper for URLs
  const getSocialUrl = (url?: string) => {
      if (!url) return '#';
      return url.startsWith('http') ? url : `https://${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full p-4 mb-4">
            <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Profile Not Found</h1>
        <p className="text-zinc-500 text-center max-w-md mb-8">
            The researcher profile you are looking for does not exist or refers to a username that hasn't been claimed yet.
        </p>
        <Button onClick={() => window.location.href = '/'} className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black">
            Back to Home
        </Button>
      </div>
    );
  }

  // Banned User Screen
  if (profile.status?.toLowerCase() === 'banned') {
      return (
          <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
               {/* Abstract Background */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl opacity-50" />
               </div>

               <div className="relative z-10 text-center max-w-lg mx-auto bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl">
                   <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                       <Ban className="w-10 h-10 text-red-600 dark:text-red-500" />
                   </div>
                   
                   <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Account Suspended</h1>
                   <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
                       The user <span className="font-semibold text-zinc-900 dark:text-white">@{profile.nickname}</span> has been banned for violating our terms of service.
                   </p>

                   <Button onClick={() => window.location.href = '/'} variant="outline" className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                       Return to BugChase
                   </Button>
               </div>
          </div>
      );
  }

  if (profile.isPrivate) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-100 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50" />
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-100 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3 transform transition-transform hover:rotate-0">
                <Lock className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
            </div>
            
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Private Profile</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-lg">
                <span className="font-semibold text-zinc-900 dark:text-white">@{profile.nickname}</span> has decided to keep their profile hidden. Only the researcher themself can view these details.
            </p>

            <Button onClick={() => window.location.href = '/'} variant="outline" className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Return to BugChase
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans selection:bg-emerald-500/30">
      
      {/* Cover / Header */}
      <div className="relative h-64 md:h-80 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-grid-zinc dark:bg-grid-zinc-dark opacity-[0.05]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-black to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-20">
        
        {/* Profile Header Card */}
        <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden bg-zinc-100">
                             <img 
                                src={profile.avatar || '/default.jpg'} 
                                alt={profile.nickname} 
                                className="w-full h-full object-cover"
                             />
                        </div>
                    </div>

                    {/* Socials (Desktop: Under Avatar) */}
                    <div className="hidden md:flex gap-2">
                        {profile.linkedAccounts?.github && (
                            <a href={getSocialUrl(profile.linkedAccounts.github)} target="_blank" rel="noopener noreferrer">
                                 <Button size="icon" variant="ghost" className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                                     <Github className="w-5 h-5" />
                                 </Button>
                            </a>
                        )}
                        {profile.linkedAccounts?.twitter && (
                            <a href={getSocialUrl(profile.linkedAccounts.twitter)} target="_blank" rel="noopener noreferrer">
                                 <Button size="icon" variant="ghost" className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-blue-400 transition-colors">
                                     <Twitter className="w-5 h-5" />
                                 </Button>
                            </a>
                        )}
                         {profile.linkedAccounts?.linkedin && (
                            <a href={getSocialUrl(profile.linkedAccounts.linkedin)} target="_blank" rel="noopener noreferrer">
                                 <Button size="icon" variant="ghost" className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-blue-600 transition-colors">
                                     <Linkedin className="w-5 h-5" />
                                 </Button>
                            </a>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left space-y-5">
                    <div>
                         <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                {profile.name || profile.nickname}
                                {profile.isVerified && (
                                    <BadgeCheck className="w-8 h-8 fill-blue-500 text-white drop-shadow-sm shrink-0" />
                                )}
                            </h1>
                         </div>
                         <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium mb-3 flex items-center justify-center md:justify-start gap-2">
                            @{profile.nickname}
                            {(profile.trustScore || 0) > 90 && (
                                <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-xs py-0.5">
                                    VERIFIED
                                </Badge>
                            )}
                         </p>
                        <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm uppercase tracking-wider">Bug Bounty Researcher</p>
                    </div>

                    <div className="min-h-[60px] py-2">
                        {profile.bio ? (
                            <p className="text-zinc-600 dark:text-zinc-300 max-w-3xl text-lg leading-relaxed font-light">
                                {profile.bio}
                            </p>
                        ) : (
                            <p className="text-zinc-400 dark:text-zinc-600 italic font-light">
                                "This researcher prefers to let their bugs speak for themselves."
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-zinc-500 dark:text-zinc-400 pt-2">
                         {profile.country && (
                             <div className="flex items-center gap-2">
                                 <MapPin className="w-4 h-4 text-zinc-400" />
                                 {profile.country}
                             </div>
                         )}
                         <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-zinc-400" />
                             Joined {new Date(profile.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                         </div>

                         {/* Mobile Socials */}
                         <div className="flex md:hidden gap-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 items-center">
                            {profile.linkedAccounts?.github && (
                                <a href={getSocialUrl(profile.linkedAccounts.github)} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
                                     <Github className="w-4 h-4" />
                                </a>
                            )}
                            {profile.linkedAccounts?.twitter && (
                                <a href={getSocialUrl(profile.linkedAccounts.twitter)} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
                                     <Twitter className="w-4 h-4" />
                                </a>
                            )}
                            {profile.linkedAccounts?.linkedin && (
                                <a href={getSocialUrl(profile.linkedAccounts.linkedin)} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
                                     <Linkedin className="w-4 h-4" />
                                </a>
                            )}
                         </div>
                    </div>

                     {/* Action Buttons */}
                     <div className="pt-6 flex justify-center md:justify-start gap-4">
                         <Button className="h-11 px-8 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                             Hire Researcher
                         </Button>
                         <Button variant="outline" className="h-11 px-8 rounded-full border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5">
                             Send Message
                         </Button>
                     </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stats Column */}
            <div className="md:col-span-1 space-y-6">
                 {/* Key Metrics */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5" /> Vital Stats
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                             <div className="flex justify-between items-end mb-2">
                                 <span className="text-sm text-zinc-500">Reputation</span>
                                 <span className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{profile.reputationScore || 0}</span>
                             </div>
                             <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-black dark:bg-white w-[60%]" />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                                 <span className="block text-2xl font-bold text-zinc-900 dark:text-white mb-1">98%</span>
                                 <span className="text-xs text-zinc-500 uppercase tracking-wider">Accuracy</span>
                             </div>
                              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                                 <span className="block text-2xl font-bold text-zinc-900 dark:text-white mb-1">12</span>
                                 <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports</span>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Skills */}
                {profile.skills && profile.skills.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map(skill => (
                                <Badge key={skill} variant="secondary" className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Achievements Column */}
            <div className="md:col-span-2">
                 <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm h-full">
                     <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                        <Trophy className="w-5 h-5" /> Achievements
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3].map((i) => (
                             <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                  <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700 shrink-0">
                                      <Trophy className="w-6 h-6 text-yellow-500" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Top Hunter 2024</h4>
                                      <p className="text-xs text-zinc-500">Ranked in the top 10% of researchers.</p>
                                  </div>
                             </div>
                        ))}
                    </div>
                    
                    {/* Empty State / Call to action */}
                    <div className="mt-8 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
                         <Bug className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                         <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                             More achievements are locked. <br/>
                             <span className="text-black dark:text-white font-medium">Coming soon.</span>
                         </p>
                    </div>
                 </div>
            </div>

        </div>
      </div>

    </div>
  );
}
