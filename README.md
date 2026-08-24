
# Huawei GT 3 Pro AstroClock

A lightweight text-based astrology app for **Huawei GT 3 Pro / liteWearable** built with DevEco Studio.

## Preview
![Huawei GT 3 Pro AstroClock](screenshots/astroclock-preview.jpg)

## Development requirements

DevEco Studio: 3.1.0.501
API version: API 5
Target device: Huawei GT 3 Pro
Device type: liteWearable

This project was developed and tested with DevEco Studio 3.1.0.501
and is intended to be built using API 5.


## Features

- Current device time and date
- GPS coordinates with fallback handling
- Remembers the last successful GPS coordinates
- Ascendant (ASC) and Midheaven (MC)
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto and North Node
- Whole Sign house assignment
- Whole Sign house sign list without cusp degrees
- Via Combusta warning for ASC or Moon
- Scrollable text interface optimized for the 466×466 round display
- Large and small application icons included

## Target

- Device: Huawei GT 3 Pro
- Device type: `liteWearable`
- Bundle name: `com.example.astroclock`
- Entry page: `pages/index/index`

## Project structure

```text
entry/src/main/
├── config.json
├── js/default/
│   ├── app.js
│   ├── i18n/
│   └── pages/index/
│       ├── index.js
│       ├── index.hml
│       └── index.css
└── resources/
    └── base/
        ├── element/string.json
        └── media/
            ├── icon.png
            └── icon_small.png
```

## Open in DevEco Studio

1. Clone or download this repository.
2. Open the project folder in DevEco Studio.
3. Allow Gradle/project synchronization to complete.
4. Configure your own signing certificate/profile for your Huawei device.
5. Build the HAP and install it on the GT 3 Pro.

`local.properties`, `.idea`, `.gradle`, build outputs and other machine-specific files are intentionally excluded from the repository.

## Location permission

The project declares:

```text
ohos.permission.LOCATION
```

The app attempts to obtain the current GPS position. If a GPS fix is unavailable, it can use the last stored successful location and ultimately a default fallback coordinate.

## Astrology calculation note

This is a compact on-device approximation engine intended for a lightweight wearable app. It is not a replacement for a full professional astronomical ephemeris package.

## Whole Sign Houses

The sign containing the Ascendant is treated as the 1st house. Each following zodiac sign becomes the next house. House cusp degrees are therefore not displayed.
