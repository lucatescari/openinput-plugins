/**
 * Windows Audio Mixer Plugin for OpenInput
 *
 * Shows per-app audio sessions on deck keys.
 * - Press a key to toggle mute for that app.
 * - Rotate an encoder to adjust volume for the last-selected app.
 * - Pagination when more apps than keys.
 *
 * Windows only — silently no-ops on other platforms.
 */

const { execFile } = require('child_process');

// ── State ──────────────────────────────────────────────────────────

let ctx = null;          // PluginContext
let active = false;      // Whether mixer mode is active
let pollTimer = null;    // setInterval handle
let sessions = [];       // [{name, pid, volume, muted}]
let page = 0;            // Pagination offset
let selectedIdx = -1;    // Last-pressed key index (for encoder control)
let keyCount = 0;        // Total keys on device
let keyWidth = 112;
let keyHeight = 112;
let csharpLoaded = false;

// Unsubscribe functions for context listeners
let unsubKeyDown = null;
let unsubEncoderRotate = null;
let unsubDeviceChange = null;

// ── PowerShell / C# Audio API ──────────────────────────────────────

const CSHARP_TYPE = `
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class AudioMixer {
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    private class MMDeviceEnumeratorClass { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator {
        int NotImpl_EnumAudioEndpoints();
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice {
        int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioSessionManager2 {
        int NotImpl_CreateAudioSessionControl();
        int NotImpl_GetAudioSessionControl();
        int GetSessionEnumerator(out IAudioSessionEnumerator enumerator);
    }

    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioSessionEnumerator {
        int GetCount(out int count);
        int GetSession(int index, out IAudioSessionControl session);
    }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioSessionControl {
        int NotImpl_State();
        int NotImpl_DisplayName();
        int NotImpl_Icon();
        int NotImpl_Guid();
        int NotImpl_GroupParam();
    }

    [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioSessionControl2 : IAudioSessionControl {
        // IAudioSessionControl methods
        new int NotImpl_State();
        new int NotImpl_DisplayName();
        new int NotImpl_Icon();
        new int NotImpl_Guid();
        new int NotImpl_GroupParam();
        // IAudioSessionControl2 methods
        int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
        int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
        int GetProcessId(out uint pid);
        int IsSystemSoundsSession();
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface ISimpleAudioVolume {
        int SetMasterVolume(float level, ref Guid ctx);
        int GetMasterVolume(out float level);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
        int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
    }

    private static Guid IID_IAudioSessionManager2 = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
    private static Guid IID_ISimpleAudioVolume = new Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8");

    public static string GetSessions() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorClass());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        object o;
        device.Activate(ref IID_IAudioSessionManager2, 23, IntPtr.Zero, out o);
        var mgr = (IAudioSessionManager2)o;
        IAudioSessionEnumerator sessionEnum;
        mgr.GetSessionEnumerator(out sessionEnum);
        int count;
        sessionEnum.GetCount(out count);
        var results = new List<string>();
        for (int i = 0; i < count; i++) {
            IAudioSessionControl ctl;
            sessionEnum.GetSession(i, out ctl);
            try {
                var ctl2 = (IAudioSessionControl2)ctl;
                uint pid;
                ctl2.GetProcessId(out pid);
                if (pid == 0) continue;
                string name = "";
                try { name = Process.GetProcessById((int)pid).ProcessName; } catch { continue; }
                var vol = (ISimpleAudioVolume)ctl;
                float level;
                vol.GetMasterVolume(out level);
                bool muted;
                vol.GetMute(out muted);
                results.Add(String.Format("{{\\\"name\\\":\\\"{0}\\\",\\\"pid\\\":{1},\\\"volume\\\":{2:F2},\\\"muted\\\":{3}}}",
                    name.Replace("\\\\","\\\\\\\\").Replace("\\\"","\\\\\\\""), pid, level, muted ? "true" : "false"));
            } catch { }
        }
        return "[" + String.Join(",", results) + "]";
    }

    public static void SetVolume(uint pid, float level) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorClass());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        object o;
        device.Activate(ref IID_IAudioSessionManager2, 23, IntPtr.Zero, out o);
        var mgr = (IAudioSessionManager2)o;
        IAudioSessionEnumerator sessionEnum;
        mgr.GetSessionEnumerator(out sessionEnum);
        int count;
        sessionEnum.GetCount(out count);
        Guid ctx = Guid.Empty;
        for (int i = 0; i < count; i++) {
            IAudioSessionControl ctl;
            sessionEnum.GetSession(i, out ctl);
            try {
                var ctl2 = (IAudioSessionControl2)ctl;
                uint p;
                ctl2.GetProcessId(out p);
                if (p == pid) {
                    var vol = (ISimpleAudioVolume)ctl;
                    vol.SetMasterVolume(Math.Max(0f, Math.Min(1f, level)), ref ctx);
                    return;
                }
            } catch { }
        }
    }

    public static void ToggleMute(uint pid) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorClass());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        object o;
        device.Activate(ref IID_IAudioSessionManager2, 23, IntPtr.Zero, out o);
        var mgr = (IAudioSessionManager2)o;
        IAudioSessionEnumerator sessionEnum;
        mgr.GetSessionEnumerator(out sessionEnum);
        int count;
        sessionEnum.GetCount(out count);
        Guid gctx = Guid.Empty;
        for (int i = 0; i < count; i++) {
            IAudioSessionControl ctl;
            sessionEnum.GetSession(i, out ctl);
            try {
                var ctl2 = (IAudioSessionControl2)ctl;
                uint p;
                ctl2.GetProcessId(out p);
                if (p == pid) {
                    var vol = (ISimpleAudioVolume)ctl;
                    bool muted;
                    vol.GetMute(out muted);
                    vol.SetMute(!muted, ref gctx);
                    return;
                }
            } catch { }
        }
    }
}
`;

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command', script,
    ], { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

async function ensureCSharpLoaded() {
  if (csharpLoaded) return;
  const escaped = CSHARP_TYPE.replace(/'/g, "''");
  await runPowerShell(`Add-Type -TypeDefinition '${escaped}'`);
  csharpLoaded = true;
}

async function getAudioSessions() {
  await ensureCSharpLoaded();
  const json = await runPowerShell('[AudioMixer]::GetSessions()');
  return JSON.parse(json);
}

async function toggleMute(pid) {
  await ensureCSharpLoaded();
  await runPowerShell(`[AudioMixer]::ToggleMute(${pid})`);
}

async function setVolume(pid, level) {
  await ensureCSharpLoaded();
  const clamped = Math.max(0, Math.min(1, level));
  await runPowerShell(`[AudioMixer]::SetVolume(${pid}, ${clamped.toFixed(2)})`);
}

// ── SVG Rendering ──────────────────────────────────────────────────

function esc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function buildSessionSvg(session, w, h, isSelected) {
  const name = truncate(esc(session.name), 10);
  const volPct = Math.round(session.volume * 100);
  const barW = w * 0.7;
  const barH = h * 0.1;
  const barX = (w - barW) / 2;
  const barY = h * 0.42;
  const fillW = barW * session.volume;
  const barColor = session.muted ? '#ef4444' : (isSelected ? '#60a5fa' : '#a78bfa');
  const bg = isSelected ? '#1e293b' : '#1a1625';
  const borderColor = isSelected ? '#3b82f6' : 'none';

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}" rx="6"/>
    ${isSelected ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="${borderColor}" stroke-width="2" rx="6"/>` : ''}
    <text x="${w / 2}" y="${h * 0.22}" font-family="Arial,sans-serif" font-size="${h * 0.13}" font-weight="600" fill="#e2e8f0" text-anchor="middle">${name}</text>
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="#334155" rx="${barH / 2}"/>
    <rect x="${barX}" y="${barY}" width="${fillW}" height="${barH}" fill="${barColor}" rx="${barH / 2}"/>
    <text x="${w / 2}" y="${h * 0.68}" font-family="Arial,sans-serif" font-size="${h * 0.11}" fill="#94a3b8" text-anchor="middle">${volPct}%</text>
    ${session.muted ? `<text x="${w / 2}" y="${h * 0.85}" font-family="Arial,sans-serif" font-size="${h * 0.09}" font-weight="700" fill="#ef4444" text-anchor="middle">MUTED</text>` : ''}
  </svg>`;
}

function buildNavSvg(label, icon, w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0f172a" rx="6"/>
    <text x="${w / 2}" y="${h * 0.45}" font-family="Arial,sans-serif" font-size="${h * 0.2}" fill="#64748b" text-anchor="middle">${icon}</text>
    <text x="${w / 2}" y="${h * 0.72}" font-family="Arial,sans-serif" font-size="${h * 0.1}" fill="#64748b" text-anchor="middle">${label}</text>
  </svg>`;
}

function buildEmptySvg(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0f172a" rx="6"/>
    <text x="${w / 2}" y="${h * 0.45}" font-family="Arial,sans-serif" font-size="${h * 0.14}" fill="#475569" text-anchor="middle">No Audio</text>
    <text x="${w / 2}" y="${h * 0.65}" font-family="Arial,sans-serif" font-size="${h * 0.09}" fill="#334155" text-anchor="middle">Sessions</text>
  </svg>`;
}

// ── Render to device ───────────────────────────────────────────────

async function renderKeys() {
  if (!ctx || !ctx.isConnected() || !active) return;

  const sharp = require('sharp');
  const totalKeys = keyCount;
  if (totalKeys === 0) return;

  // Pagination logic
  const hasPrev = page > 0;
  const totalSessions = sessions.length;
  let slotsForSessions = totalKeys;
  let startSlot = 0;

  // Calculate visible sessions for current page
  const sessionsPerPage = totalKeys - (hasPrev ? 1 : 0);
  const startSession = page === 0
    ? 0
    : (totalKeys - 1) + (page - 1) * (totalKeys - 2); // First page: N or N-1 slots, subsequent: N-2

  // Simpler approach: reserve slots for nav keys
  const hasNext = startSession + sessionsPerPage < totalSessions;

  const visibleStart = startSession;
  const maxVisible = slotsForSessions - (hasPrev ? 1 : 0) - (hasNext ? 1 : 0);
  const visibleSessions = sessions.slice(visibleStart, visibleStart + maxVisible);

  let keyIdx = 0;

  // Prev key
  if (hasPrev) {
    const svg = buildNavSvg('Prev', '◀', keyWidth, keyHeight);
    const buf = await sharp(Buffer.from(svg)).resize(keyWidth, keyHeight).png().toBuffer();
    await ctx.setKeyImage(keyIdx, buf);
    keyIdx++;
  }

  // Session keys
  for (const session of visibleSessions) {
    const isSelected = keyIdx === selectedIdx;
    const svg = buildSessionSvg(session, keyWidth, keyHeight, isSelected);
    const buf = await sharp(Buffer.from(svg)).resize(keyWidth, keyHeight).png().toBuffer();
    await ctx.setKeyImage(keyIdx, buf);
    keyIdx++;
  }

  // Fill remaining empty slots (before Next)
  const emptySlots = totalKeys - keyIdx - (hasNext ? 1 : 0);
  for (let i = 0; i < emptySlots; i++) {
    const svg = buildEmptySvg(keyWidth, keyHeight);
    const buf = await sharp(Buffer.from(svg)).resize(keyWidth, keyHeight).png().toBuffer();
    await ctx.setKeyImage(keyIdx, buf);
    keyIdx++;
  }

  // Next key
  if (hasNext) {
    const svg = buildNavSvg('Next', '▶', keyWidth, keyHeight);
    const buf = await sharp(Buffer.from(svg)).resize(keyWidth, keyHeight).png().toBuffer();
    await ctx.setKeyImage(keyIdx, buf);
    keyIdx++;
  }
}

// ── Poll + Render ──────────────────────────────────────────────────

async function pollAndRender() {
  if (!active || !ctx || !ctx.isConnected()) return;

  try {
    sessions = await getAudioSessions();
  } catch (err) {
    console.error('[audio-mixer] Failed to get audio sessions:', err);
    return;
  }

  try {
    await renderKeys();
  } catch (err) {
    console.error('[audio-mixer] Failed to render:', err);
  }
}

// ── Key/encoder handlers ───────────────────────────────────────────

function getSessionForKey(keyIdx) {
  if (!active || sessions.length === 0) return null;

  const hasPrev = page > 0;
  const totalKeys = keyCount;
  const sessionsPerPage = totalKeys - (hasPrev ? 1 : 0);
  const startSession = page === 0 ? 0 : (totalKeys - 1) + (page - 1) * (totalKeys - 2);
  const hasNext = startSession + sessionsPerPage < sessions.length;
  const maxVisible = totalKeys - (hasPrev ? 1 : 0) - (hasNext ? 1 : 0);

  // Check nav keys
  if (hasPrev && keyIdx === 0) return 'prev';
  if (hasNext && keyIdx === totalKeys - 1) return 'next';

  const sessionOffset = keyIdx - (hasPrev ? 1 : 0);
  if (sessionOffset < 0 || sessionOffset >= maxVisible) return null;

  const sessionIdx = startSession + sessionOffset;
  return sessions[sessionIdx] ?? null;
}

function handleKeyDown(keyIdx) {
  if (!active || keyIdx >= keyCount) return;

  const result = getSessionForKey(keyIdx);
  if (result === 'prev') {
    page = Math.max(0, page - 1);
    pollAndRender();
    return;
  }
  if (result === 'next') {
    page++;
    pollAndRender();
    return;
  }
  if (result && typeof result === 'object') {
    selectedIdx = keyIdx;
    toggleMute(result.pid)
      .then(() => pollAndRender())
      .catch((err) => console.error('[audio-mixer] Toggle mute failed:', err));
  }
}

function handleEncoderRotate(encoderIdx, direction) {
  if (!active || selectedIdx < 0) return;

  const session = getSessionForKey(selectedIdx);
  if (!session || typeof session !== 'object') return;

  const delta = direction === 'cw' ? 0.05 : -0.05;
  const newVol = Math.max(0, Math.min(1, session.volume + delta));

  session.volume = newVol; // Optimistic update for immediate render
  setVolume(session.pid, newVol).catch(() => {});
  renderKeys().catch(() => {});
}

function handleDeviceChange(connected) {
  if (connected && active) {
    // Device reconnected while mixer was active — restart polling
    updateLayoutInfo();
    if (!pollTimer) {
      pollTimer = setInterval(pollAndRender, 1500);
      pollAndRender();
    }
  } else if (!connected) {
    // Device disconnected — stop polling
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
}

function updateLayoutInfo() {
  if (!ctx) return;
  const layout = ctx.getLayout();
  if (layout?.keys) {
    keyCount = layout.keys.count;
    keyWidth = layout.keys.imageSpec.width;
    keyHeight = layout.keys.imageSpec.height;
  }
}

// ── Plugin exports ─────────────────────────────────────────────────

module.exports = {
  id: 'windows-audio-mixer',
  name: 'Windows Audio Mixer',
  description: 'Control per-app audio volumes from your deck. Press to mute, encoder to adjust.',
  version: '1.0.0',

  actions: [
    {
      id: 'mixer',
      name: 'Audio Mixer',
      icon: 'sliders-vertical',
      description: 'Show audio sessions on deck keys with volume control',
    },
  ],

  async initialize(context) {
    // Windows only
    if (process.platform !== 'win32') {
      console.log('[audio-mixer] Not on Windows — plugin disabled.');
      return;
    }

    ctx = context;
    updateLayoutInfo();

    unsubKeyDown = ctx.onKeyDown(handleKeyDown);
    unsubEncoderRotate = ctx.onEncoderRotate(handleEncoderRotate);
    unsubDeviceChange = ctx.onDeviceChange(handleDeviceChange);

    console.log('[audio-mixer] Plugin initialized.');
  },

  async execute(actionId) {
    if (actionId !== 'mixer' || !ctx || process.platform !== 'win32') return;

    if (active) {
      // Toggle off
      active = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      console.log('[audio-mixer] Mixer deactivated.');
      return;
    }

    // Activate
    active = true;
    page = 0;
    selectedIdx = -1;
    updateLayoutInfo();

    console.log('[audio-mixer] Mixer activated.');

    // Start polling
    pollTimer = setInterval(pollAndRender, 1500);
    await pollAndRender();
  },

  dispose() {
    active = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    unsubKeyDown?.();
    unsubEncoderRotate?.();
    unsubDeviceChange?.();
    ctx = null;
    sessions = [];
    csharpLoaded = false;
    console.log('[audio-mixer] Plugin disposed.');
  },
};
