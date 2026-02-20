import * as XLSX from 'xlsx';
import { ScreenSpec } from './triageApi';

export function generateSpecsExcel(screens: ScreenSpec[], projectContext: string) {
    if (!screens || screens.length === 0) return;

    // Build Data for Sheet 1: LED Manufacturer Request
    const manufacturerData = screens.map((s, index) => ({
        "Item #": index + 1,
        "Screen Name": s.screen_name,
        "Location": s.location,
        "Size (W x H)": s.size,
        "Pixel Pitch (mm)": s.pixel_pitch_mm,
        "Resolution": s.resolution,
        "Indoor/Outdoor": s.indoor_outdoor,
        "Quantity": s.quantity,
        "Brightness (nits)": s.nits_brightness,
        "Mounting Type": s.mounting_type,
        "Special Requirements": s.special_requirements,
        "Unit Price": "",
        "Extended Price": "",
        "Lead Time": "",
        "Notes": s.raw_notes
    }));

    // Build Data for Sheet 2: Electrical Subcontractor
    const electricalData = screens.map((s, index) => ({
        "Item #": index + 1,
        "Screen Name": s.screen_name,
        "Location": s.location,
        "Size": s.size,
        "Pixel Pitch (mm)": s.pixel_pitch_mm,
        "Resolution": s.resolution,
        "Quantity": s.quantity,
        "Data Runs Required": "",
        "Fiber Runs Required": "",
        "Power Circuit Required": "",
        "Conduit Size": "",
        "Cable Type": "",
        "Unit Price": "",
        "Extended Price": "",
        "Notes": ""
    }));

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();

    const wsManufacturer = XLSX.utils.json_to_sheet(manufacturerData);
    const wsElectrical = XLSX.utils.json_to_sheet(electricalData);

    // Minor column sizing optimization
    const wscolsMfg = [
        { wch: 8 },  // Item #
        { wch: 30 }, // Screen Name
        { wch: 30 }, // Location
        { wch: 15 }, // Size
        { wch: 15 }, // Pitch
        { wch: 15 }, // Res
        { wch: 15 }, // In/Out
        { wch: 10 }, // Qty
        { wch: 15 }, // Nits
        { wch: 25 }, // Mounting
        { wch: 50 }, // Special
        { wch: 15 }, // Unit Price
        { wch: 15 }, // Extended
        { wch: 15 }, // Lead time
        { wch: 60 }  // Notes
    ];
    wsManufacturer['!cols'] = wscolsMfg;

    const wscolsElec = [
        { wch: 8 },
        { wch: 30 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 60 }
    ];
    wsElectrical['!cols'] = wscolsElec;

    XLSX.utils.book_append_sheet(wb, wsManufacturer, "LED Manufacturer Request");
    XLSX.utils.book_append_sheet(wb, wsElectrical, "Electrical Subcontractor");

    // File name gen
    const safeContext = projectContext ? projectContext.replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/ /g, '_') : "RFP";
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${safeContext}_Screen_Specs_${dateStr}.xlsx`;

    // Download
    XLSX.writeFile(wb, fileName);
}
