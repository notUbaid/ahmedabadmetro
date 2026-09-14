import { useState, useEffect } from "react";
import { Lightbulb, Clock, CreditCard, Users, MapPin, Train, Info, X, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TipsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TipsDialog = ({ isOpen, onOpenChange }: TipsDialogProps) => {
    const { language } = useLanguage();
    const [openSection, setOpenSection] = useState<string | null>("network");

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onOpenChange(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onOpenChange]);

    if (!isOpen) return null;

    const toggleSection = (section: string) => {
        setOpenSection(prev => (prev === section ? null : section));
    };

    const networkInfo = [
        {
            icon: Train,
            title: t('tips.net1Title', language),
            content: t('tips.net1Desc', language),
        },
        {
            icon: MapPin,
            title: t('tips.net2Title', language),
            content: t('tips.net2Desc', language),
        },
        {
            icon: Clock,
            title: t('tips.net3Title', language),
            content: t('tips.net3Desc', language),
        },
    ];

    const tips = [
        {
            title: t('tips.tip1Title', language),
            content: t('tips.tip1Desc', language),
        },
        {
            title: t('tips.tip2Title', language),
            content: t('tips.tip2Desc', language),
        },
        {
            title: t('tips.tip3Title', language),
            content: t('tips.tip3Desc', language),
        },
        {
            title: t('tips.tip4Title', language),
            content: t('tips.tip4Desc', language),
        },
        {
            title: t('tips.tip5Title', language),
            content: t('tips.tip5Desc', language),
        },
        {
            title: t('tips.tip6Title', language),
            content: t('tips.tip6Desc', language),
        },
        {
            title: t('tips.tip7Title', language),
            content: t('tips.tip7Desc', language),
        },
        {
            title: t('tips.tip8Title', language),
            content: t('tips.tip8Desc', language),
        },
    ];

    const practicalInfo = [
        {
            icon: CreditCard,
            title: t('tips.prac1Title', language),
            content: t('tips.prac1Desc', language),
        },
        {
            icon: Info,
            title: t('tips.prac2Title', language),
            content: t('tips.prac2Desc', language),
        },
        {
            icon: Users,
            title: t('tips.prac3Title', language),
            content: t('tips.prac3Desc', language),
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => onOpenChange(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tips-dialog-title"
        >
            <div
                className="relative w-full max-w-md max-h-[85vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-2 text-xl font-semibold" id="tips-dialog-title">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <span>{t('tips.title', language)}</span>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Network Section */}
                    <div className="border rounded-xl bg-card px-4 py-1 shadow-sm transition-all">
                        <button
                            type="button"
                            onClick={() => toggleSection("network")}
                            className="w-full flex items-center justify-between hover:no-underline py-3 text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-base">{t('tips.networkTitle', language)}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", openSection === "network" && "rotate-180")} />
                        </button>
                        {openSection === "network" && (
                            <div className="pt-2 pb-4 space-y-4 animate-in fade-in-50 duration-200 border-t border-border/50 mt-1">
                                {networkInfo.map((item, index) => (
                                    <div key={index} className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mt-0.5">
                                            <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {item.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pro Tips Section */}
                    <div className="border rounded-xl bg-card px-4 py-1 shadow-sm transition-all">
                        <button
                            type="button"
                            onClick={() => toggleSection("tips")}
                            className="w-full flex items-center justify-between hover:no-underline py-3 text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Lightbulb className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-base">{t('tips.proTipsTitle', language)}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", openSection === "tips" && "rotate-180")} />
                        </button>
                        {openSection === "tips" && (
                            <div className="pt-2 pb-4 grid grid-cols-1 gap-3 animate-in fade-in-50 duration-200 border-t border-border/50 mt-1">
                                {tips.map((tip, index) => (
                                    <div key={index} className="bg-muted/40 p-3 rounded-lg space-y-1.5 border border-border/50">
                                        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            {tip.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed pl-3.5">
                                            {tip.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Practical Info Section */}
                    <div className="border rounded-xl bg-card px-4 py-1 shadow-sm transition-all">
                        <button
                            type="button"
                            onClick={() => toggleSection("practical")}
                            className="w-full flex items-center justify-between hover:no-underline py-3 text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-base">{t('tips.practicalTitle', language)}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", openSection === "practical" && "rotate-180")} />
                        </button>
                        {openSection === "practical" && (
                            <div className="pt-2 pb-4 space-y-4 animate-in fade-in-50 duration-200 border-t border-border/50 mt-1">
                                {practicalInfo.map((item, index) => (
                                    <div key={index} className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                                            <item.icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {item.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live Tracking Card */}
                    <div className="pt-2">
                        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-200 dark:border-orange-900">
                            <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2">
                                <Train className="w-4 h-4" />
                                {t('tips.liveTrackingTitle', language)}
                            </h3>
                            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1 leading-relaxed">
                                {t('tips.liveTrackingDesc', language)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
