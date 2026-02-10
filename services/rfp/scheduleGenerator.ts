import {
    PRE_INSTALL_PHASES,
    INSTALL_TASK_TEMPLATES,
    addBusinessDays,
    getInstallSizeCategory,
    nextBusinessDay,
} from "./productCatalog";

export interface ScheduleLocation {
    name: string;
    panelCount: number;
    installationType: "standard_wall" | "complex_hanging" | "phased_large";
}

export interface ScheduleTask {
    taskName: string;
    locationName: string | null;
    startDate: Date;
    endDate: Date;
    durationDays: number;
    isParallel: boolean;
    phase: "design" | "manufacturing" | "shipping" | "install";
}

export interface GeneratedSchedule {
    ntpDate: Date;
    tasks: ScheduleTask[];
    totalDurationDays: number;
    completionDate: Date;
}

const INSTALL_ANCHOR_TASK = "Ground Shipping to Site";

type PreInstallTemplate = {
    name: string;
    days: number;
    dependsOn?: string;
    parallel?: boolean;
};

type InstallTemplate = {
    name: string;
    duration: { small: number; medium: number; large: number };
    onlyFor?: Array<"standard_wall" | "complex_hanging" | "phased_large">;
    parallelOffset?: number;
};

function normalizeToBusinessDay(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 6) {
        d.setDate(d.getDate() + 2);
    } else if (day === 0) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

function toDurationDays(value: unknown): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0) return 1;
    return n;
}

function endDateInclusive(startDate: Date, durationDays: number): Date {
    const safeDays = toDurationDays(durationDays);
    return addBusinessDays(startDate, safeDays - 1);
}

function maxDate(a: Date, b: Date): Date {
    return a.getTime() >= b.getTime() ? a : b;
}

function getPreInstallPhaseName(taskName: string): "design" | "manufacturing" | "shipping" {
    const name = taskName.toLowerCase();
    if (name.includes("shipping") || name.includes("freight")) return "shipping";
    if (name.includes("manufactur") || name.includes("integration") || name.includes("programming")) {
        return "manufacturing";
    }
    return "design";
}

function businessDaysBetweenInclusive(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let days = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) days += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

export function generateSchedule(
    ntpDate: Date,
    locations: ScheduleLocation[],
    options?: { parallelLocations?: boolean },
): GeneratedSchedule {
    const normalizedNtp = normalizeToBusinessDay(new Date(ntpDate));
    const tasks: ScheduleTask[] = [];
    const taskByName = new Map<string, ScheduleTask>();
    const preInstallTemplates = PRE_INSTALL_PHASES.map((phase) => ({ ...phase })) as PreInstallTemplate[];
    const installTemplates = INSTALL_TASK_TEMPLATES.map((task) => ({ ...task })) as InstallTemplate[];

    for (const template of preInstallTemplates) {
        const dependency = template.dependsOn ? taskByName.get(template.dependsOn) : undefined;

        let startDate = new Date(normalizedNtp);
        if (dependency) {
            startDate = template.parallel ? new Date(dependency.startDate) : nextBusinessDay(dependency.endDate);
        }

        const durationDays = toDurationDays(template.days);
        const endDate = endDateInclusive(startDate, durationDays);
        const scheduleTask: ScheduleTask = {
            taskName: template.name,
            locationName: null,
            startDate,
            endDate,
            durationDays,
            isParallel: Boolean(template.parallel),
            phase: getPreInstallPhaseName(template.name),
        };

        tasks.push(scheduleTask);
        taskByName.set(template.name, scheduleTask);
    }

    const installAnchor = taskByName.get(INSTALL_ANCHOR_TASK);
    const installStartBase = installAnchor ? nextBusinessDay(installAnchor.endDate) : normalizedNtp;
    const parallelLocations = Boolean(options?.parallelLocations);

    let sequentialCursor = new Date(installStartBase);

    for (const location of locations) {
        const panelCount = Math.max(1, Math.floor(Number(location.panelCount) || 1));
        const sizeCategory = getInstallSizeCategory(panelCount);
        const templates = installTemplates.filter((tpl) => {
            if (!tpl.onlyFor || tpl.onlyFor.length === 0) return true;
            return tpl.onlyFor.includes(location.installationType);
        });

        const locationStart = parallelLocations ? new Date(installStartBase) : new Date(sequentialCursor);
        let cursor = new Date(locationStart);
        let ledInstallStart: Date | null = null;
        let openParallelEnds: Date[] = [];
        let locationEnd = new Date(locationStart);

        for (const template of templates) {
            const durationDays = toDurationDays(template.duration[sizeCategory]);
            const isParallel = Number.isFinite(template.parallelOffset as number);

            if (!isParallel && openParallelEnds.length > 0) {
                const parallelGate = openParallelEnds.reduce((latest, current) => maxDate(latest, current));
                cursor = maxDate(cursor, nextBusinessDay(parallelGate));
                openParallelEnds = [];
            }

            let startDate = new Date(cursor);
            if (isParallel && ledInstallStart) {
                const offset = Math.max(0, Number(template.parallelOffset) || 0);
                startDate = addBusinessDays(new Date(ledInstallStart), offset);
            }

            const endDate = endDateInclusive(startDate, durationDays);
            if (template.name === "LED Panel Install") {
                ledInstallStart = new Date(startDate);
            }

            const scheduleTask: ScheduleTask = {
                taskName: template.name,
                locationName: location.name,
                startDate,
                endDate,
                durationDays,
                isParallel,
                phase: "install",
            };

            tasks.push(scheduleTask);
            locationEnd = maxDate(locationEnd, endDate);

            if (isParallel) {
                openParallelEnds.push(endDate);
            } else {
                cursor = nextBusinessDay(endDate);
            }
        }

        if (openParallelEnds.length > 0) {
            const parallelEnd = openParallelEnds.reduce((latest, current) => maxDate(latest, current));
            locationEnd = maxDate(locationEnd, parallelEnd);
        }

        if (!parallelLocations) {
            sequentialCursor = nextBusinessDay(locationEnd);
        }
    }

    const sortedTasks = tasks
        .slice()
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.taskName.localeCompare(b.taskName));

    const completionDate = sortedTasks.length > 0
        ? sortedTasks.reduce((latest, task) => maxDate(latest, task.endDate), sortedTasks[0].endDate)
        : normalizedNtp;

    return {
        ntpDate: normalizedNtp,
        tasks: sortedTasks,
        totalDurationDays: businessDaysBetweenInclusive(normalizedNtp, completionDate),
        completionDate,
    };
}
