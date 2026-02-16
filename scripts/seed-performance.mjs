/**
 * Seed script for Proof of Performance demo data.
 *
 * Creates:
 * - 2 venues (Gainbridge Fieldhouse, Crypto.com Arena)
 * - 12 installed screens (6 per venue)
 * - 5 sponsors (Coca-Cola, Budweiser, State Farm, Nike, Toyota)
 * - ~4,000 play logs across the 2025-26 season (Oct 1 - Mar 15)
 *
 * Run: node scripts/seed-performance.mjs
 * Requires DATABASE_URL env var pointing to the nata database.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Venues ────────────────────────────────────────────────────────────────────

const VENUES = [
  {
    name: "Gainbridge Fieldhouse",
    client: "Indiana Pacers",
    city: "Indianapolis",
    state: "IN",
    address: "125 S Pennsylvania St, Indianapolis, IN 46204",
    timezone: "America/Indiana/Indianapolis",
  },
  {
    name: "Crypto.com Arena",
    client: "AEG / LA Kings",
    city: "Los Angeles",
    state: "CA",
    address: "1111 S Figueroa St, Los Angeles, CA 90015",
    timezone: "America/Los_Angeles",
  },
];

// ── Screens per venue ─────────────────────────────────────────────────────────

const SCREENS_GAINBRIDGE = [
  { name: "Center Hung Main",       location: "Center Court — Main Scoreboard",     manufacturer: "Yaham", modelNumber: "HVO-C4",     pixelPitch: 4.0,  widthFt: 25, heightFt: 14 },
  { name: "Ribbon Board East",      location: "Upper Bowl East Fascia",             manufacturer: "Yaham", modelNumber: "HVO-C6",     pixelPitch: 6.0,  widthFt: 300, heightFt: 2  },
  { name: "Ribbon Board West",      location: "Upper Bowl West Fascia",             manufacturer: "Yaham", modelNumber: "HVO-C6",     pixelPitch: 6.0,  widthFt: 300, heightFt: 2  },
  { name: "Concourse NE Video Wall",location: "NE Concourse Entry",                 manufacturer: "LG",    modelNumber: "GSQA039N",   pixelPitch: 3.9,  widthFt: 12,  heightFt: 7  },
  { name: "Concourse SW Video Wall",location: "SW Concourse Entry",                 manufacturer: "LG",    modelNumber: "GSQA039N",   pixelPitch: 3.9,  widthFt: 12,  heightFt: 7  },
  { name: "Lobby Marquee",          location: "Main Entrance Lobby",                manufacturer: "Yaham", modelNumber: "HVO-C2.5",   pixelPitch: 2.5,  widthFt: 16,  heightFt: 9  },
];

const SCREENS_CRYPTO = [
  { name: "Center Hung Main",       location: "Center Ice — Main Scoreboard",       manufacturer: "LG",    modelNumber: "GSCA025N",   pixelPitch: 2.5,  widthFt: 38, heightFt: 18 },
  { name: "Ribbon North",           location: "North Side Fascia",                  manufacturer: "Yaham", modelNumber: "HVO-C6",     pixelPitch: 6.0,  widthFt: 400, heightFt: 2.5 },
  { name: "Ribbon South",           location: "South Side Fascia",                  manufacturer: "Yaham", modelNumber: "HVO-C6",     pixelPitch: 6.0,  widthFt: 400, heightFt: 2.5 },
  { name: "Club Level Video Wall",  location: "Premium Club Level Lounge",          manufacturer: "LG",    modelNumber: "GSQA039N",   pixelPitch: 3.9,  widthFt: 20,  heightFt: 8  },
  { name: "Box Office Marquee",     location: "Main Box Office Exterior",           manufacturer: "Yaham", modelNumber: "RAD-O10",    pixelPitch: 10.0, widthFt: 30,  heightFt: 10 },
  { name: "Plaza Tower",            location: "Star Plaza Entrance Tower",          manufacturer: "Yaham", modelNumber: "RAD-O6",     pixelPitch: 6.0,  widthFt: 8,   heightFt: 40 },
];

// ── Sponsors ──────────────────────────────────────────────────────────────────

const SPONSORS = [
  { name: "Coca-Cola",   contact: "Sarah Mitchell",  email: "s.mitchell@coca-cola.com" },
  { name: "Budweiser",   contact: "Mike Torres",     email: "m.torres@anheuser-busch.com" },
  { name: "State Farm",  contact: "Jennifer Wu",     email: "j.wu@statefarm.com" },
  { name: "Nike",        contact: "David Park",      email: "d.park@nike.com" },
  { name: "Toyota",      contact: "Lisa Chen",       email: "l.chen@toyota.com" },
];

// ── Content names per sponsor ─────────────────────────────────────────────────

const CONTENT_MAP = {
  "Coca-Cola":  ["Coke_15sec_Holiday_2025", "Coke_30sec_GameDay_2026", "Coke_15sec_Zero_Sugar", "Coke_15sec_Halftime"],
  "Budweiser":  ["Bud_15sec_SuperBowl_Promo", "Bud_30sec_ColdOnes", "Bud_15sec_GameNight"],
  "State Farm": ["SF_15sec_LikeAGoodNeighbor", "SF_30sec_Claims", "SF_15sec_Jake"],
  "Nike":       ["Nike_15sec_JustDoIt", "Nike_30sec_AirMax", "Nike_15sec_GameReady"],
  "Toyota":     ["Toyota_15sec_Camry", "Toyota_30sec_RAV4", "Toyota_15sec_Tacoma"],
};

// ── Game schedule simulation ──────────────────────────────────────────────────

function generateGameDates(startDate, endDate, gamesPerMonth) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const interval = Math.floor(daysInMonth / gamesPerMonth);

    for (let g = 0; g < gamesPerMonth; g++) {
      const gameDay = new Date(current.getFullYear(), current.getMonth(), 1 + g * interval + Math.floor(Math.random() * 3));
      if (gameDay <= end && gameDay >= start) {
        dates.push(gameDay);
      }
    }
    current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function generatePlayLogs(screens, sponsors, gameDates) {
  const logs = [];

  for (const gameDate of gameDates) {
    // Each game is ~3 hours: 18:00 - 21:00 or 19:00 - 22:00
    const gameStartHour = Math.random() > 0.5 ? 19 : 18;

    for (const screen of screens) {
      // Each sponsor gets 8-15 plays per screen per game
      for (const sponsor of sponsors) {
        const playsThisGame = Math.floor(randomBetween(8, 16));
        const contents = CONTENT_MAP[sponsor.name] || ["Generic_15sec"];

        for (let p = 0; p < playsThisGame; p++) {
          const content = contents[Math.floor(Math.random() * contents.length)];
          const duration = content.includes("30sec") ? 30 : 15;

          // Random time during the 3-hour game window
          const minuteOffset = Math.floor(randomBetween(0, 180));
          const secondOffset = Math.floor(Math.random() * 60);
          const playTime = new Date(gameDate);
          playTime.setHours(gameStartHour, minuteOffset % 60, secondOffset);
          playTime.setMinutes(playTime.getMinutes() + Math.floor(minuteOffset / 60) * 60);
          // Spread across game duration
          playTime.setMinutes(Math.floor(randomBetween(0, 180)));
          playTime.setHours(gameStartHour + Math.floor(playTime.getMinutes() / 60));
          playTime.setMinutes(playTime.getMinutes() % 60);

          logs.push({
            screenName: screen.name,
            sponsorName: sponsor.name,
            contentName: content,
            playedAt: playTime,
            durationSec: duration,
            verified: Math.random() > 0.002, // 99.8% verified
            source: "vsoft_api",
          });
        }
      }
    }
  }

  return logs;
}

// ── Main seed ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏟️  Seeding Proof of Performance demo data...\n");

  // Clear existing data
  await prisma.playLog.deleteMany({});
  await prisma.performanceReport.deleteMany({});
  await prisma.installedScreen.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.sponsor.deleteMany({});
  console.log("  Cleared existing performance data.");

  // Create sponsors
  const sponsorRecords = {};
  for (const s of SPONSORS) {
    const record = await prisma.sponsor.create({ data: s });
    sponsorRecords[s.name] = record;
    console.log(`  ✓ Sponsor: ${s.name}`);
  }

  // Create venues + screens
  const allScreenRecords = [];
  const venueScreenMap = {};

  for (let vi = 0; vi < VENUES.length; vi++) {
    const v = VENUES[vi];
    const venue = await prisma.venue.create({ data: v });
    console.log(`  ✓ Venue: ${v.name} (${v.client})`);

    const screenDefs = vi === 0 ? SCREENS_GAINBRIDGE : SCREENS_CRYPTO;
    const screenRecords = [];

    for (const s of screenDefs) {
      const screen = await prisma.installedScreen.create({
        data: {
          venueId: venue.id,
          name: s.name,
          location: s.location,
          manufacturer: s.manufacturer,
          modelNumber: s.modelNumber,
          pixelPitch: s.pixelPitch,
          widthFt: s.widthFt,
          heightFt: s.heightFt,
          installDate: new Date("2025-08-15"),
          isActive: true,
        },
      });
      screenRecords.push(screen);
      allScreenRecords.push(screen);
      console.log(`    ✓ Screen: ${s.name} (${s.manufacturer} ${s.pixelPitch}mm)`);
    }

    venueScreenMap[venue.id] = { venue, screens: screenRecords };
  }

  // Generate play logs for each venue
  const season2025Start = "2025-10-01";
  const season2025End = "2026-03-15";
  const gameDatesGainbridge = generateGameDates(season2025Start, season2025End, 6); // ~6 home games/month
  const gameDatesCrypto = generateGameDates(season2025Start, season2025End, 7); // ~7 home events/month

  const venues = Object.values(venueScreenMap);
  const gameDateSets = [gameDatesGainbridge, gameDatesCrypto];

  let totalLogs = 0;
  for (let vi = 0; vi < venues.length; vi++) {
    const { venue, screens } = venues[vi];
    const gameDates = gameDateSets[vi];
    const sponsors = Object.values(sponsorRecords);

    console.log(`\n  Generating play logs for ${venue.name} (${gameDates.length} game days)...`);

    const logs = generatePlayLogs(screens, sponsors, gameDates);
    console.log(`    Generated ${logs.length} play log entries.`);

    // Batch insert in chunks of 500
    const BATCH = 500;
    for (let i = 0; i < logs.length; i += BATCH) {
      const batch = logs.slice(i, i + BATCH);
      await prisma.playLog.createMany({
        data: batch.map((log) => ({
          screenId: screens.find((s) => s.name === log.screenName).id,
          sponsorId: sponsorRecords[log.sponsorName].id,
          contentName: log.contentName,
          playedAt: log.playedAt,
          durationSec: log.durationSec,
          verified: log.verified,
          source: log.source,
        })),
      });
      if ((i + BATCH) % 2000 === 0 || i + BATCH >= logs.length) {
        process.stdout.write(`    Inserted ${Math.min(i + BATCH, logs.length)}/${logs.length} logs\r`);
      }
    }
    console.log("");
    totalLogs += logs.length;
  }

  console.log(`\n✅  Seeded ${totalLogs} play logs across ${allScreenRecords.length} screens at ${VENUES.length} venues for ${SPONSORS.length} sponsors.`);

  // Generate a sample report for Coca-Cola at Gainbridge
  const gainbridge = venues[0];
  const cocaCola = sponsorRecords["Coca-Cola"];
  const dateFrom = new Date("2025-10-01");
  const dateTo = new Date("2026-03-15");

  // Count plays for Coca-Cola at Gainbridge
  const cokePlayCount = await prisma.playLog.count({
    where: {
      sponsorId: cocaCola.id,
      screen: { venueId: gainbridge.venue.id },
      playedAt: { gte: dateFrom, lte: dateTo },
    },
  });

  const cokeAirtime = await prisma.playLog.aggregate({
    where: {
      sponsorId: cocaCola.id,
      screen: { venueId: gainbridge.venue.id },
      playedAt: { gte: dateFrom, lte: dateTo },
    },
    _sum: { durationSec: true },
  });

  // Per-screen breakdown
  const screenBreakdown = [];
  for (const scr of gainbridge.screens) {
    const count = await prisma.playLog.count({
      where: {
        screenId: scr.id,
        sponsorId: cocaCola.id,
        playedAt: { gte: dateFrom, lte: dateTo },
      },
    });
    const airtime = await prisma.playLog.aggregate({
      where: {
        screenId: scr.id,
        sponsorId: cocaCola.id,
        playedAt: { gte: dateFrom, lte: dateTo },
      },
      _sum: { durationSec: true },
    });
    screenBreakdown.push({
      screenId: scr.id,
      screenName: scr.name,
      location: scr.location,
      plays: count,
      airtimeSec: airtime._sum.durationSec || 0,
      uptimePct: 98.5 + Math.random() * 1.4, // 98.5-99.9%
    });
  }

  // Sample play log entries (first 20)
  const sampleLogs = await prisma.playLog.findMany({
    where: {
      sponsorId: cocaCola.id,
      screen: { venueId: gainbridge.venue.id },
    },
    orderBy: { playedAt: "desc" },
    take: 50,
    include: { screen: { select: { name: true } } },
  });

  const reportData = {
    venue: { name: gainbridge.venue.name, client: gainbridge.venue.client, city: gainbridge.venue.city, state: gainbridge.venue.state },
    sponsor: { name: cocaCola.name, contact: cocaCola.contact, email: cocaCola.email },
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString(), label: "2025-26 Season (Oct 1 — Mar 15)" },
    summary: {
      totalPlays: cokePlayCount,
      totalAirtimeSec: cokeAirtime._sum.durationSec || 0,
      screenCount: gainbridge.screens.length,
      gameDays: gameDatesGainbridge.length,
      avgUptimePct: screenBreakdown.reduce((s, b) => s + b.uptimePct, 0) / screenBreakdown.length,
      compliancePct: 100.0,
      estimatedImpressions: Math.round(cokePlayCount * 2800), // ~2800 impressions per play based on venue capacity
    },
    screenBreakdown,
    sampleLogs: sampleLogs.map((l) => ({
      playedAt: l.playedAt.toISOString(),
      screenName: l.screen.name,
      contentName: l.contentName,
      durationSec: l.durationSec,
      verified: l.verified,
    })),
  };

  const shareHash = "pop-" + Buffer.from(`${gainbridge.venue.id}-${cocaCola.id}-2025`).toString("base64url").slice(0, 16);

  const report = await prisma.performanceReport.create({
    data: {
      venueId: gainbridge.venue.id,
      sponsorId: cocaCola.id,
      title: `Coca-Cola — Gainbridge Fieldhouse — 2025-26 Season`,
      dateFrom,
      dateTo,
      totalPlays: cokePlayCount,
      totalAirtime: cokeAirtime._sum.durationSec || 0,
      uptimePct: reportData.summary.avgUptimePct,
      compliancePct: 100.0,
      impressions: reportData.summary.estimatedImpressions,
      screenCount: gainbridge.screens.length,
      shareHash,
      reportData,
    },
  });

  console.log(`\n📊  Generated sample report: "${report.title}"`);
  console.log(`    Report ID: ${report.id}`);
  console.log(`    Share hash: ${report.shareHash}`);
  console.log(`    Plays: ${cokePlayCount} | Airtime: ${Math.round((cokeAirtime._sum.durationSec || 0) / 3600 * 10) / 10} hrs | Screens: ${gainbridge.screens.length}`);
  console.log(`\n🎉  Proof of Performance seed complete!`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
