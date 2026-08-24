# Huawei GT 3 Pro AstroClock — Text

Text-based astrology clock for Huawei GT 3 Pro / Lite Wearable.

<img src="screenshot.jpg" width="260" alt="Huawei GT 3 Pro AstroClock Text screenshot">

## Target
- Huawei GT 3 Pro
- Lite Wearable
- API 5
- 466 × 466 display
- DevEco Studio 3.1.0.501

## Features
- Current local time and date
- GPS-based location
- 10-second GPS wait, then saved location, then Ankara fallback
- Ascendant and Midheaven
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto and North Node
- Whole Sign Houses
- Scrollable text list

## Location permission
The project requests `ohos.permission.LOCATION` in `entry/src/main/config.json`.

## Signing
Signing files, passwords, local machine paths and `local.properties` are intentionally not included. Configure your own signing profile/certificate in DevEco Studio before installing on a physical watch.

## Project structure
The repository contains the clean project sources only. Generated folders such as `.gradle`, `.idea`, `build`, `entry/build` and `.preview` are excluded.
