import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Lightbulb, Clock, CreditCard, Users, MapPin, Train, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";

interface TipsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TipsDialog = ({ isOpen, onOpenChange }: TipsDialogProps) => {
    const { language } = useLanguage();

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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        {t('tips.title', language)}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-2 sm:p-6">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <AccordionItem value="network" className="border rounded-lg bg-card px-4 py-1 data-[state=open]:shadow-sm transition-all">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-base">{t('tips.networkTitle', language)}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
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
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="tips" className="border rounded-lg bg-card px-4 py-1 data-[state=open]:shadow-sm transition-all">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Lightbulb className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-base">{t('tips.proTipsTitle', language)}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 grid grid-cols-1 gap-4">
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
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="practical" className="border rounded-lg bg-card px-4 py-1 data-[state=open]:shadow-sm transition-all">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-base">{t('tips.practicalTitle', language)}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-4">
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
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="mt-6">
                            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                                <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2">
                                    <Train className="w-4 h-4" />
                                    {t('tips.liveTrackingTitle', language)}
                                </h3>
                                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                    {t('tips.liveTrackingDesc', language)}
                                </p>
                            </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
