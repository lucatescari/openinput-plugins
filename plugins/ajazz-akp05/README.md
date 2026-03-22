# AJAZZ AKP05 Device Plugin

Official device driver for the **AJAZZ AKP05** family of macro pads.

## Supported Models

| Model | Product ID | Status |
|-------|-----------|--------|
| AJAZZ AKP05 | `0x3006` | Supported |
| AJAZZ AKP05E | `0x3004` | Supported |
| AJAZZ AKP05E Pro | `0x3013` | Supported |

All models share Vendor ID `0x0300` and use the same CRT-prefix USB HID protocol.

## Hardware

- **10 LCD keys** — 2 rows x 5 columns, 112x112px JPEG images, rotated 180 degrees
- **4 rotary encoders** — clockwise, counter-clockwise, and press
- **1 touch strip** — 4 zones (176x112px each), supports swipe left/right gestures

## Protocol

The AKP05 uses a custom HID protocol with CRT-prefixed commands:

| Command | Bytes | Description |
|---------|-------|-------------|
| DIS | `0x44 0x49 0x53` | Wake/initialize display |
| CONNECT | `0x43 0x4F 0x4E 0x4E 0x45 0x43 0x54` | Keep-alive heartbeat |
| LIG | `0x4C 0x49 0x47` | Set brightness (0-100) |
| BAT | `0x42 0x41 0x54` | Begin image transfer |
| STP | `0x53 0x54 0x50` | End image transfer (flush) |
| CLE | `0x43 0x4C 0x45` | Clear display slot |
| HAN | `0x48 0x41 0x4E` | Sleep/power off display |

- Output reports: 1025 bytes (report ID `0x00` + 1024 data)
- Input reports: 513 bytes, control ID at byte 9, state at byte 10

## Installation

1. Open OpenInput
2. Go to **Store** in the sidebar
3. Find "AJAZZ AKP05" and click **Install**
4. Restart the app
5. Plug in your AKP05 — it will be detected automatically
