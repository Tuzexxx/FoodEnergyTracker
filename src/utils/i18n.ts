export type Language = 'en' | 'cs' | 'de';

export function getInitialLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    
    const stored = localStorage.getItem('macrotrack-storage');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.language && ['en', 'cs', 'de'].includes(parsed.state.language)) {
                return parsed.state.language;
            }
        } catch (e) {}
    }

    const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    if (browserLang.startsWith('cs') || browserLang.startsWith('sk')) return 'cs';
    if (browserLang.startsWith('de')) return 'de';
    return 'en';
}

export interface Translations {
    common: {
        appTitle: string;
        byAuthor: string;
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        done: string;
        apply: string;
        reset: string;
        loading: string;
        error: string;
        adjust: string;
        recalculate: string;
        guestMode: string;
        logInSave: string;
        settings: string;
        kcal: string;
        protein: string;
        carbs: string;
        fat: string;
        grams: string;
        points: string;
    };
    tabs: {
        day: string;
        progress: string;
        coaching: string;
    };
    macro: {
        trackerTitle: string;
        gymBonus: string;
        gymActive: string;
        gymInactive: string;
        calories: string;
        proteinLabel: string;
        carbsLabel: string;
        fatLabel: string;
        consumed: string;
        target: string;
        remaining: string;
        left: string;
        exceeded: string;
        targetHit: string;
        clickToToggle: string;
    };
    coaching: {
        bannerTag: string;
        title: string;
        subtitle: string;
        yesterday: string;
        today: string;
        sevenDays: string;
        yesterdaySubtitle: string;
        todaySubtitle: string;
        sevenDaysSubtitle: string;
        runButton: string;
        recalculateButton: string;
        analyzingButton: string;
        activityModeGym: string;
        activityModeRest: string;
        mealsLogged: string;
        yesterdayMeals: string;
        sevenDaysMeals: string;
        noYesterdayData: string;
        minMealsRequired: string;
        emptyTitle: string;
        emptyDescription: string;
        emptyAction: string;
        loadingTitle: string;
        loadingSubtitle: string;
        overallScore: string;
        scoreOutOf: string;
        macroIntegrityTitle: string;
        nutrientTimingTitle: string;
        metabolicLeaksTitle: string;
        directivesTitle: string;
        directivesTitleYesterday: string;
        directivesTitleWeekly: string;
        highPriority: string;
        mediumPriority: string;
        errorTitle: string;
        errorMessage: string;
        loginRequired: string;
        loginPrompt: string;
        loginButton: string;
        dailyLimitReached: string;
        vipUnlimitedBadge: string;
        dailyQuota: string;
        translatingAnalysis: string;
    };
    dailyLog: {
        todayLog: string;
        yesterdayLog: string;
        noMeals: string;
        noMealsSub: string;
        time: string;
        namePlaceholder: string;
        reviewNeeded: string;
        reviewNotice: string;
        askCoach: string;
        askCoachPlaceholder: string;
        portion: string;
        deleteConfirm: string;
    };
    smartLogging: {
        placeholderNormal: string;
        placeholderListening: string;
        placeholderImage: string;
        addPhoto: string;
        voiceDictation: string;
        voiceListening: string;
        favorites: string;
        viewProgress: string;
        analyzingImage: string;
        retrying: string;
        clarifying: string;
        favEmpty: string;
        editFavorites: string;
        takePhoto: string;
        takePhotoSub: string;
        chooseGallery: string;
        chooseGallerySub: string;
        batchUpload: string;
        batchUploadSub: string;
    };
    progress: {
        title: string;
        sevenDays: string;
        thirtyDays: string;
        deficitBadge: string;
        surplusBadge: string;
        pureFatBurned: string;
        estimatedFatStored: string;
        sugarCubesEquivalent: string;
        sugarCubesLabel: string;
        showSugarPile: string;
        sugarModalTitle: string;
        sugarModalDesc: string;
        optimalPlanTitle: string;
        optimalPlanDesc: string;
        planEfficiency: string;
        actualVsOptimal: string;
        netEnergy: string;
        gymDays: string;
        totalConsumed: string;
        totalBurned: string;
        avgPerDay: string;
        smartwatchTitle: string;
        smartwatchDesc: string;
        calibratingTitle: string;
        calibratingDesc: string;
    };
    calendar: {
        legendHit: string;
        legendMiss: string;
        noData: string;
    };
    settings: {
        title: string;
        language: string;
        sex: string;
        male: string;
        female: string;
        age: string;
        height: string;
        weight: string;
        activityLevel: string;
        objective: string;
        customTargets: string;
        customTargetsDesc: string;
        wipeTitle: string;
        wipeConfirm: string;
        signOut: string;
        signOutConfirm: string;
    };
    auth: {
        title: string;
        subtitle: string;
        email: string;
        password: string;
        signIn: string;
        createAccount: string;
        haveAccount: string;
        needAccount: string;
        continueGuest: string;
        guestDesc: string;
    };
}

export const translations: Record<Language, Translations> = {
    en: {
        common: {
            appTitle: 'MacroTrack',
            byAuthor: 'by MiHo',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            done: 'Done',
            apply: 'Apply',
            reset: 'Reset',
            loading: 'Loading...',
            error: 'Error',
            adjust: 'Adjust',
            recalculate: 'Recalculate',
            guestMode: 'Guest Mode',
            logInSave: 'Log In / Save',
            settings: 'Settings',
            kcal: 'kcal',
            protein: 'Protein',
            carbs: 'Carbs',
            fat: 'Fat',
            grams: 'g',
            points: 'points',
        },
        tabs: {
            day: 'Day',
            progress: 'Progress',
            coaching: 'Coaching',
        },
        macro: {
            trackerTitle: 'Macro Tracker',
            gymBonus: 'Exercise Day',
            gymActive: 'Active Workout Mode (+300 kcal)',
            gymInactive: 'Base Daily Target',
            calories: 'Calories',
            proteinLabel: 'Protein',
            carbsLabel: 'Carbs',
            fatLabel: 'Fat',
            consumed: 'Consumed',
            target: 'Target',
            remaining: 'Remaining',
            left: 'left',
            exceeded: 'exceeded',
            targetHit: 'Target Hit',
            clickToToggle: 'Click to toggle carbs & fat details',
        },
        coaching: {
            bannerTag: 'AI Strategic Coaching Telemetry',
            title: 'Nutrition & Performance Coaching',
            subtitle: 'Real-time metabolic audit & tactical recommendations',
            yesterday: 'Yesterday',
            today: 'Today',
            sevenDays: '7 Days',
            yesterdaySubtitle: "Objective audit of yesterday's completed nutrition & recovery",
            todaySubtitle: 'Real-time daily audit & nutrient timing',
            sevenDaysSubtitle: '7-day consistency & weekly trend audit',
            runButton: 'Run Coaching Audit',
            recalculateButton: 'Recalculate',
            analyzingButton: 'Analyzing...',
            activityModeGym: 'Workout / Active Mode (+300 kcal)',
            activityModeRest: 'Base Target / Recovery Mode',
            mealsLogged: 'meals logged today',
            yesterdayMeals: 'meals logged yesterday',
            sevenDaysMeals: 'meals logged across 7 days',
            noYesterdayData: 'No completed data recorded for yesterday.',
            minMealsRequired: 'Log at least 3 meals today to unlock AI coaching (currently {count}/3)',
            emptyTitle: '1-Click Nutrition Audit',
            emptyDescription: 'AI coach audits your nutrient timing, macro ratios, metabolic friction, and delivers 3 tactical directives.',
            emptyAction: 'Analyze Telemetry',
            loadingTitle: 'Auditing metabolic leaks and nutrient timing...',
            loadingSubtitle: 'Analyzing macro balance and training recovery',
            overallScore: 'Performance Score',
            scoreOutOf: '/ 100 points',
            macroIntegrityTitle: 'Macro Integrity & Density',
            nutrientTimingTitle: 'Nutrient Timing & Recovery',
            metabolicLeaksTitle: 'Identified Metabolic Leaks & Friction',
            directivesTitle: '3 Tactical Directives for Tomorrow',
            directivesTitleYesterday: '3 Tactical Directives for Today',
            directivesTitleWeekly: '3 Strategic Directives for Next Week',
            highPriority: 'High Priority',
            mediumPriority: 'Medium',
            errorTitle: 'Coaching Analysis Error',
            errorMessage: 'Unable to generate analysis. Please try again.',
            loginRequired: 'Account Required for Coaching',
            loginPrompt: 'AI Strategic Coaching is exclusive to registered users. Sign in with Google to unlock full metabolic audits.',
            loginButton: 'Sign In / Register with Google',
            dailyLimitReached: 'Daily coaching audit limit reached (1/1). Next audit available tomorrow.',
            vipUnlimitedBadge: 'VIP Unlimited Access',
            dailyQuota: 'Daily Quota: 1/1 Used',
            translatingAnalysis: 'Translating analysis...',
        },
        dailyLog: {
            todayLog: "Today's Log",
            yesterdayLog: "Yesterday's Log",
            noMeals: 'No meals logged yet today',
            noMealsSub: 'Use voice, photo, or quick text below to log your food.',
            time: 'Time',
            namePlaceholder: 'Food name',
            reviewNeeded: 'Review Required',
            reviewNotice: 'AI made an estimate. Tap to verify or adjust.',
            askCoach: 'Ask AI Coach about this meal...',
            askCoachPlaceholder: 'e.g. Is this good for post-workout?',
            portion: 'Portion',
            deleteConfirm: 'Are you sure you want to delete this entry?',
        },
        smartLogging: {
            placeholderNormal: 'Log food or speak... (e.g. 2 eggs, toast)',
            placeholderListening: 'Listening... Speak now...',
            placeholderImage: 'Add a comment about the photo...',
            addPhoto: 'Add Photo (Camera or Gallery)',
            voiceDictation: 'Voice Dictation',
            voiceListening: 'Listening...',
            favorites: 'Toggle Favorites',
            viewProgress: 'View Deficit & Progress',
            analyzingImage: 'Analyzing image...',
            retrying: 'Retrying...',
            clarifying: 'Clarifying with AI...',
            favEmpty: 'No favorites saved yet. Star a meal to add it here.',
            editFavorites: 'Edit Favorites',
            takePhoto: 'Take Live Photo',
            takePhotoSub: 'Capture your meal or nutrition label directly',
            chooseGallery: 'Choose from Gallery',
            chooseGallerySub: 'Select from already taken photos',
            batchUpload: 'Day Recap / Batch Upload',
            batchUploadSub: 'Paste a full day log, multi-item text, or recap',
        },
        progress: {
            title: 'Fat Burn & Deficit',
            sevenDays: '7 Days',
            thirtyDays: '30 Days',
            deficitBadge: 'True Caloric Deficit',
            surplusBadge: 'Caloric Surplus',
            pureFatBurned: 'Pure Fat Mass Burned',
            estimatedFatStored: 'Estimated Fat Stored',
            sugarCubesEquivalent: 'sugar cubes',
            sugarCubesLabel: 'Equivalent in sugar cubes',
            showSugarPile: 'Visual Sugar Cube Cascade',
            sugarModalTitle: 'Tangible Fat Burn Equivalent',
            sugarModalDesc: 'At 4g per standard sugar cube, your caloric deficit represents:',
            optimalPlanTitle: 'Optimal Plan Potential',
            optimalPlanDesc: 'Target fat burn if daily calories were met 100% on plan',
            planEfficiency: 'Plan Efficiency',
            actualVsOptimal: 'Actual vs Target Potential',
            netEnergy: 'Net Energy',
            gymDays: 'Gym Days',
            totalConsumed: 'Total Consumed',
            totalBurned: 'Total Burned',
            avgPerDay: 'Avg / day',
            smartwatchTitle: 'Smartwatch Sync Refinement',
            smartwatchDesc: 'Enter active + resting burn from Apple Watch or Garmin to calibrate your true biological deficit.',
            calibratingTitle: 'Calibrating Progress...',
            calibratingDesc: 'Log at least one completed day to view your deficit & fat burn telemetry.',
        },
        calendar: {
            legendHit: 'Target Hit',
            legendMiss: 'Over Target',
            noData: 'No data',
        },
        settings: {
            title: 'System Config',
            language: 'Language',
            sex: 'Biological Sex',
            male: 'MALE',
            female: 'FEMALE',
            age: 'Age',
            height: 'Height (CM)',
            weight: 'Weight (KG)',
            activityLevel: 'Baseline Activity',
            objective: 'Primary Objective',
            customTargets: 'Custom Daily Targets',
            customTargetsDesc: 'Override formula with manual values. Leave blank for auto.',
            wipeTitle: 'System Wipe',
            wipeConfirm: 'Are you sure you want to delete all local telemetry?',
            signOut: 'Sign Out',
            signOutConfirm: 'Are you sure you want to sign out? Your cloud data is safe.',
        },
        auth: {
            title: 'MacroTrack',
            subtitle: 'AI Telemetry & Cloud Sync',
            email: 'EMAIL ADDRESS',
            password: 'PASSWORD',
            signIn: 'Sign In',
            createAccount: 'Create Account',
            haveAccount: 'Already have an account? Sign In',
            needAccount: 'Need an account? Sign Up',
            continueGuest: 'Continue as Guest',
            guestDesc: 'Guest mode keeps your data in this browser only.',
        },
    },
    cs: {
        common: {
            appTitle: 'MacroTrack',
            byAuthor: 'od MiHo',
            save: 'Uložit',
            cancel: 'Zrušit',
            delete: 'Smazat',
            edit: 'Upravit',
            done: 'Hotovo',
            apply: 'Použít',
            reset: 'Resetovat',
            loading: 'Načítání...',
            error: 'Chyba',
            adjust: 'Přepočítat',
            recalculate: 'Přepočítat',
            guestMode: 'Režim hosta',
            logInSave: 'Přihlásit / Uložit',
            settings: 'Nastavení',
            kcal: 'kcal',
            protein: 'Bílkoviny',
            carbs: 'Sacharidy',
            fat: 'Tuky',
            grams: 'g',
            points: 'bodů',
        },
        tabs: {
            day: 'Den',
            progress: 'Pokrok',
            coaching: 'Koučink',
        },
        macro: {
            trackerTitle: 'Sledování maker',
            gymBonus: 'Tréninkový den',
            gymActive: 'Aktivní tréninkový režim (+300 kcal)',
            gymInactive: 'Základní denní cíl',
            calories: 'Kalorie',
            proteinLabel: 'Bílkoviny',
            carbsLabel: 'Sacharidy',
            fatLabel: 'Tuky',
            consumed: 'Přijato',
            target: 'Cíl',
            remaining: 'Zbývá',
            left: 'zbývá',
            exceeded: 'překročeno',
            targetHit: 'Cíl splněn',
            clickToToggle: 'Kliknutím zobrazíte detail sacharidů a tuků',
        },
        coaching: {
            bannerTag: 'AI Strategický Koučink',
            title: 'Nutriční & Výkonnostní Koučink',
            subtitle: 'Metabolický audit a taktická doporučení v reálném čase',
            yesterday: 'Včera',
            today: 'Dnes',
            sevenDays: '7 dní',
            yesterdaySubtitle: 'Objektivní audit včerejšího uzavřeného jídelníčku a regenerace',
            todaySubtitle: 'Audit dnešního dne a časování živin',
            sevenDaysSubtitle: '7denní konzistence a týdenní trendy',
            runButton: 'Spustit koučink',
            recalculateButton: 'Přepočítat',
            analyzingButton: 'Analyzuji...',
            activityModeGym: 'Tréninkový / Aktivní režim (+300 kcal)',
            activityModeRest: 'Základní cíl / Regenerační režim',
            mealsLogged: 'zaznamenaných jídel dnes',
            yesterdayMeals: 'jídel zaznamenáno včera',
            sevenDaysMeals: 'jídel zaznamenáno za 7 dní',
            noYesterdayData: 'Pro včerejší den nebyla nalezena žádná zaznamenaná data.',
            minMealsRequired: 'Zaznamenejte dnes alespoň 3 jídla pro odemknutí AI koučinku (aktuálně {count}/3)',
            emptyTitle: 'Nutriční audit na 1 klik',
            emptyDescription: 'AI kouč zhodnotí časování živin, poměr bílkovin, metabolické brzdy a připraví 3 taktické pokyny.',
            emptyAction: 'Analyzovat telemetrii',
            loadingTitle: 'Prověřuji metabolické úniky a časování...',
            loadingSubtitle: 'Kouč analyzuje poměry makroživin a tréninkovou regeneraci',
            overallScore: 'Výkonnostní skóre',
            scoreOutOf: '/ 100 bodů',
            macroIntegrityTitle: 'Makro Integrita & Hustota',
            nutrientTimingTitle: 'Časování živin & Regenerace',
            metabolicLeaksTitle: 'Odhalené metabolické brzdy a úniky',
            directivesTitle: '3 Taktické direktivy pro zítřek',
            directivesTitleYesterday: '3 Taktické direktivy pro dnešek',
            directivesTitleWeekly: '3 Strategické direktivy pro příští týden',
            highPriority: 'Vysoká priorita',
            mediumPriority: 'Střední priorita',
            errorTitle: 'Chyba analýzy kouče',
            errorMessage: 'Analýzu se nepodařilo vygenerovat. Zkuste to prosím znovu.',
            loginRequired: 'Koučink vyžaduje přihlášení',
            loginPrompt: 'AI Strategický Koučink je dostupný pouze pro přihlášené uživatele. Přihlaste se přes Google pro odemknutí.',
            loginButton: 'Přihlásit se / Registrovat přes Google',
            dailyLimitReached: 'Dnešní limit koučinku byl vyčerpán (1/1). Další analýza bude dostupná zítra.',
            vipUnlimitedBadge: 'VIP Neomezený přístup',
            dailyQuota: 'Denní kvóta: 1/1 vyčerpáno',
            translatingAnalysis: 'Překládám analýzu do češtiny...',
        },
        dailyLog: {
            todayLog: 'Dnešní přehled',
            yesterdayLog: 'Včerejší přehled',
            noMeals: 'Dnes zatím nejsou zaznamenána žádná jídla',
            noMealsSub: 'Použijte hlas, fotku nebo rychlý text níže pro záznam jídla.',
            time: 'Čas',
            namePlaceholder: 'Název jídla',
            reviewNeeded: 'Vyžaduje kontrolu',
            reviewNotice: 'AI provedla odhad. Klepnutím ověřte nebo upravte.',
            askCoach: 'Zeptat se AI kouče na toto jídlo...',
            askCoachPlaceholder: 'např. Je to vhodné po tréninku?',
            portion: 'Porce',
            deleteConfirm: 'Opravdu chcete smazat tento záznam?',
        },
        smartLogging: {
            placeholderNormal: 'Zapište jídlo nebo mluvte... (např. 2 vejce, chléb)',
            placeholderListening: 'Poslouchám... Mluvte...',
            placeholderImage: 'Přidejte komentář k fotce...',
            addPhoto: 'Přidat fotku (Fotoaparát nebo Galerie)',
            voiceDictation: 'Hlasový záznam',
            voiceListening: 'Poslouchám...',
            favorites: 'Oblíbené',
            viewProgress: 'Zobrazit deficit a pokrok',
            analyzingImage: 'Analyzuji fotku...',
            retrying: 'Opakuji pokus...',
            clarifying: 'Upřesňuji s AI...',
            favEmpty: 'Zatím nemáte žádná oblíbená jídla. Označte jídlo hvězdičkou.',
            editFavorites: 'Upravit oblíbené',
            takePhoto: 'Vyfotit jídlo živě',
            takePhotoSub: 'Vyfoťte přímo talíř nebo nutriční štítek',
            chooseGallery: 'Vybrat z galerie',
            chooseGallerySub: 'Zvolit z již pořízených fotografií',
            batchUpload: 'Denní rekapitulace / Dávkové nahrání',
            batchUploadSub: 'Vložte jídelníček celého dne nebo více fotek',
        },
        progress: {
            title: 'Spalování tuků a deficit',
            sevenDays: '7 dní',
            thirtyDays: '30 dní',
            deficitBadge: 'Skutečný kalorický deficit',
            surplusBadge: 'Kalorický přebytek',
            pureFatBurned: 'Spálená čistá tuková hmota',
            estimatedFatStored: 'Odhadovaný uložený tuk',
            sugarCubesEquivalent: 'kostek cukru',
            sugarCubesLabel: 'Ekvivalent v kostkách cukru',
            showSugarPile: 'Vizuální sypání kostek cukru',
            sugarModalTitle: 'Hmatatelný ekvivalent spáleného tuku',
            sugarModalDesc: 'Při 4 g na standardní kostku cukru odpovídá váš spálený tuk:',
            optimalPlanTitle: 'Potenciál optimálního plánu',
            optimalPlanDesc: 'Cílový úbytek tuku při 100% dodržení denního kalorického limitu',
            planEfficiency: 'Efektivita plánu',
            actualVsOptimal: 'Skutečnost vs Cílový potenciál',
            netEnergy: 'Čistá energie',
            gymDays: 'Tréninkové dny',
            totalConsumed: 'Celkem přijato',
            totalBurned: 'Celkem spáleno',
            avgPerDay: 'Průměr / den',
            smartwatchTitle: 'Zpřesnění z chytrých hodinek',
            smartwatchDesc: 'Zadejte celkový aktivní + klidový výdej z Apple Watch nebo Garmin pro přesnou kalibraci biologického deficitu.',
            calibratingTitle: 'Kalibrace pokroku...',
            calibratingDesc: 'Zaznamenejte alespoň jeden celý den pro zobrazení telemetrie deficitu.',
        },
        calendar: {
            legendHit: 'Cíl splněn',
            legendMiss: 'Překročeno',
            noData: 'Žádná data',
        },
        settings: {
            title: 'Konfigurace systému',
            language: 'Jazyk / Language',
            sex: 'Biologické pohlaví',
            male: 'MUŽ',
            female: 'ŽENA',
            age: 'Věk',
            height: 'Výška (CM)',
            weight: 'Hmotnost (KG)',
            activityLevel: 'Výchozí aktivita',
            objective: 'Hlavní cíl',
            customTargets: 'Vlastní denní cíle',
            customTargetsDesc: 'Přepište automatické vzorce vlastními hodnotami. Nechte prázdné pro auto.',
            wipeTitle: 'Vymazat systém',
            wipeConfirm: 'Opravdu chcete smazat všechna lokální data?',
            signOut: 'Odhlásit se',
            signOutConfirm: 'Opravdu se chcete odhlásit? Vaše cloudová data jsou v bezpečí.',
        },
        auth: {
            title: 'MacroTrack',
            subtitle: 'AI Telemetrie a Cloudová synchronizace',
            email: 'E-MAILOVÁ ADRESA',
            password: 'HESLO',
            signIn: 'Přihlásit se',
            createAccount: 'Vytvořit účet',
            haveAccount: 'Již máte účet? Přihlaste se',
            needAccount: 'Nemáte účet? Zaregistrujte se',
            continueGuest: 'Pokračovat jako host',
            guestDesc: 'Režim hosta ukládá data pouze do tohoto prohlížeče.',
        },
    },
    de: {
        common: {
            appTitle: 'MacroTrack',
            byAuthor: 'von MiHo',
            save: 'Speichern',
            cancel: 'Abbrechen',
            delete: 'Löschen',
            edit: 'Bearbeiten',
            done: 'Fertig',
            apply: 'Anwenden',
            reset: 'Zurücksetzen',
            loading: 'Laden...',
            error: 'Fehler',
            adjust: 'Anpassen',
            recalculate: 'Neu berechnen',
            guestMode: 'Gastmodus',
            logInSave: 'Anmelden / Speichern',
            settings: 'Einstellungen',
            kcal: 'kcal',
            protein: 'Protein',
            carbs: 'Kohlenhydrate',
            fat: 'Fett',
            grams: 'g',
            points: 'Punkte',
        },
        tabs: {
            day: 'Tag',
            progress: 'Fortschritt',
            coaching: 'Coaching',
        },
        macro: {
            trackerTitle: 'Makro-Tracker',
            gymBonus: 'Trainingstag',
            gymActive: 'Aktiver Trainingsmodus (+300 kcal)',
            gymInactive: 'Basis-Tagesziel',
            calories: 'Kalorien',
            proteinLabel: 'Protein',
            carbsLabel: 'Kohlenhydrate',
            fatLabel: 'Fett',
            consumed: 'Aufgenommen',
            target: 'Ziel',
            remaining: 'Verbleibend',
            left: 'übrig',
            exceeded: 'überschritten',
            targetHit: 'Ziel erreicht',
            clickToToggle: 'Klicken, um Kohlenhydrate & Fett anzuzeigen',
        },
        coaching: {
            bannerTag: 'Strategisches KI-Coaching',
            title: 'Ernährungs- & Leistungs-Coaching',
            subtitle: 'Echtzeit-Stoffwechselaudit & taktische Empfehlungen',
            yesterday: 'Gestern',
            today: 'Heute',
            sevenDays: '7 Tage',
            yesterdaySubtitle: 'Objektives Audit der gestrigen abgeschlossenen Ernährung & Regeneration',
            todaySubtitle: 'Tages-Audit & Nährstoff-Timing in Echtzeit',
            sevenDaysSubtitle: '7-Tage-Konsistenz & Wochentrends',
            runButton: 'Coaching starten',
            recalculateButton: 'Neu berechnen',
            analyzingButton: 'Analysiere...',
            activityModeGym: 'Trainingsmodus / Aktiv (+300 kcal)',
            activityModeRest: 'Basisziel / Regeneration',
            mealsLogged: 'Mahlzeiten heute erfasst',
            yesterdayMeals: 'Mahlzeiten gestern erfasst',
            sevenDaysMeals: 'Mahlzeiten in 7 Tagen erfasst',
            noYesterdayData: 'Keine abgeschlossenen Daten für gestern erfasst.',
            minMealsRequired: 'Erfassen Sie heute mindestens 3 Mahlzeiten für das KI-Coaching (aktuell {count}/3)',
            emptyTitle: '1-Klick Ernährungs-Audit',
            emptyDescription: 'Der KI-Coach analysiert Nährstoff-Timing, Makroverhältnisse und liefert 3 taktische Anweisungen.',
            emptyAction: 'Telemetrie analysieren',
            loadingTitle: 'Prüfe Stoffwechsel-Lecks und Nährstoff-Timing...',
            loadingSubtitle: 'Coach analysiert Makro-Verhältnisse und Trainingserholung',
            overallScore: 'Leistungs-Score',
            scoreOutOf: '/ 100 Punkte',
            macroIntegrityTitle: 'Makro-Integrität & Dichte',
            nutrientTimingTitle: 'Nährstoff-Timing & Erholung',
            metabolicLeaksTitle: 'Erkannte Stoffwechsel-Bremsen & Lecks',
            directivesTitle: '3 Taktische Anweisungen für morgen',
            directivesTitleYesterday: '3 Taktische Anweisungen für heute',
            directivesTitleWeekly: '3 Strategische Anweisungen für nächste Woche',
            highPriority: 'Hohe Priorität',
            mediumPriority: 'Mittlere Priorität',
            errorTitle: 'Coaching-Analysefehler',
            errorMessage: 'Analyse konnte nicht erstellt werden. Bitte erneut versuchen.',
            loginRequired: 'Anmeldung für Coaching erforderlich',
            loginPrompt: 'KI-Strategie-Coaching ist exklusiv für registrierte Benutzer verfügbar. Melden Sie sich mit Google an.',
            loginButton: 'Mit Google anmelden / registrieren',
            dailyLimitReached: 'Tageslimit für Coaching erreicht (1/1). Nächstes Audit morgen verfügbar.',
            vipUnlimitedBadge: 'VIP Unbegrenzter Zugriff',
            dailyQuota: 'Tageskontingent: 1/1 verbraucht',
            translatingAnalysis: 'Übersetze Analyse ins Deutsche...',
        },
        dailyLog: {
            todayLog: 'Heutiges Protokoll',
            yesterdayLog: 'Gestriges Protokoll',
            noMeals: 'Heute noch keine Mahlzeiten erfasst',
            noMealsSub: 'Nutzen Sie Sprache, Foto oder Text unten, um Mahlzeiten zu protokollieren.',
            time: 'Uhrzeit',
            namePlaceholder: 'Name der Mahlzeit',
            reviewNeeded: 'Überprüfung erforderlich',
            reviewNotice: 'KI hat geschätzt. Tippen Sie zur Bestätigung oder Anpassung.',
            askCoach: 'KI-Coach zu dieser Mahlzeit befragen...',
            askCoachPlaceholder: 'z.B. Ist das gut nach dem Training?',
            portion: 'Portion',
            deleteConfirm: 'Möchten Sie diesen Eintrag wirklich löschen?',
        },
        smartLogging: {
            placeholderNormal: 'Essen eintragen oder sprechen... (z.B. 2 Eier, Toast)',
            placeholderListening: 'Höre zu... Jetzt sprechen...',
            placeholderImage: 'Kommentar zum Foto hinzufügen...',
            addPhoto: 'Foto hinzufügen (Kamera oder Galerie)',
            voiceDictation: 'Spracheingabe',
            voiceListening: 'Höre zu...',
            favorites: 'Favoriten umschalten',
            viewProgress: 'Defizit & Fortschritt anzeigen',
            analyzingImage: 'Foto wird analysiert...',
            retrying: 'Wiederhole Versuch...',
            clarifying: 'Präzisiere mit KI...',
            favEmpty: 'Noch keine Favoriten gespeichert. Markieren Sie Mahlzeiten mit einem Stern.',
            editFavorites: 'Favoriten bearbeiten',
            takePhoto: 'Live-Foto aufnehmen',
            takePhotoSub: 'Mahlzeit oder Nährwerttabelle fotografieren',
            chooseGallery: 'Aus Galerie wählen',
            chooseGallerySub: 'Bereits aufgenommenes Foto auswählen',
            batchUpload: 'Tages-Recap / Batch-Upload',
            batchUploadSub: 'Mehrere Fotos oder Mahlzeiten auf einmal hochladen',
        },
        progress: {
            title: 'Fettverbrennung & Defizit',
            sevenDays: '7 Tage',
            thirtyDays: '30 Tage',
            deficitBadge: 'Echtes Kaloriendefizit',
            surplusBadge: 'Kalorienüberschuss',
            pureFatBurned: 'Reine Fettmasse verbrannt',
            estimatedFatStored: 'Geschätztes Fett gespeichert',
            sugarCubesEquivalent: 'Zuckerwürfel',
            sugarCubesLabel: 'Äquivalent in Zuckerwürfeln',
            showSugarPile: 'Visueller Zuckerwürfel-Wasserfall',
            sugarModalTitle: 'Greifbares Fettabbau-Äquivalent',
            sugarModalDesc: 'Bei 4 g pro Standard-Zuckerwürfel entspricht Ihr verbranntes Fett:',
            optimalPlanTitle: 'Optimales Planpotenzial',
            optimalPlanDesc: 'Ziel-Fettabbau bei 100%iger Einhaltung des Kalorienplans',
            planEfficiency: 'Planeffizienz',
            actualVsOptimal: 'Ist vs Zielpotenzial',
            netEnergy: 'Nettoenergie',
            gymDays: 'Trainingstage',
            totalConsumed: 'Gesamt aufgenommen',
            totalBurned: 'Gesamt verbrannt',
            avgPerDay: 'Durchschnitt / Tag',
            smartwatchTitle: 'Smartwatch-Synchronisierung',
            smartwatchDesc: 'Geben Sie den aktiven + Ruheverbrauch von Apple Watch oder Garmin ein, um das biologische Defizit zu kalibrieren.',
            calibratingTitle: 'Kalibriere Fortschritt...',
            calibratingDesc: 'Erfassen Sie mindestens einen vollständigen Tag, um Defizit-Telemetrie anzuzeigen.',
        },
        calendar: {
            legendHit: 'Ziel erreicht',
            legendMiss: 'Ziel überschritten',
            noData: 'Keine Daten',
        },
        settings: {
            title: 'Systemkonfiguration',
            language: 'Sprache / Language',
            sex: 'Biologisches Geschlecht',
            male: 'MÄNNLICH',
            female: 'WEIBLICH',
            age: 'Alter',
            height: 'Größe (CM)',
            weight: 'Gewicht (KG)',
            activityLevel: 'Grundaktivität',
            objective: 'Hauptziel',
            customTargets: 'Benutzerdefinierte Tagesziele',
            customTargetsDesc: 'Formel mit manuellen Werten überschreiben. Leer lassen für Automatik.',
            wipeTitle: 'System zurücksetzen',
            wipeConfirm: 'Möchten Sie wirklich alle lokalen Daten löschen?',
            signOut: 'Abmelden',
            signOutConfirm: 'Möchten Sie sich wirklich abmelden? Ihre Cloud-Daten bleiben sicher.',
        },
        auth: {
            title: 'MacroTrack',
            subtitle: 'KI-Telemetrie & Cloud-Synchronisierung',
            email: 'E-MAIL-ADRESSE',
            password: 'PASSWORT',
            signIn: 'Anmelden',
            createAccount: 'Konto erstellen',
            haveAccount: 'Bereits ein Konto? Anmelden',
            needAccount: 'Noch kein Konto? Registrieren',
            continueGuest: 'Als Gast fortfahren',
            guestDesc: 'Gastmodus speichert Daten nur in diesem Browser.',
        },
    },
};

export const getTranslation = (lang: Language = 'en') => {
    return translations[lang] || translations.en;
};
