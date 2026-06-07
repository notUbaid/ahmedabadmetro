import { useState, useMemo } from 'react';
import { X, Home, Briefcase, Train, ArrowLeftRight, Trash2 } from 'lucide-react';
import { stations, LINE_COLORS } from '@/data/metroData';
import { getOrganizedStations } from '@/lib/routePlanner';
import { 
  getCommuteSettings, 
  saveCommuteSettings, 
  clearCommuteSettings,
  CommuteSettings 
} from '@/lib/commuteStorage';

interface CommuteSetupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommuteSetup = ({ isOpen, onClose }: CommuteSetupProps) => {
  const [homeStation, setHomeStation] = useState<string>('');
  const [workStation, setWorkStation] = useState<string>('');
  const [homeSearch, setHomeSearch] = useState('');
  const [workSearch, setWorkSearch] = useState('');
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showWorkDropdown, setShowWorkDropdown] = useState(false);
  
  const existingSettings = getCommuteSettings();
  const organizedStations = useMemo(() => getOrganizedStations(), []);
  const allStations = useMemo(() => Object.values(stations), []);

  useState(() => {
    if (existingSettings) {
      setHomeStation(existingSettings.homeStation);
      setWorkStation(existingSettings.workStation);
      setHomeSearch(stations[existingSettings.homeStation]?.name || '');
      setWorkSearch(stations[existingSettings.workStation]?.name || '');
    }
  });

  const filteredHomeStations = useMemo(() => {
    if (!homeSearch) return [];
    return allStations.filter(s => 
      s.name.toLowerCase().includes(homeSearch.toLowerCase())
    ).slice(0, 8);
  }, [allStations, homeSearch]);

  const filteredWorkStations = useMemo(() => {
    if (!workSearch) return [];
    return allStations.filter(s => 
      s.name.toLowerCase().includes(workSearch.toLowerCase())
    ).slice(0, 8);
  }, [allStations, workSearch]);

  const handleSave = () => {
    if (homeStation && workStation && homeStation !== workStation) {
      const settings: CommuteSettings = {
        homeStation,
        workStation,
        homeToWorkDismissCount: existingSettings?.homeToWorkDismissCount || 0,
        workToHomeDismissCount: existingSettings?.workToHomeDismissCount || 0,
      };
      saveCommuteSettings(settings);
      onClose();
    }
  };

  const handleClear = () => {
    clearCommuteSettings();
    setHomeStation('');
    setWorkStation('');
    setHomeSearch('');
    setWorkSearch('');
  };

  const selectHome = (stationId: string) => {
    setHomeStation(stationId);
    setHomeSearch(stations[stationId]?.name || '');
    setShowHomeDropdown(false);
  };

  const selectWork = (stationId: string) => {
    setWorkStation(stationId);
    setWorkSearch(stations[stationId]?.name || '');
    setShowWorkDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div 
        className="bg-background rounded-2xl shadow-2xl border border-border max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Daily Commute</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Set up your daily route and get quick access to upcoming trains when you're near your home or work station.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border focus-within:border-primary transition-colors">
                <Home className="w-4 h-4 text-green-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Home station..."
                  value={homeSearch}
                  onChange={(e) => {
                    setHomeSearch(e.target.value);
                    setShowHomeDropdown(true);
                    if (!e.target.value) setHomeStation('');
                  }}
                  onFocus={() => setShowHomeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowHomeDropdown(false), 200)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {showHomeDropdown && homeSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {filteredHomeStations.length > 0 ? (
                    filteredHomeStations.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => selectHome(s.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Train className="w-3 h-3 text-muted-foreground" />
                        <span>{s.name}</span>
                        <div className="flex gap-1 ml-auto">
                          {s.lines.map(l => (
                            <span
                              key={l}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                            />
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No stations found</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border focus-within:border-primary transition-colors">
                <Briefcase className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Work station..."
                  value={workSearch}
                  onChange={(e) => {
                    setWorkSearch(e.target.value);
                    setShowWorkDropdown(true);
                    if (!e.target.value) setWorkStation('');
                  }}
                  onFocus={() => setShowWorkDropdown(true)}
                  onBlur={() => setTimeout(() => setShowWorkDropdown(false), 200)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {showWorkDropdown && workSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {filteredWorkStations.length > 0 ? (
                    filteredWorkStations.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => selectWork(s.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Train className="w-3 h-3 text-muted-foreground" />
                        <span>{s.name}</span>
                        <div className="flex gap-1 ml-auto">
                          {s.lines.map(l => (
                            <span
                              key={l}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: LINE_COLORS[l as keyof typeof LINE_COLORS] }}
                            />
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No stations found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {existingSettings && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Current commute:</p>
              <p className="text-sm font-medium">
                {stations[existingSettings.homeStation]?.name} ↔ {stations[existingSettings.workStation]?.name}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!homeStation || !workStation || homeStation === workStation}
              className="flex-1 py-3 px-4 rounded-xl font-medium bg-primary text-primary-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Commute
            </button>
            {existingSettings && (
              <button
                onClick={handleClear}
                className="py-3 px-4 rounded-xl font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommuteSetup;
