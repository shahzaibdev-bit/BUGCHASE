import React from 'react';
import { Trophy, Medal, TrendingUp, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { mockLeaderboard } from '@/data/mockData';

export default function ResearcherLeaderboard() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 7;

  // Generate extended leaderboard data
  const fullLeaderboard = React.useMemo(() => {
    const baseData = mockLeaderboard;
    const extraData = Array.from({ length: 40 }).map((_, i) => ({
      rank: baseData.length + i + 1,
      userId: `mock-${i + 1}`,
      name: `Researcher ${baseData.length + i + 1}`,
      reputation: Math.floor(3000 - i * 50),
      bounties: Math.floor(8000 - i * 100),
      reportsSubmitted: Math.floor(15 - i * 0.2),
      country: 'Global',
      avatar: `https://i.pravatar.cc/150?u=mock-${i}`
    }));
    return [...baseData, ...extraData];
  }, []);

  // Top 3 are always static
  const topThree = fullLeaderboard.slice(0, 3);
  
  // Pagination logic for the rest (Rank 4+)
  const listStartIndex = 3;
  const listData = fullLeaderboard.slice(listStartIndex);
  const totalPages = Math.ceil(listData.length / itemsPerPage);
  
  const currentListItems = listData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Leaderboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Top security researchers on BugChase</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {topThree.map((entry, index) => (
          <div key={entry.userId} className={`${index === 0 ? 'md:order-2 z-10' : index === 1 ? 'md:order-1' : 'md:order-3'} h-full`}>
            <InvertedTiltCard intensity={15} className="h-full rounded-2xl">
              <InverseSpotlightCard 
                spotlightColor="rgba(120, 120, 120, 0.2)"
                className={`h-full text-center relative overflow-hidden group transition-all duration-300 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl ${index === 0 ? 'scale-105 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50' : 'hover:-translate-y-1'}`}
              >
                {/* Monochrome Decoration Bar */}
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300 dark:from-zinc-800 dark:via-zinc-500 dark:to-zinc-800 opacity-50`} />

                <div className="pt-8 pb-6 px-4">
                    {/* Profile Image with Monochrome Ring */}
                    <div className="relative mx-auto mb-6 w-24 h-24">
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400 dark:from-zinc-700 dark:to-black p-[2px] ${index === 0 ? 'animate-pulse-slow' : ''}`}>
                            <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center p-1">
                                <img 
                                    src={entry.avatar || `https://i.pravatar.cc/150?u=${entry.userId}`}
                                    alt={entry.name}
                                    className="w-full h-full rounded-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                                />
                            </div>
                        </div>
                        
                        {/* Rank Badge */}
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-black bg-zinc-100 text-black font-black text-sm z-20 shadow-lg ${
                            index === 0 ? 'bg-white dark:bg-white scale-110' : 'bg-zinc-200 dark:bg-zinc-300'
                        }`}>
                            #{entry.rank}
                        </div>
                    </div>

                    <h3 className="font-bold text-xl text-zinc-900 dark:text-white mb-2 tracking-tight group-hover:text-black dark:group-hover:text-zinc-200 transition-colors">{entry.name}</h3>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-zinc-500 mb-6 uppercase tracking-wider">
                        <Flag className="h-3 w-3" />
                        {entry.country}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 dark:border-white/5 pt-6">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">Reputation</p>
                            <p className="font-bold text-lg text-zinc-900 dark:text-white font-mono">{entry.reputation.toLocaleString()}</p>
                        </div>
                         <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">Paid Reports</p>
                            <p className="font-bold text-lg text-zinc-700 dark:text-zinc-300 font-mono">{entry.reportsSubmitted}</p>
                        </div>
                    </div>
                </div>
              </InverseSpotlightCard>
            </InvertedTiltCard>
          </div>
        ))}
      </div>

      {/* Paginated List */}
      <div className="space-y-4">
          <GlassCard className="overflow-hidden p-0 border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="text-left py-4 px-6 font-mono text-xs uppercase tracking-wider text-zinc-500">Rank</th>
                    <th className="text-left py-4 px-6 font-mono text-xs uppercase tracking-wider text-zinc-500">Name</th>
                    <th className="text-left py-4 px-6 font-mono text-xs uppercase tracking-wider text-zinc-500">Reputation</th>
                    <th className="text-right py-4 px-6 font-mono text-xs uppercase tracking-wider text-zinc-500">Paid Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {currentListItems.map((entry) => (
                    <tr 
                      key={entry.userId}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-default"
                    >
                      <td className="py-4 px-6">
                          <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">#{entry.rank}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-2 ring-transparent group-hover:ring-emerald-500/50 transition-all">
                              <img 
                                src={entry.avatar || `https://i.pravatar.cc/150?u=${entry.userId}`}
                                alt={entry.name}
                                className="w-full h-full object-cover"
                              />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm">{entry.name}</p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <span>{entry.country}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <span className="font-bold text-zinc-700 dark:text-zinc-200">{entry.reputation.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                          <span className="font-mono text-zinc-600 dark:text-zinc-400">{entry.reportsSubmitted}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-zinc-500">
                  Showing <span className="font-bold text-zinc-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 4}</span> - <span className="font-bold text-zinc-900 dark:text-white">{Math.min(currentPage * itemsPerPage + 3, fullLeaderboard.length)}</span> of {fullLeaderboard.length - 3} researchers
              </p>
              
              <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                      Previous
                  </button>
                  <div className="px-2 text-sm font-mono text-zinc-500">
                      Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                      Next
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}
