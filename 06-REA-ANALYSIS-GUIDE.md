# REA Analysis Guide — Reverse Engineering Strawberry Browser

## What is REA

REA (Reverse Engineer Anything) is an MCP server + CLI at github.com/morluto/rea.
It gives AI agents tools to analyze software without source code:
- Native binaries (Mach-O, ELF, PE)
- JavaScript / Electron apps (ASAR archives)
- .NET assemblies
- Websites (via browser CDP)

REA is already installed in this project as an MCP server.

---

## Why Analyze Strawberry's Binary

Strawberry is an Electron app. The ASAR archive contains:
- All TypeScript/JavaScript source (possibly minified or obfuscated)
- Companion system prompts
- Tool definitions sent to Claude
- IPC message schemas
- Routine/credit logic
- UI component structure

Even minified, REA's `analyze_javascript_application` + `recover_javascript_sources` can reconstruct intent.

---

## Step 1: Download the App

Strawberry distributes via email link (enter email on strawberrybrowser.com).

**macOS:**
```bash
# After downloading the .dmg:
hdiutil attach ~/Downloads/Strawberry-*.dmg
# App mounts at /Volumes/Strawberry/
```

**Find the ASAR:**
```bash
find /Volumes/Strawberry/ -name "*.asar" 2>/dev/null
# Typical path: /Volumes/Strawberry/Strawberry.app/Contents/Resources/app.asar
```

---

## Step 2: Extract the ASAR

```bash
npx @electron/asar extract \
  /Volumes/Strawberry/Strawberry.app/Contents/Resources/app.asar \
  /tmp/strawberry-extracted/
```

This gives you the full filesystem the Electron app sees.

---

## Step 3: REA JavaScript Application Analysis

### Full analysis (via Claude Code)

Tell Claude Code (me):
```
Analyze the Strawberry Browser ASAR at /tmp/strawberry-extracted/
using mcp__rea__analyze_javascript_application
```

I'll run:
```
mcp__rea__analyze_javascript_application({
  input_path: "/tmp/strawberry-extracted",
  format: "directory",
  detail: "summary",           ← get summary first, then drill in
  integrity_policy: "record-and-continue"
})
```

### What REA extracts

- All JS modules and their dependency graph
- Function names (even minified → semantic inference)
- Import/export shapes
- API call sites (Anthropic API, internal APIs)
- IPC message names and schemas
- Tool definitions (the JSON objects sent to Claude)
- System prompts (stored as strings in the bundle)

---

## Step 4: Recover Source Maps

Electron apps often ship with source maps (`.js.map` files) for debugging.

```bash
# Check for source maps
find /tmp/strawberry-extracted/ -name "*.map" | head -20

# If present, REA can reconstruct original TypeScript:
mcp__rea__recover_javascript_sources({
  capture_path: "/tmp/strawberry-capture.json",
  output_directory: "/tmp/strawberry-sources/"
})
```

Source maps reveal original TypeScript variable names, function names, and structure.

---

## Step 5: Capture Live Network Traffic

Run Strawberry with proxy to capture API calls:

```bash
# Install mitmproxy
brew install mitmproxy

# Launch Strawberry with proxy
HTTPS_PROXY=http://127.0.0.1:8080 \
  /Applications/Strawberry.app/Contents/MacOS/Strawberry

# In mitmproxy web UI at http://localhost:8081:
# Filter: ~d strawberrybrowser.com or anthropic.com
```

This reveals:
- Authentication endpoints (`/api/auth/*`)
- Credit endpoints (`/api/credits/*`)
- Routine sync endpoints
- The exact Claude API calls (model, system prompt structure)

---

## Step 6: REA Browser Scenario Capture

Capture the website + any web-based onboarding:

```
mcp__rea__capture_browser_scenario({
  browser: {
    mode: "launch",
    executable_path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  start_url: { url: "https://strawberrybrowser.com/" },
  actions: [
    { step_id: "load", action: "wait_for_timeout", duration_ms: 5000 },
    { step_id: "scroll", ... }
  ],
  capture: {
    at_end: ["screenshot", "dom"],
    events: ["network"],
    network: { response_body: true, header_values: true }
  }
})
```

Then export scripts:
```
mcp__rea__export_web_scripts({
  capture_path: "/tmp/strawberry-web-capture.json",
  output_directory: "/tmp/strawberry-web-scripts/"
})
```

---

## Step 7: Analyze the Companion Prompts

The most valuable thing in the ASAR: **system prompts**.

Search extracted files:
```bash
# Find system prompt strings
grep -r "You are" /tmp/strawberry-extracted/ --include="*.js" -l
grep -r "companion" /tmp/strawberry-extracted/ --include="*.js" -l
grep -r "tools" /tmp/strawberry-extracted/ --include="*.js" | grep '"name"' | head -50
```

REA will also surface these via semantic analysis — look for string constants that look like instructions.

---

## Step 8: Map the IPC Surface

In Electron apps, IPC channels define the API between main and renderer.

```bash
# Find all IPC channel names
grep -r "ipcMain\|ipcRenderer\|handle\|on\|send\|invoke" \
  /tmp/strawberry-extracted/ --include="*.js" | head -100
```

REA's `trace_javascript_semantics` will map the full IPC graph.

---

## What to Extract and Apply

| Artifact | Where to find it | How to use it |
|---------|-----------------|---------------|
| Companion system prompt | ASAR string constants | Refine our own system prompt |
| Tool definitions | ASAR JSON objects | Match tool schema design |
| Claude API call structure | Network capture | Replicate model + params |
| Credit deduction logic | ASAR functions | Design our credit system |
| IPC channels | ASAR grep | Design our IPC API |
| UI component structure | DOM capture | Inform UI design |
| API endpoints | Network capture | Design backend API |

---

## Legal Note

Reverse engineering for interoperability and competitive analysis is protected under US law (DMCA §1201(f)) and EU Directive 2009/24/EC. Building a competing product based on observed behavior (not copying code) is legal. Do not copy literal code from the ASAR into production.

---

## REA Tool Quick Reference

| REA Tool | Purpose |
|---------|---------|
| `capture_browser_scenario` | Capture website with network traffic |
| `export_web_scripts` | Extract JS from web capture |
| `analyze_javascript_application` | Deep analysis of ASAR/JS app |
| `recover_javascript_sources` | Reconstruct from source maps |
| `inspect_web_page` | Passive DOM/network inspection |
| `inspect_web_network_capture` | Analyze captured network traffic |
| `trace_javascript_semantics` | Trace data flow through JS |
| `compare_application_versions` | Diff two app versions |
| `get_evidence_bundle` | Get summary of retained analysis |
| `export_evidence_bundle` | Export all evidence to files |
