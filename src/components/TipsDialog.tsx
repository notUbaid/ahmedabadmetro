import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Lightbulb, Clock, CreditCard, Users, MapPin, Train, Info } from "lucide-react";

interface TipsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TipsDialog = ({ isOpen, onOpenChange }: TipsDialogProps) => {
    const networkInfo = [
        {
            icon: Train,
            title: "Network Overview",
            content:
                "4 metro lines covering 45 stations. Blue Line (Vastral–Thaltej), Red Line (APMC–Koteshwar), Green Line (Koteshwar–Mahatma Mandir), and Purple Line (GNLU–GIFT City).",
        },
        {
            icon: MapPin,
            title: "Interchange Stations",
            content:
                "Old High Court connects Blue Line with the North-South corridor. Koteshwar Road connects Red Line (south) with Green Line (north). Some trains run through without transfer.",
        },
        {
            icon: Clock,
            title: "Operating Hours",
            content:
                "Blue/Red Lines: 6:20 AM – 10:00 PM. Green Line: 7:33 AM – 8:09 PM. Purple Line: 7:36 AM – 7:13 PM (with midday gap 10:18 AM – 4:06 PM).",
        },
    ];

    const tips = [
        {
            title: "Corridor Through-Running Trains",
            content:
                "Some trains run directly from APMC to Mahatma Mandir or GIFT City without requiring a change at Koteshwar Road. Check the train destination display before boarding.",
        },
        {
            title: "Board Before the Interchange",
            content:
                "If changing at Old High Court or Koteshwar Road, board one station earlier when possible. You'll get a seat and avoid the rush at interchange stations.",
        },
        {
            title: "Let One Train Go",
            content:
                "If a train arrives packed, don't force yourself in. The next one is usually 7–12 minutes later and far more comfortable.",
        },
        {
            title: "Purple Line Has Limited Service",
            content:
                "GNLU ↔ GIFT City runs only morning and evening services with no trains from ~10 AM to 4 PM. Always check the schedule before planning trips to GIFT City.",
        },
        {
            title: "Peak Hours to Avoid",
            content:
                "Trains are most crowded 8–11 AM and 5–8 PM on weekdays. If flexible, travel just before or after these windows for a more comfortable journey.",
        },
        {
            title: "Stand Near Middle of Platform",
            content:
                "At major stations, middle coaches stop closest to stairs and exits. This saves walking time and gets you out faster.",
        },
        {
            title: "For Stadium Events, Plan Ahead",
            content:
                "Going to Motera Stadium? Reach early for empty trains. After the event, wait 20–30 minutes for crowds to thin out before heading to the metro.",
        },
        {
            title: "Weekend Frequency is Lower",
            content:
                "Trains run less frequently on Sundays (every 12 min on Blue Line vs 7 min on weekday peak). Factor in extra waiting time for weekend trips.",
        },
        {
            title: "First/Last Coach for Less Crowd",
            content:
                "First and last coaches are usually less crowded than middle ones. Good option if you don't mind a slightly longer walk to exits.",
        },
    ];

    const practicalInfo = [
        {
            icon: CreditCard,
            title: "Metro Smart Card",
            content:
                "Get a rechargeable metro card for ~10% fare discount and skip ticket counter queues. Available at any station counter. Worth it even for occasional riders.",
        },
        {
            icon: Info,
            title: "Fares & Tokens",
            content:
                "Fare is distance-based (₹5 to ₹25). Keep your token/card until exit — you need it to open exit gates. Lost token penalty applies.",
        },
        {
            icon: Users,
            title: "Ask Metro Staff",
            content:
                "Station staff in uniform know exact platforms and timings. Look for them near entry gates or platform ends. Don't rely on fellow passengers who might be guessing.",
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Passenger Guide
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Network Info</h2>
                            {networkInfo.map((item, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <item.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-primary text-sm">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {item.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-6 space-y-4">
                            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Travel Tips</h2>
                            {tips.map((tip, index) => (
                                <div key={index} className="space-y-1">
                                    <h3 className="font-semibold text-primary text-sm">{tip.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {tip.content}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-6 space-y-4">
                            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Practical Info</h2>
                            {practicalInfo.map((item, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <item.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-primary text-sm">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {item.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-6">
                            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                                <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2">
                                    <Train className="w-4 h-4" />
                                    Live Train Tracking
                                </h3>
                                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                    Tap any orange train icon on the map to see its details and share your journey with friends so they can track you in real-time.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
