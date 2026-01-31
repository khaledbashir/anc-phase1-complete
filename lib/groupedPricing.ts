/**
 * Grouped Pricing Logic for PDF
 * 
 * Combines multiple screens into grouped line items for client-facing PDFs.
 * Based on Standard Enterprise document structure.
 */

export interface ScreenItem {
    id: string;
    name: string;
    group?: string; // e.g., "Hall of Excellence", "Performance Center"
    sellPrice: number;
    specs?: {
        pitch?: number;
        width?: number;
        height?: number;
        brightness?: number;
        quantity?: number;
    };
}

export interface GroupedLineItem {
    groupName: string;
    items: ScreenItem[];
    totalPrice: number;
    description: string;
}

/**
 * Group screens by their group property
 * Returns both grouped items and ungrouped items
 */
export function groupScreensForPDF(screens: ScreenItem[]): {
    grouped: GroupedLineItem[];
    ungrouped: ScreenItem[];
} {
    const groupMap = new Map<string, ScreenItem[]>();
    const ungrouped: ScreenItem[] = [];

    screens.forEach(screen => {
        if (screen.group) {
            const existing = groupMap.get(screen.group) || [];
            existing.push(screen);
            groupMap.set(screen.group, existing);
        } else {
            ungrouped.push(screen);
        }
    });

    const grouped: GroupedLineItem[] = [];
    groupMap.forEach((items, groupName) => {
        const totalPrice = items.reduce((sum, item) => sum + item.sellPrice, 0);
        const description = generateGroupDescription(items);
        grouped.push({
            groupName,
            items,
            totalPrice,
            description,
        });
    });

    return { grouped, ungrouped };
}

/**
 * Generate a human-readable description for a group of screens
 */
function generateGroupDescription(items: ScreenItem[]): string {
    if (items.length === 1) {
        const item = items[0];
        const h = Number(item.specs?.height || 0).toFixed(2);
        const w = Number(item.specs?.width || 0).toFixed(2);
        const p = item.specs?.pitch || 0;
        const q = item.specs?.quantity || 1;
        return `${item.name} - ${h}' H x ${w}' W - ${p}mm - QTY ${q}`;
    }

    const totalArea = items.reduce((sum, item) => {
        const w = item.specs?.width || 0;
        const h = item.specs?.height || 0;
        return sum + (w * h);
    }, 0);

    const totalQuantity = items.reduce((sum, item) => sum + (item.specs?.quantity || 1), 0);
    return `${totalQuantity} Displays Package (${Math.round(totalArea)} sq ft total)`;
}

/**
 * Convert grouped screens to PDF line items format
 */
export function convertToLineItems(screens: ScreenItem[]): {
    name: string;
    description: string;
    total: number;
    isGroup?: boolean;
}[] {
    const { grouped, ungrouped } = groupScreensForPDF(screens);

    const lineItems: { name: string; description: string; total: number; isGroup?: boolean }[] = [];

    // Add grouped items first (these show as single rows with combined totals)
    grouped.forEach(group => {
        lineItems.push({
            name: group.groupName,
            description: group.description,
            total: group.totalPrice,
            isGroup: true,
        });
    });

    // Add ungrouped items
    ungrouped.forEach(screen => {
        const h = Number(screen.specs?.height || 0).toFixed(2);
        const w = Number(screen.specs?.width || 0).toFixed(2);
        const p = screen.specs?.pitch || 0;
        const q = screen.specs?.quantity || 1;
        lineItems.push({
            name: screen.name,
            description: `${h}' H x ${w}' W - ${p}mm - QTY ${q}`,
            total: screen.sellPrice,
            isGroup: false,
        });
    });

    return lineItems;
}

/**
 * Check if screens should be grouped based on naming patterns
 * Auto-detects groups from screen names like "Hall of Excellence - Display 1"
 */
export function autoDetectGroups(screens: { name: string }[]): Map<string, string[]> {
    const groupPatterns = [
        /^(.+?)\s*[-–]\s*Display\s*\d+$/i,
        /^(.+?)\s*[-–]\s*Screen\s*\d+$/i,
        /^(.+?)\s*[-–]\s*Panel\s*\d+$/i,
        /^(.+?)\s*\d+$/i,
    ];

    const groups = new Map<string, string[]>();

    screens.forEach(screen => {
        for (const pattern of groupPatterns) {
            const match = screen.name.match(pattern);
            if (match) {
                const groupName = match[1].trim();
                const existing = groups.get(groupName) || [];
                existing.push(screen.name);
                groups.set(groupName, existing);
                return;
            }
        }
    });

    // Only return groups with 2+ screens
    const validGroups = new Map<string, string[]>();
    groups.forEach((items, name) => {
        if (items.length >= 2) {
            validGroups.set(name, items);
        }
    });

    return validGroups;
}
