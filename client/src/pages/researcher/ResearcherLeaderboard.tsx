import React from 'react';
import { TrendingUp, Flag, Check, ChevronsUpDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { API_URL } from '@/config';
import { Country, City } from 'country-state-city';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  username: string;
  reputation: number;
  bounties: number;
  reportsSubmitted: number;
  country: string;
  city: string;
  avatar: string;
};

const normalizeText = (v: string) => String(v || '').trim().toLowerCase();
const flagUrl = (iso2: string) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`;

export default function ResearcherLeaderboard() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [countryFilter, setCountryFilter] = React.useState('all');
  const [cityFilter, setCityFilter] = React.useState('all');
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [cityOpen, setCityOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 7;

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/users/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        if (res.ok) {
          setLeaderboard(payload.data?.leaderboard || []);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const countries = React.useMemo(() => {
    return Country.getAllCountries()
      .map((country) => ({ isoCode: country.isoCode, name: country.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedCountry = React.useMemo(
    () => countries.find((country) => country.isoCode === countryFilter) || null,
    [countries, countryFilter]
  );

  const cities = React.useMemo(() => {
    if (!selectedCountry) return [];
    const raw = City.getCitiesOfCountry(selectedCountry.isoCode) || [];
    const uniqueByName = new Map<string, string>();
    raw.forEach((city) => {
      const name = String(city.name || '').trim();
      const key = normalizeText(name);
      if (name && !uniqueByName.has(key)) uniqueByName.set(key, name);
    });
    return Array.from(uniqueByName.values()).sort((a, b) => a.localeCompare(b));
  }, [selectedCountry]);

  const filteredLeaderboard = React.useMemo(() => {
    let rows = leaderboard;
    if (countryFilter !== 'all') {
      rows = rows.filter((entry) => normalizeText(entry.country) === normalizeText(selectedCountry?.name || ''));
    }
    if (cityFilter !== 'all') {
      rows = rows.filter((entry) => normalizeText(entry.city) === normalizeText(cityFilter));
    }
    return rows.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [leaderboard, countryFilter, cityFilter, selectedCountry]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [countryFilter, cityFilter]);

  React.useEffect(() => {
    if (countryFilter === 'all') {
      setCityFilter('all');
      return;
    }
    if (cityFilter !== 'all' && !cities.includes(cityFilter)) {
      setCityFilter('all');
    }
  }, [countryFilter, cities, cityFilter]);

  const topThree = React.useMemo(() => {
    return filteredLeaderboard.slice(0, 3);
  }, [filteredLeaderboard]);

  const fullLeaderboard = React.useMemo(() => {
    return filteredLeaderboard;
  }, [filteredLeaderboard]);

  const listStartIndex = 3;
  const listData = fullLeaderboard.slice(listStartIndex);
  const totalPages = Math.max(1, Math.ceil(listData.length / itemsPerPage));

  const currentListItems = listData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in p-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Leaderboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Loading researchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Leaderboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Top security researchers on BugChase</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-1 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between font-normal"
                >
                  {countryFilter === 'all'
                    ? 'All Countries'
                    : selectedCountry?.name || countryFilter}
                  {countryFilter !== 'all' && (
                    <img
                      src={flagUrl(countryFilter)}
                      alt=""
                      className="ml-2 h-4 w-5 rounded-[2px] object-cover border border-zinc-300 dark:border-zinc-700"
                    />
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all countries"
                        onSelect={() => {
                          setCountryFilter('all');
                          setCityFilter('all');
                          setCountryOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', countryFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                        All Countries
                      </CommandItem>
                      {countries.map((country) => (
                        <CommandItem
                          key={country.isoCode}
                          value={`${country.name} ${country.isoCode}`}
                          onSelect={() => {
                            setCountryFilter(country.isoCode);
                            setCityFilter('all');
                            setCountryOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', countryFilter === country.isoCode ? 'opacity-100' : 'opacity-0')} />
                          <img
                            src={flagUrl(country.isoCode)}
                            alt=""
                            className="mr-2 h-4 w-5 rounded-[2px] object-cover border border-zinc-300 dark:border-zinc-700"
                          />
                          {country.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full sm:w-48">
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  disabled={countryFilter === 'all'}
                  className="w-full justify-between font-normal"
                >
                  {cityFilter === 'all' ? 'All Cities' : cityFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search city..." />
                  <CommandList>
                    <CommandEmpty>No city found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all cities"
                        onSelect={() => {
                          setCityFilter('all');
                          setCityOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', cityFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                        All Cities
                      </CommandItem>
                      {cities.map((city) => (
                        <CommandItem
                          key={city}
                          value={city}
                          onSelect={() => {
                            setCityFilter(city);
                            setCityOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', cityFilter === city ? 'opacity-100' : 'opacity-0')} />
                          {city}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {fullLeaderboard.length === 0 ? (
        <GlassCard className="p-8 text-center text-zinc-500 dark:text-zinc-400">
          No researchers found for selected filters.
        </GlassCard>
      ) : (
        <>
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
                                        className={cn(
                                          "w-full h-full rounded-full object-cover filter transition-all duration-500",
                                          index === 0 ? "grayscale-0" : "grayscale group-hover:grayscale-0"
                                        )}
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
                            {entry.country}{entry.city ? `, ${entry.city}` : ''}
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
                                    <span>{entry.country}{entry.city ? `, ${entry.city}` : ''}</span>
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
                      Showing <span className="font-bold text-zinc-900 dark:text-white">{listData.length ? ((currentPage - 1) * itemsPerPage) + 4 : 0}</span> - <span className="font-bold text-zinc-900 dark:text-white">{Math.min(currentPage * itemsPerPage + 3, fullLeaderboard.length)}</span> of {Math.max(0, fullLeaderboard.length - 3)} researchers
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
        </>
      )}
    </div>
  );
}
