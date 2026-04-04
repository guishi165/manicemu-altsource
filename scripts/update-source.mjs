#!/usr/bin/env node
// update-source.mjs
// Fetches releases from Manic-EMU/ManicEMU and writes source.json

import fs from "fs";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const SOURCE_REPO  = "Manic-EMU/ManicEMU";
const MAX_VERSIONS = 10;

const SOURCE_META = {
  name:        "ManicEMU",
  identifier:  "com.manicemu.altsource",
  subtitle:    "All-in-one retro game emulator for iOS",
  description: "Automatically updated AltStore/SideStore source for ManicEMU from github.com/Manic-EMU/ManicEMU.",
  iconURL:     "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a01.jpg",
  headerURL:   "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a02.jpg",
  website:     "https://github.com/Manic-EMU/ManicEMU",
  tintColor:   "#7B5CFF",
};

const APP_META = {
  name:             "ManicEMU",
  bundleIdentifier: "com.aoshuang.manicemu",
  developerName:    "Manic-EMU",
  subtitle:         "All-in-one retro game emulator",
  localizedDescription:
    "Manic EMU is an all-in-one retro game emulator for iOS with a clean UI and buttery-smooth gameplay.\n\n" +
    "Supported platforms:\n" +
    "Nintendo: 3DS, N64, NDS, GBA, GBC, GB, NES, FDS, SNES, Virtual Boy, Pokémon Mini\n" +
    "Sony: PS1, PSP\n" +
    "Sega: Dreamcast, Saturn, Master System, Game Gear, SG-1000, 32X, Mega-CD, Genesis/MegaDrive\n" +
    "Other: DOOM, J2ME (Java), and more coming soon!\n\n" +
    "Key Features:\n" +
    "• Unlimited saves: manual & 50 auto-save slots\n" +
    "• 5x speed control\n" +
    "• Cheat codes library\n" +
    "• Retro filters & custom skins\n" +
    "• RetroAchievements integration with Hardcore Mode\n" +
    "• iCloud sync across devices\n" +
    "• Google Drive, Dropbox, OneDrive, WebDAV, SMB support\n" +
    "• Native Joy-Con, DualShock, Xbox controller support\n" +
    "• AirPlay mirroring",
  iconURL:   "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/08/14/87/08148775-75af-5671-2321-6d543c01b8a7/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/460x0w.webp",
  tintColor: "#7B5CFF",
  screenshotURLs: [
    "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a01.jpg",
    "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a02.jpg",
    "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a03.jpg",
    "https://raw.githubusercontent.com/Manic-EMU/ManicEMU/main/images_manicemu_ver4_a04.jpg",
  ],
  appPermissions: {
    entitlements: [],
    privacy: {
      NSMicrophoneUsageDescription:      "Used for in-game audio recording features.",
      NSPhotoLibraryAddUsageDescription: "Used to save screenshots.",
      NSPhotoLibraryUsageDescription:    "Used to import game ROMs and media.",
      NSCameraUsageDescription:          "Used for augmented reality features.",
    },
  },
};

// ─── GitHub API helpers ───────────────────────────────────────────────────────

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function ghFetch(url) {
  const res = await fetch(url, { headers: GH_HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} for ${url}: ${body}`);
  }
  return res.json();
}

async function fetchAllReleases(repo) {
  const releases = [];
  let page = 1;
  while (releases.length < MAX_VERSIONS) {
    const batch = await ghFetch(
      `https://api.github.com/repos/${repo}/releases?per_page=30&page=${page}`
    );
    if (!batch.length) break;
    releases.push(...batch);
    if (batch.length < 30) break;
    page++;
  }
  return releases.slice(0, MAX_VERSIONS);
}

// ─── Version builder ─────────────────────────────────────────────────────────

function extractVersion(release, ipaName) {
  // Try IPA filename first, e.g. "ManicEMU_1.9.0.ipa"
  if (ipaName) {
    const m = ipaName.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (m) return m[1];
  }
  // Fall back to tag name, e.g. "v1.9.0" → "1.9.0"
  return release.tag_name.replace(/^v/, "");
}

function cleanNotes(body) {
  if (!body) return "";
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 800);
}

function buildVersionEntry(release, ipa) {
  return {
    version:              extractVersion(release, ipa.name),
    date:                 release.published_at.split("T")[0],
    localizedDescription: cleanNotes(release.body) || release.name || release.tag_name,
    downloadURL:          ipa.browser_download_url,
    size:                 ipa.size ?? 0,
    minOSVersion:         "15.0",
    maxOSVersion:         "99.9",
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching releases from ${SOURCE_REPO}…`);
  const releases = await fetchAllReleases(SOURCE_REPO);
  console.log(`  Got ${releases.length} release(s).`);

  const versions = [];

  for (const rel of releases) {
    const ipas = (rel.assets ?? []).filter((a) => a.name.endsWith(".ipa"));
    if (!ipas.length) {
      console.warn(`  ⚠ Release ${rel.tag_name} has no IPA assets — skipping.`);
      continue;
    }
    // ManicEMU only ships one IPA per release (no iOS 15 split), take the first
    const entry = buildVersionEntry(rel, ipas[0]);
    versions.push(entry);
  }

  if (!versions.length) {
    throw new Error("No IPA assets found in any release — aborting.");
  }

  console.log(`  Built ${versions.length} version(s). Latest: ${versions[0].version}`);

  const source = {
    ...SOURCE_META,
    featuredApps: [APP_META.bundleIdentifier],
    apps: [{ ...APP_META, versions }],
    news: [],
  };

  const outPath = path.resolve("source.json");
  fs.writeFileSync(outPath, JSON.stringify(source, null, 2) + "\n");
  console.log(`✓ Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
