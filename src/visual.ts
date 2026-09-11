"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import DataView = powerbi.DataView;

import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

import { VisualFormattingSettingsModel, alignSelfFor, textAlignFor } from "./settings";
import { toRgba, compositeOver, surfaceTone, contrastInk, contrastRatio } from "./shared/colorHelpers";
import { Band, Theme, accentToken, bandColor } from "./shared/bandEngine";
import { surfaceTokens, TABULAR_NUMS, mix } from "./shared/designTokens";
import { applyBorder } from "./shared/borderSettings";
import { makeCornerBrackets, CardSignatureHandle } from "./shared/cardSignature";
import { applyCardSignature } from "./shared/cardSignatureSettings";
import { settle } from "./shared/motion";
import { applyHighContrast, statusGlyph } from "./shared/highContrast";
import { formatModelNumber } from "./shared/numberFormat";
import { LicenseGate } from "./shared/licensing";

interface FontFmt { fontFamily?: { value?: string }; fontSize?: { value?: number }; bold?: { value?: boolean }; italic?: { value?: boolean }; underline?: { value?: boolean }; }

function applyFont(el: HTMLElement, f: FontFmt): void {
    if (f.fontFamily?.value) el.style.fontFamily = f.fontFamily.value;
    if (typeof f.fontSize?.value === "number") el.style.fontSize = `${f.fontSize.value}px`;
    el.style.fontWeight = f.bold?.value ? "700" : "400";
    el.style.fontStyle = f.italic?.value ? "italic" : "normal";
    el.style.textDecoration = f.underline?.value ? "underline" : "none";
}
import { CODEX_TOKENS } from "./utils";

interface ParsedCard {
    value: number | string | null;
    label: string | null;
    subtitle: string | null;
    changeValue: number | null;
    changeLabel: string | null;
    // The Change Value column's OWN model format string, when the model
    // carries one. The pill is formatted through it (see autoFormatChange)
    // so a measure authored as "0.0%" reads as a percentage and one authored
    // as "$#,##0.00" reads as money, instead of the pill inventing a unit.
    changeFormat: string | null;
    accentColour: string | null;
    textColour: string | null;
}

// v2 board look (v3 appearance engine pilot, Plan 15): KPI Card exposes no
// target/goal measure, so the ONE band-engine colour token is derived from
// the EXISTING changeDirection (upIsGood/downIsGood/neutral) semantics
// rather than a literal directionColor(changeValue) sign read — a report
// configured "Down is Good" for a cost/churn metric must keep reading a
// decrease as success, so the good/bad flag stays the source of truth for
// which band applies (D-16: saved settings still resolve).
// directionColor() itself remains available in bandEngine.ts for the batch
// visuals whose delta is a literal direction, not a configurable flag.
type DeltaBand = Band | null;

// The local themeFor() luminance pick is gone: shared/colorHelpers surfaceTone()
// is the same Rec.601 read at the same 0.55 threshold, and it is what the rest
// of the suite now judges a COMPOSITED surface with (NEXUS cycle-01 §3).

const STRIP_SEGMENTS = 10;

// Must match the DECLARED default of titleSettings.titleColor in
// src/shared/titleSettings.ts. A drift between the two would make the title
// adapt when the user HAD set a colour, or refuse to adapt when they had not.
const TITLE_DEFAULT_INK = "#1a1a2e";

function automaticInk(surface: string, dark: string, light = surfaceTokens("dark").text): string {
    const ink = contrastInk(surface, dark, light);
    return contrastRatio(ink, surface) >= 4.5 ? ink : contrastInk(surface, "#000000", "#ffffff");
}

function signalInk(surface: string, preferred: string): string {
    const fallback = contrastInk(surface, "#000000", "#ffffff");
    // Leave a small margin for the browser's alpha-channel rounding.
    for (let step = 0; step <= 10; step++) {
        const ink = mix(preferred, fallback, step / 10);
        if (contrastRatio(ink, surface) >= 4.6) return ink;
    }
    return fallback;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private tooltipService: ITooltipService;
    private localizationManager: ILocalizationManager;
    // Initialised in the CONSTRUCTOR, not on first data. The formatting pane
    // can call getFormattingModel() before any DataView exists, and an
    // undefined model made the getter throw `Cannot read properties of
    // undefined (reading 'cards')` on a constructor-only instance and on every
    // no-DataView update (NEXUS cycle-01 §6, still open at pass two). Defaults
    // here are the same declared defaults populateFormattingSettingsModel()
    // starts from, so the first populated update renders exactly as before.
    private formattingSettings: VisualFormattingSettingsModel = new VisualFormattingSettingsModel();
    private formattingSettingsService: FormattingSettingsService;

    // State for tooltips
    private cardTooltipItems: VisualTooltipDataItem[] = [];

    // Selection ID for click-to-filter (1180.2.2.3)
    private currentSelectionId: ISelectionId | null = null;
    private selectionRefresh: { run: (() => void) | null } = { run: null };

    // v3 motion state — only re-settles the value when its display text changes.
    private lastDisplayValue: string | null = null;

    // DOM elements
    private container: HTMLElement;
    private titleEl: HTMLElement;
    private headerRow: HTMLElement;
    private labelEl: HTMLElement;
    private dotEl: HTMLElement;
    private valueEl: HTMLElement;
    private footerRow: HTMLElement;
    private subtitleEl: HTMLElement;
    private pillEl: HTMLElement;
    private pillArrow: HTMLElement;
    private pillText: Text;
    private stripEl: HTMLElement;
    private stripSegments: HTMLElement[] = [];
    private cornerSignature: CardSignatureHandle | null = null;
    private licenseGate: LicenseGate;
    private lastUpdateOptions: VisualUpdateOptions | null = null;

    // Owned listeners, held so destroy() can unregister the same references.
    private onContextMenu: (e: MouseEvent) => void;
    private onCardClick: (e: MouseEvent) => void;
    private onCardMouseMove: (e: MouseEvent) => void;
    private onCardMouseLeave: () => void;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        // NO FREE TIER — an unlicensed user gets the whole visual blocked.
        // The check is async, so re-run the last update once it resolves.
        this.licenseGate = new LicenseGate(options.host, () => {
            if (this.lastUpdateOptions) this.update(this.lastUpdateOptions);
        });
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.localizationManager = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        const selectionRefresh = this.selectionRefresh;
        selectionRefresh.run = () => {
            if (this.lastUpdateOptions) this.update(this.lastUpdateOptions);
        };
        // Host callbacks and pending promises retain only this disposable bridge.
        const redrawSelection = () => selectionRefresh.run?.();
        this.selectionManager.registerOnSelectCallback?.(redrawSelection);

        // Build static DOM skeleton
        this.container = document.createElement("div");
        this.container.className = "os-kpi-card";
        this.container.style.position = "relative";

        this.titleEl = document.createElement("div");
        this.titleEl.className = "os-kpi-title";
        this.titleEl.style.display = "none";

        // ─── v2 header row: eyebrow label + status dot ─────────
        this.headerRow = document.createElement("div");
        this.headerRow.className = "os-kpi-header";

        this.labelEl = document.createElement("div");
        this.labelEl.className = "os-kpi-label";

        this.dotEl = document.createElement("span");
        this.dotEl.className = "os-kpi-dot";

        this.headerRow.appendChild(this.labelEl);
        this.headerRow.appendChild(this.dotEl);

        this.valueEl = document.createElement("div");
        this.valueEl.className = "os-kpi-value";

        // ─── v2 footer row: change pill + subtitle ─────────────
        this.footerRow = document.createElement("div");
        this.footerRow.className = "os-kpi-footer";

        this.subtitleEl = document.createElement("div");
        this.subtitleEl.className = "os-kpi-subtitle";

        this.pillEl = document.createElement("div");
        this.pillEl.className = "os-kpi-pill";

        // Build pill children via DOM API only (createElement/createTextNode)
        this.pillArrow = document.createElement("span");
        this.pillArrow.className = "os-pill-arrow";
        this.pillText = document.createTextNode("");
        this.pillEl.appendChild(this.pillArrow);
        this.pillEl.appendChild(this.pillText);

        this.footerRow.appendChild(this.pillEl);
        this.footerRow.appendChild(this.subtitleEl);

        // ─── v2 quantised target strip (LED rhythm, §5) ────────
        this.stripEl = document.createElement("div");
        this.stripEl.className = "os-kpi-strip";
        for (let i = 0; i < STRIP_SEGMENTS; i++) {
            const seg = document.createElement("span");
            seg.className = "os-kpi-strip-seg";
            this.stripEl.appendChild(seg);
            this.stripSegments.push(seg);
        }

        this.container.appendChild(this.titleEl);
        this.container.appendChild(this.headerRow);
        this.container.appendChild(this.valueEl);
        this.container.appendChild(this.footerRow);
        this.container.appendChild(this.stripEl);
        this.target.appendChild(this.container);

        // Corner-bracket card signature — appended last (by makeCornerBrackets
        // itself, via the container) so it paints above the title panel.
        this.cornerSignature = makeCornerBrackets(this.container, "#8f8ab8", {
            variant: "cornerBracket",
            mirror: true,
        });

        // Context menu support
        // Bound to the visual ROOT (options.element), not the inner
        // container — container-only binding leaves any uncovered pixel a
        // dead zone for Policy 1180.2.5 (the old cert-report failure class;
        // caught by verify-pbiviz.js's root-dispatch check).
        // Handlers are kept on the instance so destroy() can unregister the
        // exact same function objects — an inline arrow is unremovable, and
        // that is why a destroyed card still answered a context-menu click and
        // still pushed a tooltip on hover (NEXUS pass-two adjacent coverage 2).
        this.onContextMenu = (e: MouseEvent) => {
            const identity = this.container.contains(e.target as Node) ? this.currentSelectionId : null;
            this.selectionManager.showContextMenu(identity || {}, { x: e.clientX, y: e.clientY });
            e.preventDefault();
        };
        this.target.addEventListener("contextmenu", this.onContextMenu);

        // Click-to-filter (1180.2.2.3 Filter Out) — when a Category is bound,
        // clicking the card filters other visuals on the page by that category.
        // Without a category bound, click is a no-op (matches built-in card behaviour).
        this.onCardClick = (e: MouseEvent) => {
            if (this.currentSelectionId) {
                this.selectionManager.select(this.currentSelectionId, e.ctrlKey || e.metaKey)
                    .then(redrawSelection, () => undefined);
                e.stopPropagation();
            }
        };
        this.container.addEventListener("click", this.onCardClick);

        // Tooltip on card body
        this.onCardMouseMove = (e: MouseEvent) => {
            if (this.cardTooltipItems.length > 0) {
                this.tooltipService.show({
                    coordinates: [e.clientX, e.clientY],
                    isTouchEvent: false,
                    dataItems: this.cardTooltipItems,
                    identities: []
                });
            }
        };
        this.container.addEventListener("mousemove", this.onCardMouseMove);
        this.onCardMouseLeave = () => {
            this.tooltipService.hide({ isTouchEvent: false, immediately: false });
        };
        this.container.addEventListener("mouseleave", this.onCardMouseLeave);
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        this.lastUpdateOptions = options;

        try {
            if (this.licenseGate.blockedThisFrame()) {
                this.container.style.display = "none";
                this.events.renderingFinished(options);
                return;
            }
            this.container.style.display = "";

            const dataView: DataView = options.dataViews && options.dataViews[0];
            if (!dataView) {
                this.renderEmpty();
                this.events.renderingFinished(options);
                return;
            }

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel, dataView
            );

            const data = this.parseData(dataView);
            if (!data || data.value === null) {
                this.renderEmpty();
                this.events.renderingFinished(options);
                return;
            }

            // Capture selection ID for click-to-filter (1180.2.2.3)
            this.currentSelectionId = null;
            try {
                if (dataView.table && dataView.table.identity && dataView.table.identity.length > 0) {
                    this.currentSelectionId = this.host.createSelectionIdBuilder()
                        .withTable(dataView.table, 0)
                        .createSelectionId();
                }
            } catch {
                this.currentSelectionId = null;
            }
            this.container.style.cursor = this.currentSelectionId ? "pointer" : "default";

            const cardStyle = this.formattingSettings.cardStyle;
            const background = this.formattingSettings.background;
            const titleFmt = this.formattingSettings.titleSettings;
            const valFmt = this.formattingSettings.valueFormat;
            const changeFmt = this.formattingSettings.changeSettings;
            const labelFmt = this.formattingSettings.labelStyle;
            const subtitleFmt = this.formattingSettings.subtitleStyle;

            // ─── Conditional formatting (fx) wiring — Value Colour (TRANS-04) ──
            // Genuinely new work (Pitfall 5): a bare `instanceKind: ConstantOrRule`
            // declaration does NOT make the fx button functional. It also requires
            // a `selector` (dataViewWildcard, so the rule can match this measure's
            // instances/totals) and an `altConstantSelector` bound to a concrete
            // per-instance selectionId — Microsoft's documented getFormattingModel
            // conditional-formatting pattern, applied here via the
            // powerbi-visuals-utils-formattingmodel Slice's own selector/
            // altConstantSelector fields (which the service maps to the raw
            // FormattingModel API's `selector`/`altConstantValueSelector`).
            valFmt.valueColor.selector = dataViewWildcard.createDataViewWildcardSelector(
                dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals
            );
            valFmt.valueColor.altConstantSelector = undefined; // card-level constant persistence: swatch edits apply to ALL instances + round-trip into the pane (first-instance binding persisted a row-0-only override); fx rules stay per-instance via the wildcard selector;

            // Resolve the rule's per-instance colour (if a rule is set) via the
            // official ColorHelper.getColorForMeasure path: reads the resolved
            // fill from dataView.metadata.objects when a rule has been evaluated
            // by the host, falling back to the static format-pane value otherwise.
            const valueColorHelper = new ColorHelper(
                this.host.colorPalette,
                { objectName: "valueFormat", propertyName: "valueColor" },
                valFmt.valueColor.value.value
            );
            const resolvedValueColor = valueColorHelper.getColorForMeasure(dataView.metadata?.objects, "value");

            // ─── High contrast support (routed through the v3 shared rule) ──
            // Resolved BEFORE anything is painted: the card background is itself
            // a high-contrast surface, and the shared rule returns foreground and
            // background as a PAIR. Taking only the foreground later is what put
            // white text on the retained white card (NEXUS cycle-01 §2).
            const colorPalette = this.host.colorPalette as any;
            const isHighContrast = colorPalette && colorPalette.isHighContrast;
            const hc = applyHighContrast(colorPalette, { fallbackColor: cardStyle.accentColor.value.value });
            const hcColor = hc.active ? hc.color : null;

            // ─── Container styling ─────────────────────────
            // Dedicated background layer (D-05: never whole-root/target opacity —
            // this.container is an inner div, never this.target/options.element).
            // Reads the new shared Background card (colour + 0-100% transparency)
            // through the frozen toRgba() wrapper. `?? default` on both reads
            // means an OLD saved report (properties undefined) renders fully
            // opaque white — the pre-existing default — per D-06.
            // Migration: old reports set cardStyle.backgroundColor (pre-v2);
            // honour it while the shared Background card is untouched.
            const sharedBgHex = background.backgroundColor.value?.value ?? "#ffffff";
            const legacyBgHex = cardStyle.backgroundColor.value.value;
            const sharedBgUntouched = sharedBgHex.toLowerCase() === "#ffffff" && (background.transparency.value ?? 0) === 0;
            const bgHex = sharedBgUntouched && legacyBgHex.toLowerCase() !== "#ffffff" ? legacyBgHex : sharedBgHex;
            const bgTransparencyPct = background.transparency.value ?? 0;
            const bgColor = toRgba(bgHex, bgTransparencyPct);
            const accentColor = data.accentColour || cardStyle.accentColor.value.value;
            const accentPos = String(cardStyle.accentPosition.value?.value || "left");

            // The system background slot replaces the card fill under high
            // contrast — the user's saved colour is not a high-contrast surface.
            this.container.style.backgroundColor = hc.active ? hc.background : bgColor;
            // Border card first (sets/clears all four sides), then the
            // accent strip overrides its own edge below.
            applyBorder(this.container, this.formattingSettings.visualBorder, {
                hcActive: isHighContrast,
                hcColor: colorPalette?.foreground?.value,
                palette: this.host.colorPalette,
                metadataObjects: options.dataViews?.[0]?.metadata?.objects,
            });
            // The accent strip is painted LOWER DOWN, after the selection-ring
            // block — see the note there. Painting it here is what made
            // "Accent Position: Left", the shipped default, render nothing.

            // v3: theme pick, computed once and reused everywhere colour is
            // resolved below — from the surface a viewer actually SEES.
            // The old ladder read the stored hex whenever it differed from the
            // default white, so black at 95% transparency over a white page
            // still chose dark-surface ink and painted #e8e6ff on an almost
            // white card, and at 100% transparency the invisible black hex
            // still governed (NEXUS cycle-01 §3). An invisible fill is not
            // evidence of the backdrop: composite the fill over what is behind
            // it, then judge the result. Threshold/weights are the suite's own
            // (surfaceTone is Rec.601 at 0.55, identical to the themeFor() it
            // replaces), so nothing moves where the fill was already opaque.
            // LIMIT: colorPalette.background is the only backdrop the host
            // exposes. A page image, or a shape sitting under the visual, is
            // not readable from here — an explicit ink override remains the
            // answer for those reports.
            const behindHex = (colorPalette && colorPalette.background && colorPalette.background.value) || "#ffffff";
            const visibleSurfaceHex = hc.active
                ? hc.background
                : compositeOver(bgHex, bgTransparencyPct, behindHex);
            const theme: Theme = surfaceTone(visibleSurfaceHex);

            // ─── v3 band engine: ONE colour token for dot/pill/accent bar ──
            // See the top-of-file note: good/bad is derived from the EXISTING
            // changeDirection property (not a literal sign read) so saved
            // reports using "Down is Good" keep their meaning.
            let deltaBand: DeltaBand = null;
            // Fallback MUST match the declared default in settings.ts — a drift
            // between the two would colour the pill differently from what the
            // pane says is selected.
            const direction = String(changeFmt.changeDirection.value?.value || "upIsGood");
            if (data.changeValue !== null && direction !== "neutral") {
                const isPositive = data.changeValue >= 0;
                const isGood = direction === "upIsGood" ? isPositive : !isPositive;
                deltaBand = isGood ? "success" : "danger";
            }
            // Falls back to the user's own Accent Colour when there is no
            // band to show (no change value, or direction is "neutral") —
            // the existing property still visibly matters (D-16).
            const signalHex = deltaBand ? bandColor(deltaBand, theme) : accentColor;
            const cornerColor = hcColor || signalHex;
            const glowMix = hc.active ? 0 : (theme === "dark" ? 55 : 0);

            // Corner-bracket signature re-tint (created once in the constructor).
            applyCardSignature(this.cornerSignature, this.formattingSettings.cardSignature, {
                autoHex: signalHex,
                hcActive: hc.active,
                hcColor: hcColor,
                mirror: true,
                glowMix,
                muted: false,
            });

            // Status dot — gradient/beveled in normal themes, flat system-slot
            // colour with a 2px ring under high contrast (§8).
            if (hc.active) {
                this.dotEl.style.background = hc.color;
                this.dotEl.style.border = `${hc.borderWidth}px solid ${hc.color}`;
                this.dotEl.style.boxShadow = "none";
            } else {
                this.dotEl.style.border = "none";
                this.dotEl.style.background =
                    `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${cornerColor} 35%, white), ${cornerColor} 55%, color-mix(in srgb, ${cornerColor} 55%, black))`;
                this.dotEl.style.boxShadow = glowMix > 0
                    ? `0 0 8px color-mix(in srgb, ${cornerColor} ${glowMix}%, transparent)`
                    : "none";
            }

            // Selection ring — cyan hairline + glow, the suite's "blue ring" (§4).
            let isSelected = false;
            try {
                const selectionIds = (this.selectionManager.getSelectionIds() as ISelectionId[]) || [];
                isSelected = !!this.currentSelectionId
                    && selectionIds.some((id) => id.equals(this.currentSelectionId as ISelectionId));
            } catch {
                isSelected = false;
            }
            // Selection ring — when the user's Border card is ON, the ring
            // lives purely in box-shadow and never touches border props
            // (this block was stomping applyBorder's colour/width,
            // Neil 2026-07-12: "border not showing when set").
            const userBorderOn = this.formattingSettings.visualBorder.show.value;
            if (isSelected) {
                // Selection ring is a painted border under HC too (its glow is
                // already dropped below) — route it to the system slot.
                const ring = hcColor || accentToken(theme);
                if (!userBorderOn) this.container.style.borderColor = ring;
                this.container.style.boxShadow = hc.active
                    ? "none"
                    : `0 0 0 1px ${ring}, 0 0 18px color-mix(in srgb, ${ring} 30%, transparent)`;
            } else {
                if (!userBorderOn) this.container.style.borderColor = "";
                this.container.style.boxShadow = "none";
            }
            if (!userBorderOn) this.container.style.borderWidth = `${hc.active ? hc.borderWidth : 1}px`;

            // ─── Accent strip (painted AFTER the ring reset) ───────────────
            // The two lines above own all four edges whenever the user's
            // Border card is off: the unselected branch removes the inline
            // border-colour entirely and the width line pins every edge to the
            // ring width. The strip used to be painted further up, before
            // both, so the reset wiped it — the shipped default "Accent
            // Position: Left" computed to `1px solid rgba(0, 0, 0, 0)` on
            // every unselected card, in both palettes. The defect was the
            // ORDER, not the colour: paint the strip last and it survives.
            // Still only when the user's Border is OFF — a set border owns all
            // four edges (Neil 2026-07-12: left edge was turning into the
            // accent bar with Border on). "None" is a real dropdown value and
            // must keep painting nothing; the uniform reset above is exactly
            // what that leaves behind.
            if (!userBorderOn && accentPos !== "none") {
                // The strip is a painted edge, so it takes the system
                // foreground slot under high contrast like every other
                // surface. Its WIDTH follows the system border width there
                // too, so the high-contrast selection ring stays the uniform
                // hairline the palette asks for rather than growing a 4px
                // notch on one side.
                const stripColor = hcColor || accentColor;
                const stripWidth = hc.active ? hc.borderWidth : 4;
                if (accentPos === "left") {
                    this.container.style.borderLeftWidth = `${stripWidth}px`;
                    this.container.style.borderLeftColor = stripColor;
                } else if (accentPos === "top") {
                    this.container.style.borderTopWidth = `${stripWidth}px`;
                    this.container.style.borderTopColor = stripColor;
                }
            }

            // ─── Title (iframe-internal, Policy 1180.2.5) ──
            if (titleFmt.showTitle.value && titleFmt.titleText.value) {
                this.titleEl.textContent = String(titleFmt.titleText.value);
                // The title was the one ink on the card that never adapted: on
                // an opaque #07071a card the value went pale while the title
                // stayed #1a1a2e, dark-on-dark (NEXUS cycle-01 §4, still open
                // at pass two). Adapt only the UNTOUCHED swatch — a title
                // colour the user actually set, or an fx rule, is a deliberate
                // choice and is handed through unchanged. The surface judged is
                // the COMPOSITED one computed above, not the stored fill, for
                // the same reason §3 needed it: a translucent fill is not
                // evidence of what the viewer sees. High contrast still wins
                // over both.
                const titleSwatch = String(titleFmt.titleColor.value.value);
                const adaptiveTitle = titleSwatch.toLowerCase() === TITLE_DEFAULT_INK
                    ? automaticInk(visibleSurfaceHex, TITLE_DEFAULT_INK)
                    : titleSwatch;
                this.titleEl.style.color = hcColor || adaptiveTitle;
                applyFont(this.titleEl, {
                    fontFamily: titleFmt.titleFontFamily,
                    fontSize: titleFmt.titleFontSize,
                    bold: titleFmt.titleBold,
                    italic: titleFmt.titleItalic,
                    underline: titleFmt.titleUnderline,
                });
                const titleAlignVal = String((titleFmt as any).titleAlign?.value || "left");
                this.titleEl.style.alignSelf = alignSelfFor(titleAlignVal);
                this.titleEl.style.textAlign = textAlignFor(titleAlignVal);
                this.titleEl.style.display = "";
            } else {
                this.titleEl.style.display = "none";
            }

            // ─── Header row: eyebrow label + status dot ────
            const labelAlignVal = String((labelFmt as any).labelAlign?.value || "left");
            if (data.label) {
                this.labelEl.textContent = String(data.label);
                const adaptiveLabel = labelFmt.labelColor.value.value.toLowerCase() === "#5e5d5a"
                    ? automaticInk(visibleSurfaceHex, "#5e5d5a", mix(surfaceTokens("dark").text, "#8f8ab8", 0.35))
                    : labelFmt.labelColor.value.value;
                this.labelEl.style.color = hcColor || adaptiveLabel;
                applyFont(this.labelEl, labelFmt as unknown as FontFmt);
                // Row-flex child: alignSelf is vertical here — horizontal
                // position comes from auto margins (left keeps the dot
                // pushed right; center floats between edge and dot).
                this.headerRow.style.justifyContent = "flex-start";
                this.labelEl.style.marginLeft = labelAlignVal === "left" ? "0" : "auto";
                this.labelEl.style.marginRight = labelAlignVal === "right" ? "0" : "auto";
                this.labelEl.style.textAlign = textAlignFor(labelAlignVal);
                this.labelEl.style.display = "";
            } else {
                this.labelEl.style.display = "none";
            }
            this.headerRow.style.display = "";

            // ─── Value ─────────────────────────────────────
            const fmtType = String(valFmt.valueFormatType.value?.value || "number");
            const decimals = valFmt.decimalPlaces.value;
            const currency = valFmt.currencySymbol.value || "$";
            const fontSize = valFmt.fontSize.value;

            const valueAlignVal = String((valFmt as any).valueAlign?.value || "left");
            const displayValue = this.formatDisplayValue(data.value, fmtType, decimals, currency);
            this.valueEl.textContent = displayValue;
            this.valueEl.style.fontFeatureSettings = TABULAR_NUMS;
            const adaptiveValue = resolvedValueColor.toLowerCase() === "#130064"
                ? automaticInk(visibleSurfaceHex, "#130064") : resolvedValueColor;
            this.valueEl.style.color = hcColor || (data.textColour || adaptiveValue);
            applyFont(this.valueEl, valFmt as unknown as FontFmt);
            this.valueEl.style.alignSelf = alignSelfFor(valueAlignVal);
            this.valueEl.style.textAlign = textAlignFor(valueAlignVal);

            // Responsive font scaling — only kick in when viewport is too narrow
            // for the user-set font size; otherwise honour the format pane value.
            const vw = options.viewport.width;
            if (vw < 120) {
                this.valueEl.style.fontSize = `${Math.max(19, fontSize * 0.5)}px`;
            } else if (vw < 200) {
                this.valueEl.style.fontSize = `${Math.max(21, fontSize * 0.7)}px`;
            }

            // v3 motion: settle the value once when its displayed text changes
            // (skipped entirely under prefers-reduced-motion — see motion.ts).
            if (displayValue !== this.lastDisplayValue) {
                settle(this.valueEl, [
                    { opacity: 0.35, transform: "translateY(3px)" },
                    { opacity: 1, transform: "translateY(0)" },
                ], { duration: 220 });
                this.lastDisplayValue = displayValue;
            }

            // ─── Subtitle ──────────────────────────────────
            const subtitleAlignVal = String((subtitleFmt as any).subtitleAlign?.value || "left");
            if (data.subtitle) {
                this.subtitleEl.textContent = String(data.subtitle);
                const adaptiveSubtitle = subtitleFmt.subtitleColor.value.value.toLowerCase() === "#767676"
                    ? automaticInk(visibleSurfaceHex, "#767676", mix(surfaceTokens("dark").text, "#8f8ab8", 0.35))
                    : subtitleFmt.subtitleColor.value.value;
                this.subtitleEl.style.color = hcColor || adaptiveSubtitle;
                applyFont(this.subtitleEl, subtitleFmt as unknown as FontFmt);
                this.subtitleEl.style.marginLeft = subtitleAlignVal === "left" ? "0" : "auto";
                this.subtitleEl.style.marginRight = subtitleAlignVal === "center" ? "auto" : "0";
                this.subtitleEl.style.textAlign = textAlignFor(subtitleAlignVal);
                this.subtitleEl.style.display = "";
            } else {
                this.subtitleEl.style.display = "none";
            }

            // ─── Change Pill ───────────────────────────────
            const showChange = changeFmt.showChange.value;
            if (showChange && data.changeValue !== null) {
                const cv = data.changeValue;
                const isPositive = cv >= 0;
                const arrow = isPositive ? "▲" : "▼"; // ▲ or ▼

                let pillBg: string;
                let pillColor: string;

                if (direction === "neutral") {
                    pillBg = CODEX_TOKENS.neutralBg;
                    pillColor = CODEX_TOKENS.neutral;
                } else {
                    pillBg = `color-mix(in srgb, ${signalHex} 15%, transparent)`;
                    pillColor = signalHex;
                }

                if (hc.active) {
                    pillBg = "transparent";
                    pillColor = hc.color;
                } else {
                    const pillSurface = direction === "neutral"
                        ? CODEX_TOKENS.neutralBg
                        : compositeOver(signalHex, 85, visibleSurfaceHex);
                    pillColor = signalInk(pillSurface, pillColor);
                }

                const pillTextStr = data.changeLabel
                    ? String(data.changeLabel)
                    : this.autoFormatChange(cv, fmtType, data.changeFormat);

                const changeAlignVal = String((changeFmt as any).changeAlign?.value || "left");
                const glyph = hc.active && deltaBand ? statusGlyph(deltaBand) : "";
                this.pillArrow.textContent = glyph ? `${glyph} ${arrow}` : arrow;
                this.pillText.textContent = " " + pillTextStr;
                this.pillEl.style.fontFeatureSettings = TABULAR_NUMS;
                this.pillEl.style.backgroundColor = pillBg;
                this.pillEl.style.color = pillColor;
                applyFont(this.pillEl, changeFmt as unknown as FontFmt);
                this.pillEl.style.marginLeft = changeAlignVal === "left" ? "0" : "auto";
                this.pillEl.style.marginRight = changeAlignVal === "center" ? "auto" : "0";
                this.pillEl.style.display = "";
            } else {
                this.pillEl.style.display = "none";
            }
            this.footerRow.style.display = "";

            // ─── Quantised target strip (LED rhythm, §5) ───
            // No genuine target measure is bound on this visual (see the
            // top-of-file note), so the lit-segment count treats
            // changeValue as an implied ratio-to-baseline (1 + delta) —
            // a positive change lights more of the strip, a negative one
            // lights less, clamped to the 10-segment run. A KPI with no
            // change value bound reads as fully lit (matches band()'s own
            // "no target -> success" convention).
            const track = surfaceTokens(theme).track;
            const litCount = data.changeValue !== null
                ? Math.max(0, Math.min(STRIP_SEGMENTS, Math.round(STRIP_SEGMENTS * (1 + data.changeValue))))
                : STRIP_SEGMENTS;
            this.stripSegments.forEach((seg, i) => {
                const on = i < litCount;
                seg.style.background = hc.active
                    ? (on ? hc.color : "transparent")
                    : (on ? cornerColor : track);
                seg.style.boxShadow = (on && !hc.active && glowMix > 0)
                    ? `0 0 5px color-mix(in srgb, ${cornerColor} ${glowMix}%, transparent)`
                    : "none";
                seg.style.border = hc.active ? `1px solid ${hc.color}` : "none";
            });
            this.stripEl.style.display = "";
            this.fitContent();

            // Build tooltip data
            this.cardTooltipItems = [];
            if (data.label) {
                this.cardTooltipItems.push({ displayName: "Label", value: String(data.label) });
            }
            if (data.value !== null) {
                this.cardTooltipItems.push({
                    displayName: "Value",
                    value: this.formatDisplayValue(data.value, fmtType, decimals, currency)
                });
            }
            if (data.subtitle) {
                this.cardTooltipItems.push({ displayName: "Subtitle", value: String(data.subtitle) });
            }
            if (data.changeValue !== null) {
                const pillTextStr = data.changeLabel
                    ? String(data.changeLabel)
                    : this.autoFormatChange(data.changeValue, fmtType, data.changeFormat);
                this.cardTooltipItems.push({ displayName: "Change", value: pillTextStr });
            }

            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
        }
    }

    public destroy(): void {
        // Drop the in-flight licence check FIRST: its redraw callback replays
        // update() against a torn-down target otherwise (NEXUS lifecycle finding).
        this.licenseGate.dispose();
        this.selectionRefresh.run = null;

        // Unregister every listener this visual registered. Cancelling the
        // licence callback stopped the late REDRAW, but the card itself was
        // still live: a destroyed instance answered a context-menu click on
        // the root and pushed a tooltip on hover (NEXUS pass-two adjacent
        // coverage 2, receipt `destroy-listeners.final.actions`). Each removal
        // is guarded because destroy() must not throw whatever state the host
        // is in.
        try {
            this.target?.removeEventListener("contextmenu", this.onContextMenu);
            this.container?.removeEventListener("click", this.onCardClick);
            this.container?.removeEventListener("mousemove", this.onCardMouseMove);
            this.container?.removeEventListener("mouseleave", this.onCardMouseLeave);
        } catch { /* nothing left to unregister */ }

        // Drop the caches those listeners read, so anything still holding a
        // reference cannot replay a tooltip or a stale selection, and retract
        // any tooltip that is open at the moment of teardown.
        this.cardTooltipItems = [];
        this.currentSelectionId = null;
        this.lastUpdateOptions = null;
        this.lastDisplayValue = null;
        try {
            this.tooltipService?.hide({ isTouchEvent: false, immediately: true });
        } catch { /* host service already gone */ }

        // Release the DOM this visual owns. options.element belongs to the
        // HOST and is never removed — only the card built on top of it.
        this.cornerSignature?.destroy();
        this.cornerSignature = null;
        this.container?.remove();
        this.container = null;
        this.titleEl = null;
        this.headerRow = null;
        this.labelEl = null;
        this.dotEl = null;
        this.valueEl = null;
        this.footerRow = null;
        this.subtitleEl = null;
        this.pillEl = null;
        this.pillArrow = null;
        this.pillText = null;
        this.stripEl = null;
        this.stripSegments = [];
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private fitContent(): void {
        const { width, height } = this.lastUpdateOptions.viewport;
        this.container.classList.toggle("os-kpi-compact", width < 200 || height < 160);
        this.container.classList.toggle("os-kpi-tight", width < 100 || height < 80);
        this.container.classList.remove("os-kpi-too-small");
        this.valueEl.style.display = "";
        this.valueEl.style.marginBottom = "";
        this.container.setAttribute("aria-label", this.valueEl.textContent);
        for (const el of [this.titleEl, this.labelEl, this.subtitleEl, this.valueEl, this.pillEl]) {
            el.title = el.textContent;
        }

        const style = getComputedStyle(this.container);
        const availableWidth = Math.max(0, width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
            - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth));
        const availableHeight = Math.max(0, height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
            - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth));
        const textWidth = () => {
            const range = document.createRange();
            range.selectNodeContents(this.valueEl);
            return range.getBoundingClientRect().width;
        };
        const fontSize = parseFloat(getComputedStyle(this.valueEl).fontSize);
        if (textWidth() > availableWidth) {
            const fitted = fontSize * Math.max(0, availableWidth - 1) / textWidth();
            this.valueEl.style.fontSize = `${Math.min(fontSize, Math.max(12, fitted))}px`;
        }
        if (this.pillEl.scrollWidth > availableWidth) this.pillEl.style.display = "none";

        const rows = [this.titleEl, this.headerRow, this.valueEl, this.footerRow, this.stripEl];
        const occupiedHeight = () => rows.reduce((total, el) => {
            const css = getComputedStyle(el);
            return css.display === "none" ? total : total + el.getBoundingClientRect().height
                + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
        }, 0);
        // Preserve the metric first; secondary content remains available in the tooltip.
        for (const el of [this.stripEl, this.subtitleEl, this.titleEl, this.headerRow, this.pillEl]) {
            if (occupiedHeight() <= availableHeight) break;
            el.style.display = "none";
        }
        if (occupiedHeight() > availableHeight) {
            this.valueEl.style.marginBottom = "0";
            const current = parseFloat(getComputedStyle(this.valueEl).fontSize);
            this.valueEl.style.fontSize = `${Math.min(current, Math.max(12, availableHeight / 1.15))}px`;
        }
        if (textWidth() > availableWidth || occupiedHeight() > availableHeight) {
            for (const el of rows) el.style.display = "none";
            this.container.classList.add("os-kpi-too-small");
            this.valueEl.textContent = "...";
            this.valueEl.style.display = "block";
            this.valueEl.style.fontSize = "12px";
            this.valueEl.style.marginBottom = "0";
            if (textWidth() > width || this.valueEl.getBoundingClientRect().height > height) {
                this.valueEl.style.display = "none";
            }
        }
    }

    // ─── Data Parsing ───────────────────────────────────────
    private parseData(dataView: DataView): ParsedCard | null {
        const table = dataView?.table;
        if (!table || !table.columns || !table.rows || table.rows.length === 0) {
            return null;
        }

        const result: ParsedCard = {
            value: null,
            label: null,
            subtitle: null,
            changeValue: null,
            changeLabel: null,
            changeFormat: null,
            accentColour: null,
            textColour: null
        };

        const row = table.rows[0];

        for (let i = 0; i < table.columns.length; i++) {
            const roles = table.columns[i].roles;
            const raw = row[i];

            if (roles["value"]) {
                result.value = (raw !== null && raw !== undefined && raw !== "") ? raw as number | string : null;
            }
            if (roles["label"]) {
                result.label = raw !== null && raw !== undefined ? String(raw) : null;
            }
            if (roles["subtitle"]) {
                result.subtitle = raw !== null && raw !== undefined ? String(raw) : null;
            }
            if (roles["changeValue"]) {
                const missing = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
                const change = missing ? NaN : Number(raw);
                result.changeValue = Number.isFinite(change) ? change : null;
                result.changeFormat = table.columns[i].format || null;
            }
            if (roles["changeLabel"]) {
                result.changeLabel = raw !== null && raw !== undefined ? String(raw) : null;
            }
            if (roles["accentColour"]) {
                result.accentColour = this.parseHexColour(raw);
            }
            if (roles["textColour"]) {
                result.textColour = this.parseHexColour(raw);
            }
        }

        return result;
    }

    // ─── Formatting Helpers ─────────────────────────────────
    private formatDisplayValue(value: number | string, format: string, decimals: number, currency: string): string {
        if (value === null || value === undefined) return "—";

        if (format === "text" || typeof value === "string") {
            return String(value);
        }

        const num = Number(value);
        if (isNaN(num)) return String(value);

        switch (format) {
            case "percent":
                // Fractional input, always — the Power BI convention (a percent
                // measure is stored as 0.5 for 50%, as shared/numberFormat.ts
                // documents for the model-format path). Scaling by 100 only
                // while |num| <= 1 made ONE measure change units as it crossed
                // 1: 1.00 read "100.00%" and 1.01 read "1.01%" (NEXUS cycle-01
                // §1). Values at or below 1 — what a percent measure holds in
                // practically every saved report — render exactly as before.
                return (num * 100).toFixed(decimals) + "%";
            default: {
                const magnitude = Math.abs(num).toLocaleString(this.host.locale, {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                });
                return (num < 0 ? "-" : "") + (format === "currency" ? currency : "") + magnitude;
            }
        }
    }

    // The pill's number, when no Change Label field is bound. The arrow glyph
    // carries the sign, so the magnitude is printed unsigned — unchanged.
    //
    // What changed: the unit used to be chosen by MAGNITUDE. |cv| < 1 printed
    // "<n>% vs prior" and |cv| >= 1 printed "<n> vs prior", so ONE measure
    // swapped units as it crossed 1 — measured on the pre-fix bundle, 0.999
    // rendered "100% vs prior" and 1.0 rendered "1.0 vs prior". That is the
    // same defect class as NEXUS cycle-01 §1 on the value itself, one layer
    // down. The unit now follows the report's own declarations, which do not
    // move with the data:
    //
    //   1. the Change Value measure's model format string, when it has one —
    //      that is the author saying what the number means, and it is what
    //      Power BI itself would render;
    //   2. otherwise the Value card's format type: a percent KPI gets a
    //      percent pill, everything else gets a number pill.
    //
    // The no-model-format fallbacks are deliberately today's digit rules, so a
    // percent report's "12% vs prior" and a number report's "125.0 vs prior"
    // are byte-identical to what they render now.
    private autoFormatChange(cv: number, fmtType: string, modelFormat: string | null): string {
        const abs = Math.abs(cv);
        if (modelFormat) {
            return formatModelNumber(abs, modelFormat, this.host.locale) + " vs prior";
        }
        if (fmtType === "percent") {
            return (abs * 100).toFixed(0) + "% vs prior";
        }
        return abs.toFixed(1) + " vs prior";
    }

    private parseHexColour(raw: unknown): string | null {
        if (raw === null || raw === undefined) return null;
        const s = String(raw).trim();
        return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : null;
    }

    private renderEmpty(): void {
        // The landing prompt is a painted surface as much as the card is: under
        // high contrast it was #999 on a hard-coded white panel, inside a black
        // system canvas (NEXUS cycle-01 §2, same pairing defect as the card).
        const hc = applyHighContrast(this.host.colorPalette as any, {});
        this.cardTooltipItems = [];
        // The landing prompt is not a data point. The prompt and the tooltips
        // reset here already, but the selection identity built from the LAST
        // populated update survived, so clicking the empty card still sent the
        // old category to the selection manager and the card still advertised
        // itself as clickable (NEXUS pass-two adjacent coverage 1, receipt
        // `data-removal-restoration.empty.actions.select`). An identity is only
        // valid for the row it was built from — drop it with the row, and drop
        // the pointer affordance that promises it.
        this.currentSelectionId = null;
        this.container.style.cursor = "default";
        this.titleEl.style.display = "none";
        this.headerRow.style.display = "none";
        this.footerRow.style.display = "none";
        this.stripEl.style.display = "none";
        this.valueEl.textContent = "Drop a measure into Value";
        this.valueEl.style.fontSize = "13px";
        this.valueEl.style.color = hc.active ? hc.color : "#767676";
        this.container.style.borderLeft = "";
        this.container.style.borderTop = "";
        this.container.style.borderColor = "";
        this.container.style.boxShadow = "none";
        this.container.style.backgroundColor = hc.active ? hc.background : "#ffffff";
        applyCardSignature(this.cornerSignature, this.formattingSettings?.cardSignature, {
            autoHex: "#8f8ab8", hcActive: hc.active, hcColor: hc.active ? hc.color : undefined, mirror: true, muted: true,
        });
        this.fitContent();
    }
}
