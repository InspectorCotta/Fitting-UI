# MOSFit Studio

An interactive UI prototype based on the supplied true-black MOSFit reference. Built with React, TypeScript, Vite, Tailwind CSS, shadcn-style source components backed by Radix, Motion, and Lucide. Bun manages frontend dependencies; Biome formats source; Vitest and Testing Library verify interactions.

## Run

Open **http://127.0.0.1:5173/** while the development server is running.

With Bun on your PATH:

```powershell
bun install
bun run dev
```

After installing dependencies, you can also double-click `Start-Demo.cmd`. The author's workspace includes an ignored, locally installed Bun runtime that is not distributed with the repository:

```powershell
& '.\.tooling\node_modules\.bin\bun.cmd' run dev
```

`Start-Demo.cmd` opens the app in your default browser. If another server is already using port 5173, Vite selects the next available port and prints the address.

## Explore

- **Home:** the starting page and destination of both the Home button and TO-220 mark. Recently opened projects are ordered by opening time, with the latest featured, plus shortcuts to the studio tools. New projects are saved separately; reopening restores notes, datasets, parameters, results, and the last project section. Existing single-project data migrates into the local library.
- **SPICE Export:** inspect the complete behavioral demo `.lib` with syntax highlighting and fitted-value markers; configure the model name and precision; copy or download the exact file. Automatic numeric round-trip comparisons show transfer/output/capacitance overlays, relative RMS/max errors, and a JSON report containing that library snapshot and all comparison points. Changed values, export settings, or datasets invalidate old results. Stop/retry and manual comparison are supported. This browser demo replays exported numeric values against bundled synthetic 300 K measurements; it does not run an external SPICE engine, validate imported CSV rows, or implement a production BSIM-CMG core. The source uses behavioral SPICE constructs described in the [ngspice documentation](https://ngspice.sourceforge.io/docs.html).
- **Overview:** fit metrics, datasets, suggested next steps, transfer curves, and the project inspector.
- **Model Fit:** transfer, output, and Cgg/Cgs/Cgd plots share five live parameter sliders; undo, redo, and reset restore previous parameter values.
- **Region investigation:** click **Investigate** on any Model Fit plot and drag a box around reference markers. Mouse and touch selection capture physical bounds (including on log axes) and visible traces without changing zoom. **Use visible range** and the bounds/trace editor provide keyboard alternatives; **Try an example** opens a ready-made transfer selection. A fullscreen plot-first workspace captures the current synthetic curves, accepts a fitting objective, and uses a mock agent to assemble regional error metrics, bias/capacitance breakdowns, parameter hypotheses, and a proposed objective. Set a region weight and **Run focused demo fit** to compare baseline/candidate overlays and error inside/outside the selection. Stop, reselect, discard, reopen, and export the investigation as JSON. The investigation stays in the current Model Fit session; leaving the tab clears it. It never updates live parameters, experiments, or saved fits.
- **Compare Fits:** save named fit snapshots from Model Fit or the comparison page. Three example snapshots make the workflow usable immediately. Choose a baseline A and candidate B, swap roles, overlay transfer/output/capacitance curves, inspect relative RMS changes and parameter deltas, and export the exact compared snapshots as JSON. A uses dashed lines, B uses solid lines, and shared measurements use open circles. Plot zoom, bias visibility, scale, SVG export, and the full-screen inspector remain available. Snapshots stay fixed while live parameters change, persist with their project, and are included in workspace exports. The browser demo holds up to twelve snapshots per project; use the saved-fit library to remove examples or old snapshots.
- **Charts:** Plotly provides pan, zoom, log/linear axes, trace visibility, expanded inspection, and SVG export. Left-drag pans, right-drag draws a zoom box, and the mouse wheel zooms the hovered plot. Escape cancels a zoom box. A compact tooltip beside the cursor shows only the nearest curve's measured/model pair at one voltage; the values interpolate the actual plotted samples, respecting log axes. It follows the cursor, flips at plot edges, and disappears off the curve without reserving layout space. The app toolbar provides zoom, reset, expand, and export; Plotly's floating toolbar and default hover labels are disabled. The cartesian plotting bundle loads on demand.
- **View presets:** choose one, two, or three columns; show or hide plots and parameter tuning; drag grips or use arrow buttons to reorder; toggle full-width plots; drag lower edges or use focused separator arrow keys to resize. Save a named view, update it, or switch between built-in and custom presets. Presets include trace visibility, axis scales, pan/zoom ranges, and panel settings; the current layout also auto-saves locally.

The collapsed **Plots** filter beside the View selector contains measurement visibility and parameter-panel controls. It supports multiple selections and closes with Escape, Done, or a click outside.

The SPICE reader marks `.lib`/`.endl` and `.subckt`/`.ends` boundaries, with nested scope guides and gutter folding. Its compact **Structure** list jumps to a named block; **Expand all** restores folded content. Clicking a fitted parameter reveals its line even inside folded blocks. Copy and download always use the full, unchanged source.

Scroll the mouse wheel over a plot to zoom that plot around the cursor. Outside a plot, the wheel scrolls the page. Wheel zoom works in both pan and box-zoom modes; its axis ranges persist with the current view and named presets.
- **Experiments:** configure an extraction, follow a simulated eight-second run, stop it, or compare completed results.
- **Datasets:** filter measurement groups, download a sample CSV, validate and import CSV rows.
- **Parameter Trends / Correlation Matrix:** explore illustrative history and select correlated parameter pairs.
- **Notes:** edit an auto-saving lab notebook and export it as text.
- **Workspace:** project details, tags, favorites, project navigation, models, compute, preferences, and JSON export.

The sidebar contains all workspace navigation, search, notifications, account controls, and preferences. Use its sun/moon control to switch between true black and white mode, or choose a theme in Preferences. Appearance persists across reloads and applies to plots and dialogs. The inspector contains project details and management actions; experiment buttons stay in the main workspace.

Workspace and project-tab navigation use native browser history. Mouse back/forward buttons, browser controls, and browser navigation shortcuts restore the screens you visited. The URL also opens the same screen after a reload or when copied into another tab.

Press **Ctrl/⌘ K** for the command palette, **Ctrl/⌘ S** to confirm a save, and **Escape** to close dialogs. Project tabs also support left/right arrow keys.

Project details, parameters, tags, notes, datasets, completed experiments, current plot configuration, and named view presets persist in the browser's local storage. They stay specific to that browser and origin. Clear the `mosfit:*` local-storage entries to restore the starting demo.

## Scope

All scientific curves, convergence histories, metrics, team members, and compute behavior are illustrative. CSV import validates and records rows; imported values do not drive the plotting engine. The device illustration is an original SVG schematic. Sharing controls preview a possible team workflow and do not send invitations or change access. The app has no backend, authentication, or scientific optimizer.

The demo stores multiple projects in a local browser library, with one active project at a time. Creating a project starts a separate workspace from the measurement template; workspace exports provide downloadable snapshots. Browser-local projects and preferences are not included when cloning this repository. A future FastAPI/Python core can replace the simulated fitting engine, and Tauri can wrap the browser interface later.

## Saved-fit comparison data boundary

This remains a UI demonstration. `createDemoSavedFit` and `exampleSavedFits` in `src/savedFits.ts` create synthetic 300 K snapshots using the same surrogate curves as the live workbench; they do not run an optimizer or an external simulator. Imported CSV rows and the simulated experiment log do not become backend fit results. The comparison's RMS values describe its saved synthetic samples and can differ from the illustrative experiment-log metrics.

`FitComparison` receives `SavedFit[]` plus save/delete/export callbacks. It does not access storage, generate fixtures, or call a server. A future backend adapter can replace the App's browser-local snapshot lifecycle while keeping the comparison component. The versioned `SavedFit` contract contains IDs, timestamps, model and measurement-set identity, parameter values with units, numeric measurement/model curves, and per-measurement/overall error metrics. Validate loaded payloads with `isSavedFit`. Supply curves in the units and bias order described by `plotInfo`, and supply metrics as percentages. A backend can provide its own validated metrics without using the demo metric generator.

Comparisons require the same model family, measurement-set identity, and reference samples; mismatches show an explanation instead of misleading overlays. Demo relative errors use a denominator floor of one millionth of each reference curve's peak magnitude to handle zero-current samples. Changes in RMS are reported as B minus A in percentage points; parameter movement is not labeled as an improvement. No backend service, credentials, or scientific fitting logic is needed to explore this workflow.

## Plot interaction and design notes

Plot titles keep sweep, temperature, and frequency metadata inline; device identity comes from the project. Scale choices are `lin` and `log`. The **Plot information** button opens a themed, non-modal popover with visible bias/capacitance counts, total measured points, measured points on visible traces, and gesture help. Escape, the close button, or an outside interaction dismisses it; Escape inside an expanded plot closes only the popover. The compact layout removes the former metadata and count footer rows while retaining accessible controls.

The remaining plot-density ideas are recorded in [DESIGN_BACKLOG.md](DESIGN_BACKLOG.md).

Cursor readouts also highlight their exact interpolated plot coordinates: an open measured ring, a filled model dot, and an outlined candidate diamond in comparison views. A brief acquisition halo settles into static markers; reduced motion disables the halo. The pointer-transparent, clipped overlay follows Plotly's rendered axis rectangle, respects linear/log scales, clears during view changes and gestures, and never redraws or modifies curve data. SVG chart exports contain the scientific figure without this transient overlay.

## Region-agent integration boundary

`src/fitInvestigation.ts` defines versioned `InvestigationRequest`, physical-unit `FitRegion`, a bounded `RegionBlock` component plan, and the abortable `FitAgent` adapter (`investigate` and `runFocusedFit`). `RegionInvestigation` accepts that adapter; `demoFitAgent.ts` is the only mock integration. It uses delayed, deterministic rules and captured numeric samples, with no network calls, LLM, API keys, backend, or optimizer. Different plots and prompt categories produce different hypotheses and card ordering. Hypotheses are examples for later sensitivity checks, not inferred parameter causality.

The focused-fit surrogate adds measurement x positions to the captured model grid and moves selected curve samples toward the reference values, tapered at the x boundaries. A region weight controls the correction strength. Unselected reference predictions and all other plot families remain unchanged; the immutable baseline and measurements are retained. The before/after numbers are calculated from those exact arrays using the saved-fit relative-error convention. The preview does not represent a physically optimized parameter set and is deliberately kept out of the saved-fit library and live parameter controls.

A future backend can replace `demoFitAgent` with an authenticated service adapter and provide numerical analysis and optimizer results through the same UI boundary. Validate service payloads and allow only the supported component types when connecting an actual LLM. Preserve the captured model/measurement identity, reference-point selection, objective text, and cancellation behavior. Exports contain the captured request, component plan, weight, candidate curves, and calculated error groups so the intended handoff is reviewable.

## Verify

```powershell
bun run typecheck
bun run test
bun run build
bun run format
```

The interaction suite covers all screens, parameter editing/undo/redo, experiment completion and cancellation, command navigation, note persistence, CSV validation/import, native history, plot layout and preset persistence, and chart controls. Plotly lifecycle integration is tested with a mock renderer in jsdom, alongside checks on the actual figure data and axis configuration. Automated browser visual inspection was unavailable in the authoring session.

## Parameter controls

The Model Fit panel supports compact rotary dials and sliders. Use the **Sliders / Dials** switch above the controls; your selection is remembered in this browser. Switching preserves parameter values and undo/redo history. Both styles support exact numeric entry and update the demo plots live.

Dials fit three across in the desktop parameter panel. Drag vertically to adjust, hold Shift for fine control, double-click to reset a parameter to its baseline, or use arrow keys. Page Up/Down changes ten steps; Home/End selects the bounds. Hover a parameter card to see its full description and range.

Hosted preview: https://mosfit-dial-edition.freesun2.chatgpt.site (private; sign in with ChatGPT).

Click a parameter name or chevron to expand its tile. One tile opens at a time, showing bounds, step size, baseline, change from baseline, and reference sensitivity. The sensitivity values are fixed demo references.

Each expanded tile has a chronological **Start → edits → Now** timeline for this session. Click a past point to restore that parameter as a new undoable edit; returns to previous values remain visible. Unchanged snapshots are skipped and long timelines scroll horizontally. Sliders and dials share the same timeline.
