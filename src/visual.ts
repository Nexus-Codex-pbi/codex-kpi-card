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
import { toRgba } from "./shared/colorHelpers";
import { Band, Theme, accentToken, bandColor } from "./shared/bandEngine";
import { surfaceTokens, TABULAR_NUMS, mix } from "./shared/designTokens";
import { applyBorder } from "./shared/borderSettings";
import { makeCornerBrackets, CardSignatureHandle } from "./shared/cardSignature";
import { applyCardSignature } from "./shared/cardSignatureSettings";
import { settle } from "./shared/motion";
import { applyHighContrast, statusGlyph } from "./shared/highContrast";

interface FontFmt { fontFamily?: { value?: string }; fontSize?: { value?: number }; bold?: { value?: boolean }; italic?: { value?: boolean }; underline?: { value?: boolean }; }

function applyFont(el: HTMLElement, f: FontFmt): void {
    if (f.fontFamily?.value) el.style.fontFamily = f.fontFamily.value;
    if (typeof f.fontSize?.value === "number") el.style.fontSize = `${f.fontSize.value}pt`;
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
    accentColour: string | null;
    textColour: string | null;
}

// v2 board look (v3 appearance engine pilot, Plan 15): KPI Card exposes no
// target/goal measure, so the ONE band-engine colour token is derived from
// the EXISTING changeDirection (upIsGood/downIsGood/neutral) semantics
// rather than a literal directionColor(changeValue) sign read — a report
// saved with the default "Down is Good" setting must keep reading a
// decrease as success, so the pre-existing good/bad logic stays the
// source of truth for which band applies (D-16: saved settings still
// resolve). directionColor() itself remains available in bandEngine.ts
// for the batch visuals whose delta is a literal direction, not a
// configurable good/bad flag.
type DeltaBand = Band | null;

/** Luminance-based theme pick (same 0.55 threshold convention as utils.ts
 * contrastText): decides whether the resolved card background reads as a
 * "dark" or "light" surface, so the v3 token set stays legible. */
function themeFor(hex: string): Theme {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex || "");
    if (!m) return "dark";
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "light" : "dark";
}

const STRIP_SEGMENTS = 10;

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private tooltipService: ITooltipService;
    private localizationManager: ILocalizationManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    // State for tooltips
    private cardTooltipItems: VisualTooltipDataItem[] = [];

    // Selection ID for click-to-filter (1180.2.2.3)
    private currentSelectionId: ISelectionId | null = null;

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

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.localizationManager = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

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
        this.target.addEventListener("contextmenu", (e: MouseEvent) => {
            this.selectionManager.showContextMenu({}, { x: e.clientX, y: e.clientY });
            e.preventDefault();
        });

        // Click-to-filter (1180.2.2.3 Filter Out) — when a Category is bound,
        // clicking the card filters other visuals on the page by that category.
        // Without a category bound, click is a no-op (matches built-in card behaviour).
        this.container.addEventListener("click", (e: MouseEvent) => {
            if (this.currentSelectionId) {
                this.selectionManager.select(this.currentSelectionId, e.ctrlKey || e.metaKey);
                e.stopPropagation();
            }
        });

        // Tooltip on card body
        this.container.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.cardTooltipItems.length > 0) {
                this.tooltipService.show({
                    coordinates: [e.clientX, e.clientY],
                    isTouchEvent: false,
                    dataItems: this.cardTooltipItems,
                    identities: []
                });
            }
        });
        this.container.addEventListener("mouseleave", () => {
            this.tooltipService.hide({ isTouchEvent: false, immediately: false });
        });
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        try {
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
            const colorPalette = this.host.colorPalette as any;
            const isHighContrast = colorPalette && colorPalette.isHighContrast;

            // ─── Container styling ─────────────────────────
            // Dedicated background layer (D-05: never whole-root/target opacity —
            // this.container is an inner div, never this.target/options.element).
            // Reads the new shared Background card (colour + 0-100% transparency)
            // through the frozen toRgba() wrapper. `?? default` on both reads
            // means an OLD saved report (properties undefined) renders fully
            // opaque white — the pre-existing default — per D-06.
            const bgHex = background.backgroundColor.value?.value ?? "#ffffff";
            const bgTransparencyPct = background.transparency.value ?? 0;
            const bgColor = toRgba(bgHex, bgTransparencyPct);
            const accentColor = data.accentColour || cardStyle.accentColor.value.value;
            const accentPos = String(cardStyle.accentPosition.value?.value || "left");

            this.container.style.backgroundColor = bgColor;
            // Border card first (sets/clears all four sides), then the
            // accent strip overrides its own edge below.
            applyBorder(this.container, this.formattingSettings.visualBorder, {
                hcActive: isHighContrast,
                hcColor: colorPalette?.foreground?.value,
            });
            if (!this.formattingSettings.visualBorder.show.value) {
                this.container.style.borderLeft = "";
                this.container.style.borderTop = "";
            }

            if (accentPos === "left") {
                this.container.style.borderLeft = `4px solid ${accentColor}`;
            } else if (accentPos === "top") {
                this.container.style.borderTop = `4px solid ${accentColor}`;
            }

            // v3: theme pick + the single HC fallback rule, computed once and
            // reused everywhere colour is resolved below.
            // Theme-source ladder (suite standard, bullet chart v1.0.0.9):
            // visible own background governs; a USER-SET hex governs even at
            // full transparency; only the untouched default falls through to
            // the report theme's palette background.
            const bgHexIsUserSet = bgHex.toLowerCase() !== "#ffffff";
            const themeSourceHex = (bgTransparencyPct < 100 || bgHexIsUserSet)
                ? bgHex
                : ((colorPalette && colorPalette.background && colorPalette.background.value) || bgHex);
            const theme: Theme = themeFor(themeSourceHex);
            const hc = applyHighContrast(colorPalette, { fallbackColor: cardStyle.accentColor.value.value });
            const hcColor = hc.active ? hc.color : null;

            // ─── v3 band engine: ONE colour token for dot/pill/accent bar ──
            // See the top-of-file note: good/bad is derived from the EXISTING
            // changeDirection property (not a literal sign read) so saved
            // reports using "Down is Good" keep their meaning.
            let deltaBand: DeltaBand = null;
            const direction = String(changeFmt.changeDirection.value?.value || "downIsGood");
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
            if (isSelected) {
                const ring = accentToken(theme);
                this.container.style.borderColor = ring;
                this.container.style.boxShadow = hc.active
                    ? "none"
                    : `0 0 0 1px ${ring}, 0 0 18px color-mix(in srgb, ${ring} 30%, transparent)`;
            } else {
                this.container.style.borderColor = "";
                this.container.style.boxShadow = "none";
            }
            this.container.style.borderWidth = `${hc.active ? hc.borderWidth : 1}px`;

            // ─── Title (iframe-internal, Policy 1180.2.5) ──
            if (titleFmt.showTitle.value && titleFmt.titleText.value) {
                this.titleEl.textContent = String(titleFmt.titleText.value);
                this.titleEl.style.color = hcColor || titleFmt.titleColor.value.value;
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
                const adaptiveLabel = labelFmt.labelColor.value.value === "#5e5d5a" && theme === "dark"
                    ? mix(surfaceTokens("dark").text, "#8f8ab8", 0.35) : labelFmt.labelColor.value.value;
                this.labelEl.style.color = hcColor || adaptiveLabel;
                applyFont(this.labelEl, labelFmt as unknown as FontFmt);
                this.labelEl.style.alignSelf = alignSelfFor(labelAlignVal);
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
            const adaptiveValue = resolvedValueColor === "#130064" && theme === "dark"
                ? surfaceTokens("dark").text : resolvedValueColor;
            this.valueEl.style.color = hcColor || (data.textColour || adaptiveValue);
            applyFont(this.valueEl, valFmt as unknown as FontFmt);
            this.valueEl.style.alignSelf = alignSelfFor(valueAlignVal);
            this.valueEl.style.textAlign = textAlignFor(valueAlignVal);

            // Responsive font scaling — only kick in when viewport is too narrow
            // for the user-set font size; otherwise honour the format pane value.
            const vw = options.viewport.width;
            if (vw < 120) {
                this.valueEl.style.fontSize = `${Math.max(14, fontSize * 0.5)}pt`;
            } else if (vw < 200) {
                this.valueEl.style.fontSize = `${Math.max(16, fontSize * 0.7)}pt`;
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
                const adaptiveSubtitle = subtitleFmt.subtitleColor.value.value === "#767676" && theme === "dark"
                    ? mix(surfaceTokens("dark").text, "#8f8ab8", 0.35) : subtitleFmt.subtitleColor.value.value;
                this.subtitleEl.style.color = hcColor || adaptiveSubtitle;
                applyFont(this.subtitleEl, subtitleFmt as unknown as FontFmt);
                this.subtitleEl.style.alignSelf = alignSelfFor(subtitleAlignVal);
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
                }

                const pillTextStr = data.changeLabel
                    ? String(data.changeLabel)
                    : this.autoFormatChange(cv);

                const changeAlignVal = String((changeFmt as any).changeAlign?.value || "left");
                const glyph = hc.active && deltaBand ? statusGlyph(deltaBand) : "";
                this.pillArrow.textContent = glyph ? `${glyph} ${arrow}` : arrow;
                this.pillText.textContent = " " + pillTextStr;
                this.pillEl.style.fontFeatureSettings = TABULAR_NUMS;
                this.pillEl.style.backgroundColor = pillBg;
                this.pillEl.style.color = pillColor;
                applyFont(this.pillEl, changeFmt as unknown as FontFmt);
                this.pillEl.style.alignSelf = alignSelfFor(changeAlignVal);
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
                    : this.autoFormatChange(data.changeValue);
                this.cardTooltipItems.push({ displayName: "Change", value: pillTextStr });
            }

            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
        }
    }

    public destroy(): void {
        // Clean up DOM references
        this.cornerSignature?.destroy();
        this.cornerSignature = null;
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
                result.changeValue = raw !== null && raw !== undefined ? Number(raw) : null;
                if (isNaN(result.changeValue)) result.changeValue = null;
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
                return (num * (Math.abs(num) <= 1 ? 100 : 1)).toFixed(decimals) + "%";
            case "currency":
                return currency + num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            default: // number
                return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    private autoFormatChange(cv: number): string {
        const abs = Math.abs(cv);
        if (abs < 1) {
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
        this.cardTooltipItems = [];
        this.titleEl.style.display = "none";
        this.headerRow.style.display = "none";
        this.footerRow.style.display = "none";
        this.stripEl.style.display = "none";
        this.valueEl.textContent = "Drop a measure into Value";
        this.valueEl.style.fontSize = "13px";
        this.valueEl.style.color = "#999";
        this.container.style.borderLeft = "";
        this.container.style.borderTop = "";
        this.container.style.borderColor = "";
        this.container.style.boxShadow = "none";
        this.container.style.backgroundColor = "#ffffff";
        applyCardSignature(this.cornerSignature, this.formattingSettings?.cardSignature, { autoHex: "#8f8ab8", mirror: true, muted: true });
    }
}
