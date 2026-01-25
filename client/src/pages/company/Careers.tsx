import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { DecryptionText } from '@/components/solutions/TextEffects';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Careers = () => {
  const jobs = [
    {
      role: "Senior Security Engineer",
      department: "Triage Team",
      location: "Remote (PK)",
      type: "Full-time"
    },
    {
      role: "Frontend Developer (React)",
      department: "Product",
      location: "Islamabad",
      type: "Full-time"
    },
    {
      role: "DevSecOps Specialist",
      department: "Infrastructure",
      location: "Lahore",
      type: "Contract"
    },
    {
      role: "Community Manager",
      department: "Growth",
      location: "Karachi",
      type: "Full-time"
    }
  ];

  return (
    <SolutionsLayout>
      <div className="container mx-auto px-4 py-24 min-h-screen flex flex-col items-center">
        
        {/* Hero Section - Clean & Text-Only */}
        <div className="text-center mb-24 max-w-2xl">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white mb-6">
            JOIN THE <br />
            <span className="text-zinc-400 dark:text-gray-300">
                <DecryptionText text="TEAM" />
            </span>
          </h1>
          
          <p className="text-xl text-zinc-500 dark:text-white/40 font-mono">
            Work at the forefront of cybersecurity. We are hiring.
          </p>
        </div>

        {/* The Job Board - Vertical List */}
        <div className="w-full max-w-5xl space-y-4">
            {jobs.map((job, i) => (
                <div 
                    key={i}
                    className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-8 border-b border-black/15 dark:border-white/10 hover:border-black/50 dark:hover:border-white bg-transparent hover:bg-zinc-50 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer"
                >
                    {/* Left: Job Title */}
                    <div className="flex-1 mb-2 md:mb-0">
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-white transition-colors">
                            {job.role}
                        </h3>
                    </div>

                    {/* Middle: Department */}
                    <div className="flex-1 md:text-center mb-2 md:mb-0">
                         <span className="font-mono text-zinc-500 dark:text-gray-400 text-sm">
                            {`// ${job.department}`}
                         </span>
                    </div>

                    {/* Right: Location & Type + Arrow */}
                    <div className="flex-1 flex items-center justify-end gap-6 text-right">
                        <div className="text-zinc-500 dark:text-white/40 text-sm font-mono">
                            {job.location} • {job.type}
                        </div>
                        
                        <ArrowRight className="w-5 h-5 text-zinc-900 dark:text-white opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                </div>
            ))}
        </div>

        {/* Footer / CTA */}
        <div className="mt-16 text-center">
            <Link to="#" className="font-mono text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-white/70 transition-colors flex items-center gap-2 text-sm uppercase tracking-wider">
                View All Openings <ArrowRight className="w-4 h-4" />
            </Link>
        </div>

      </div>
    </SolutionsLayout>
  );
};

export default Careers;
