/**
 * AJAZZ AKP05 Device Plugin for OpenInput
 *
 * Adds support for the AJAZZ AKP05, AKP05E, and AKP05E Pro macro pads.
 *
 * Hardware:
 *   - 10 LCD keys (2 rows x 5 cols, 112x112px JPEG, rotated 180deg)
 *   - 4 rotary encoders with press
 *   - 1 touch strip with 4 zones (176x112px each) + swipe left/right
 *
 * USB:
 *   - Vendor ID:  0x0300
 *   - Product IDs: 0x3006 (AKP05), 0x3004 (AKP05E), 0x3013 (AKP05E Pro)
 *   - Usage Page: 0xFFA0
 *
 * Protocol:
 *   - 1025-byte output reports (0x00 report ID + 1024 data)
 *   - Commands prefixed with "CRT" (0x43 0x52 0x54)
 *   - 513-byte input reports, control ID at byte 9, state at byte 10
 */

// ── Protocol constants ──────────────────────────────────────────────

const REPORT_SIZE = 1024;
const CRT_PREFIX = Buffer.from([0x43, 0x52, 0x54, 0x00, 0x00]);

// ── Input maps (device byte → app index) ────────────────────────────

/** Maps physical key input IDs (byte 9 values) to key indices 0-9 */
const KEY_INPUT_MAP = {
  0x01: 0, 0x02: 1, 0x03: 2, 0x04: 3, 0x05: 4,
  0x06: 5, 0x07: 6, 0x08: 7, 0x09: 8, 0x0a: 9,
};

/** Maps touch strip zone input IDs to zone indices 0-3 */
const TOUCH_INPUT_MAP = {
  0x40: 0, 0x41: 1, 0x42: 2, 0x43: 3,
};

/** Encoder input byte mappings */
const ENCODER_MAP = {
  // Encoder 0
  0xa0: { index: 0, direction: 'ccw' },
  0xa1: { index: 0, direction: 'cw' },
  0x37: { index: 0, direction: 'press' },
  // Encoder 1
  0x50: { index: 1, direction: 'ccw' },
  0x51: { index: 1, direction: 'cw' },
  0x35: { index: 1, direction: 'press' },
  // Encoder 2
  0x90: { index: 2, direction: 'ccw' },
  0x91: { index: 2, direction: 'cw' },
  0x33: { index: 2, direction: 'press' },
  // Encoder 3
  0x70: { index: 3, direction: 'ccw' },
  0x71: { index: 3, direction: 'cw' },
  0x36: { index: 3, direction: 'press' },
};

/** Swipe input byte mappings */
const SWIPE_MAP = {
  0x38: 'left',
  0x39: 'right',
};

// ── Output maps (app index → device output ID) ─────────────────────

/** Maps key indices 0-9 to output IDs for image writes */
const KEY_OUTPUT_MAP = {
  // Top row (keys 0-4)
  0: 0x0b, 1: 0x0c, 2: 0x0d, 3: 0x0e, 4: 0x0f,
  // Bottom row (keys 5-9)
  5: 0x06, 6: 0x07, 7: 0x08, 8: 0x09, 9: 0x0a,
};

/** Touch strip output IDs for image writes */
const TOUCH_OUTPUT_MAP = {
  0: 0x01, 1: 0x02, 2: 0x03, 3: 0x04,
};

// ── Low-level helpers ───────────────────────────────────────────────

function buildCommand(cmd, args) {
  const data = Buffer.alloc(REPORT_SIZE, 0);
  CRT_PREFIX.copy(data, 0);
  cmd.copy(data, CRT_PREFIX.length);
  if (args) {
    args.copy(data, CRT_PREFIX.length + cmd.length);
  }
  return data;
}

function prependReportId(data) {
  const report = Buffer.alloc(REPORT_SIZE + 1, 0);
  report[0] = 0x00;
  data.copy(report, 1);
  return report;
}

async function sendCommand(device, cmd, args) {
  const data = buildCommand(cmd, args);
  const report = prependReportId(data);
  await device.write([...report]);
}

// ── AKP05 Protocol ──────────────────────────────────────────────────

class AKP05Protocol {
  async initialize(device) {
    // DIS — wake/initialize display
    await sendCommand(device, Buffer.from([0x44, 0x49, 0x53]));
    // LIG — set default brightness to 80
    await sendCommand(
      device,
      Buffer.from([0x4c, 0x49, 0x47]),
      Buffer.from([0x00, 0x00, 80]),
    );
  }

  async sendHeartbeat(device) {
    // CONNECT
    await sendCommand(
      device,
      Buffer.from([0x43, 0x4f, 0x4e, 0x4e, 0x45, 0x43, 0x54]),
    );
  }

  async setBrightness(device, level) {
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    await sendCommand(
      device,
      Buffer.from([0x4c, 0x49, 0x47]),
      Buffer.from([0x00, 0x00, clamped]),
    );
  }

  async sendImage(device, outputId, imageData) {
    // BAT announce: size (4 bytes big-endian) + output ID
    const sizeBytes = Buffer.alloc(4);
    sizeBytes.writeUInt32BE(imageData.length, 0);

    await sendCommand(
      device,
      Buffer.from([0x42, 0x41, 0x54]),
      Buffer.from([sizeBytes[0], sizeBytes[1], sizeBytes[2], sizeBytes[3], outputId]),
    );

    // Stream JPEG data in chunks
    let offset = 0;
    while (offset < imageData.length) {
      const chunk = Buffer.alloc(REPORT_SIZE + 1, 0);
      chunk[0] = 0x00;
      const remaining = imageData.length - offset;
      const copyLen = Math.min(remaining, REPORT_SIZE);
      imageData.copy(chunk, 1, offset, offset + copyLen);
      await device.write([...chunk]);
      offset += copyLen;
    }

    // STP — flush to display
    await sendCommand(device, Buffer.from([0x53, 0x54, 0x50]));
  }

  async clearSlot(device, outputId) {
    // CLE
    await sendCommand(
      device,
      Buffer.from([0x43, 0x4c, 0x45]),
      Buffer.from([0x00, 0x00, 0x00, outputId]),
    );
  }

  async sleep(device) {
    // HAN
    await sendCommand(device, Buffer.from([0x48, 0x41, 0x4e]));
  }

  parseInputReport(data) {
    if (data.length < 11) return null;

    const controlId = data[9];
    const state = data[10]; // 0x01 = pressed, 0x00 = released
    const now = Date.now();

    // LCD key press/release
    if (controlId in KEY_INPUT_MAP) {
      return {
        type: state === 0x01 ? 'key_down' : 'key_up',
        index: KEY_INPUT_MAP[controlId],
        timestamp: now,
      };
    }

    // Touch zone press/release
    if (controlId in TOUCH_INPUT_MAP) {
      return {
        type: state === 0x01 ? 'touch_press' : 'touch_release',
        index: TOUCH_INPUT_MAP[controlId],
        timestamp: now,
      };
    }

    // Encoder rotation or press
    if (controlId in ENCODER_MAP) {
      const mapping = ENCODER_MAP[controlId];
      if (mapping.direction === 'cw') {
        return { type: 'encoder_cw', index: mapping.index, timestamp: now };
      } else if (mapping.direction === 'ccw') {
        return { type: 'encoder_ccw', index: mapping.index, timestamp: now };
      } else {
        return {
          type: state === 0x01 ? 'encoder_press' : 'encoder_release',
          index: mapping.index,
          timestamp: now,
        };
      }
    }

    // Swipe gestures
    if (controlId in SWIPE_MAP) {
      const direction = SWIPE_MAP[controlId];
      return {
        type: direction === 'left' ? 'swipe_left' : 'swipe_right',
        index: 0,
        timestamp: now,
      };
    }

    return null;
  }

  getOutputId(elementType, index) {
    if (elementType === 'key') return KEY_OUTPUT_MAP[index];
    if (elementType === 'touchZone') return TOUCH_OUTPUT_MAP[index];
    return undefined;
  }
}

// ── Plugin export ────────────────────────────────────────────────────

module.exports = {
  id: 'ajazz-akp05',
  name: 'AJAZZ AKP05',
  description: 'Device driver for the AJAZZ AKP05, AKP05E, and AKP05E Pro macro pads — 10 LCD keys, 4 encoders, touch strip.',
  version: '1.0.0',

  devicePlugin: {
    meta: {
      id: 'ajazz-akp05',
      name: 'AJAZZ AKP05',
      layout: {
        keys: {
          rows: 2,
          cols: 5,
          count: 10,
          imageSpec: {
            width: 112,
            height: 112,
            rotation: 180,
            format: 'jpeg',
            quality: 90,
            maxBytes: 20480,
          },
        },
        encoders: {
          count: 4,
          hasPress: true,
        },
        touchZones: {
          count: 4,
          imageSpec: {
            width: 176,
            height: 112,
            rotation: 180,
            format: 'jpeg',
            quality: 90,
            maxBytes: 20480,
          },
        },
        swipe: true,
      },
      match: [
        {
          vendorId: 0x0300,
          productIds: [0x3006, 0x3004, 0x3013],
          usagePage: 0xffa0,
        },
      ],
    },

    createProtocol() {
      return new AKP05Protocol();
    },
  },
};
