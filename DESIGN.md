# MOSFit Studio demo

Visual thesis: a precise semiconductor modeling workbench with emerald status accents, fine blue scientific graphics, and subtle wafer-and-die artwork. Support true-black and white canvases.

Content plan: persistent navigation; project identity and metadata; compact overview; interactive transfer curves and fit results; contextual project inspector. Additional tabs expose datasets, experiments, model fitting, trends, correlations, and notes.

Interaction thesis: restrained panel entrance, animated experiment convergence, and quick drawer and tab transitions. Respect reduced motion. Model-fit plots use Plotly, with configurable columns, visibility, ordering, widths, and heights. Named local presets preserve plot and axis settings.

Navigation: one persistent icon sidebar owns workspace navigation, search, notifications, account controls, preferences, and appearance. Project tabs stay within the main workspace. Experiment actions belong in the main workspace; the right inspector contains project context and management actions.

Home: the Home button and TO-220 mark open the studio starting page. Recently opened projects take priority, with the latest project featured and a compact tool overview alongside it. A bare URL opens Home; project links retain their section and project identity. The local project library preserves each project's notes, datasets, parameters, and results; opening a project updates its recent position.

SPICE export: the project tab shows the complete library with syntax colors, line numbers, and a separate fitted-parameter highlight. Numeric precision and model naming update the artifact immediately. Automatic comparisons read back the exact exported numbers, with result/report/plot data bound to both that artifact and the selected dataset metadata. The prototype uses a clearly labeled browser replay of bundled dummy curves and a behavioral demonstration library; it does not execute a SPICE solver or produce a production BSIM-CMG model.

Appearance: true black is the default; white mode uses a white canvas, pale neutral surfaces, darker scientific curve colors, and the same semantic accents. The saved theme applies to the root element so portal dialogs and exported charts follow the selected palette.
