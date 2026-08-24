# Huawei GT 3 Pro AstroClock — Semigraphic Edition

A semigraphic astrology app for **Huawei GT 3 Pro / liteWearable**, built with HarmonyOS JavaScript UI in DevEco Studio.

![Semigraphic AstroClock on Huawei GT 3 Pro](screenshot.jpeg)

## Development requirements

- **DevEco Studio:** 3.1.0.501
- **API:** API 5
- **Target device:** Huawei GT 3 Pro
- **Device type:** `liteWearable`
- **Display target:** 466 × 466

> **Important real-device rendering note:** on the GT 3 Pro, the text in this interface must use **22 px**. Smaller values such as 14–18 px may appear correctly in Preview but can disappear on the physical watch. For this project, treat the physical watch as the rendering reference.

## Features

- Current local time and date
- GPS lookup with a 10-second timeout
- Stores the last successful GPS coordinates
- Falls back to the last saved location, then Ankara if no location is available
- Ascendant (ASC) and Midheaven (MC)
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto and North Node
- Whole Sign houses with the Ascendant sign fixed as the 1st house
- Houses numbered 1–12 around the wheel
- Element-colored sign/house borders: Fire red, Earth green, Air yellow, Water blue
- `*` marker when more than one displayed body/point occupies the same sign; ASC and MC are included in this count
- Scrollable per-sign body lists for signs containing multiple bodies
- Via Combusta highlighting for ASC from 15° Libra through 15° Scorpio, inclusive

## Location permission

The app declares `ohos.permission.LOCATION`.

Location flow:

1. Wait up to 10 seconds for the current GPS position.
2. If successful, save and use it.
3. If GPS is unavailable, use the last saved location.
4. If no saved location exists, use Ankara (`39.9334, 32.8597`).

## Build and signing

Open with **DevEco Studio 3.1.0.501** and build against **API 5**. Configure your own signing certificate/profile before installing on a physical watch. Machine-specific build output and signing credentials are intentionally not committed.

## Astrology calculation note

The on-device planetary engine is a compact approximation suitable for a lightweight wearable interface; it is not intended to replace a professional astronomical ephemeris package.
