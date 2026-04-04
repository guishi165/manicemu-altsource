# ManicEMU AltStore / SideStore Source

An automatically updated AltStore/SideStore source for **ManicEMU** from [Manic-EMU/ManicEMU](https://github.com/Manic-EMU/ManicEMU).

A GitHub Actions workflow runs **every hour**, checks for new releases, and commits an updated `source.json` if anything changed.

---

## Add to AltStore / SideStore

```
https://raw.githubusercontent.com/guishi165/manicemu-altsource/main/source.json
```

---

## How it works

```
Every hour (GitHub Actions cron)
  └─ scripts/update-source.mjs
       ├─ Calls GitHub API → Manic-EMU/ManicEMU/releases
       ├─ Finds .ipa assets in each release
       ├─ Builds source.json with up to 10 versions
       └─ Commits & pushes only if something changed
```

- Uses the built-in `GITHUB_TOKEN` — no extra secrets needed.
- Keeps up to the last **10** releases.

---

## Manual trigger

Go to **Actions → Update AltStore Source → Run workflow**.
