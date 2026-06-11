import { useState, useEffect } from 'react';
import { X, Train, Clock, Search, Map } from 'lucide-react';

export const WelcomeOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-muted/50 hover:bg-muted rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="bg-primary/10 p-6 text-center border-b border-primary/20">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Train className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Welcome to AhmMetro!</h2>
          <p className="text-muted-foreground mt-2 text-sm">Your digital guide to stress-free travel on the AhmMetro.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Plan Your Journey</h3>
              <p className="text-xs text-muted-foreground mt-1">Get accurate timetable-based routes, fare details, and exact interchange wait times.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
              <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Live Animated Map</h3>
              <p className="text-xs text-muted-foreground mt-1">Watch metros move across the network in real-time, click on them to track and share.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Custom Times & Future Trips</h3>
              <p className="text-xs text-muted-foreground mt-1">Choose a specific departure or arrival time to plan your trips in advance effortlessly.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex justify-center">
          <button 
            onClick={handleClose} 
            className="group w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
          >
            <span>Let's Go!</span>
            <Train className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  );
};
