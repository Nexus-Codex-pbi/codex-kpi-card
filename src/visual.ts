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
import { toRgba } from "../../_shared/formatting/colorHelpers";

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

    // DOM elements
    private container: HTMLElement;
    private titleEl: HTMLElement;
    private labelEl: HTMLElement;
    private valueEl: HTMLElement;
    private subtitleEl: HTMLElement;
    private pillEl: HTMLElement;
    private pillArrow: HTMLElement;
    private pillText: Text;

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

        this.titleEl = document.createElement("div");
        this.titleEl.className = "os-kpi-title";
        this.titleEl.style.display = "none";

        this.labelEl = document.createElement("div");
        this.labelEl.className = "os-kpi-label";

        this.valueEl = document.createElement("div");
        this.valueEl.className = "os-kpi-value";

        this.subtitleEl = document.createElement("div");
        this.subtitleEl.className = "os-kpi-subtitle";

        this.pillEl = document.createElement("div");
        this.pillEl.className = "os-kpi-pill";

        // Build pill children via DOM API (no innerHTML)
        this.pillArrow = document.createElement("span");
        this.pillArrow.className = "os-pill-arrow";
        this.pillText = document.createTextNode("");
        this.pillEl.appendChild(this.pillArrow);
        this.pillEl.appendChild(this.pillText);

        this.container.appendChild(this.titleEl);
        this.container.appendChild(this.labelEl);
        this.container.appendChild(this.valueEl);
        this.container.appendChild(this.subtitleEl);
        this.container.appendChild(this.pillEl);
        this.target.appendChild(this.container);

        // Context menu support
        this.container.addEventListener("contextmenu", (e: MouseEvent) => {
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
            valFmt.valueColor.altConstantSelector = this.currentSelectionId
                ? this.currentSelectionId.getSelector()
                : undefined;

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

            // ─── High contrast support ─────────────────────
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
            this.container.style.borderLeft = "";
            this.container.style.borderTop = "";

            if (accentPos === "left") {
                this.container.style.borderLeft = `4px solid ${accentColor}`;
            } else if (accentPos === "top") {
                this.container.style.borderTop = `4px solid ${accentColor}`;
            }

            // ─── Title (iframe-internal, Policy 1180.2.5) ──
            if (titleFmt.showTitle.value && titleFmt.titleText.value) {
                this.titleEl.textContent = String(titleFmt.titleText.value);
                this.titleEl.style.color = isHighContrast
                    ? (colorPalette.foreground?.value || titleFmt.titleColor.value.value)
                    : titleFmt.titleColor.value.value;
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

            // ─── Label ──────────────────────────────────────
            const labelAlignVal = String((labelFmt as any).labelAlign?.value || "left");
            if (data.label) {
                this.labelEl.textContent = String(data.label);
                this.labelEl.style.color = isHighContrast
                    ? (colorPalette.foreground?.value || labelFmt.labelColor.value.value)
                    : labelFmt.labelColor.value.value;
                applyFont(this.labelEl, labelFmt as unknown as FontFmt);
                this.labelEl.style.alignSelf = alignSelfFor(labelAlignVal);
                this.labelEl.style.textAlign = textAlignFor(labelAlignVal);
                this.labelEl.style.display = "";
            } else {
                this.labelEl.style.display = "none";
            }

            // ─── Value ─────────────────────────────────────
            const fmtType = String(valFmt.valueFormatType.value?.value || "number");
            const decimals = valFmt.decimalPlaces.value;
            const currency = valFmt.currencySymbol.value || "$";
            const fontSize = valFmt.fontSize.value;

            const valueAlignVal = String((valFmt as any).valueAlign?.value || "left");
            this.valueEl.textContent = this.formatDisplayValue(data.value, fmtType, decimals, currency);
            this.valueEl.style.color = isHighContrast
                ? (colorPalette.foreground?.value || data.textColour || resolvedValueColor)
                : (data.textColour || resolvedValueColor);
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

            // ─── Subtitle ──────────────────────────────────
            const subtitleAlignVal = String((subtitleFmt as any).subtitleAlign?.value || "left");
            if (data.subtitle) {
                this.subtitleEl.textContent = String(data.subtitle);
                this.subtitleEl.style.color = isHighContrast
                    ? (colorPalette.foreground?.value || subtitleFmt.subtitleColor.value.value)
                    : subtitleFmt.subtitleColor.value.value;
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
                const direction = String(changeFmt.changeDirection.value?.value || "downIsGood");
                const cv = data.changeValue;
                const isPositive = cv >= 0;

                let pillBg: string;
                let pillColor: string;
                let arrow: string;

                if (direction === "neutral") {
                    pillBg = CODEX_TOKENS.neutralBg;
                    pillColor = CODEX_TOKENS.neutral;
                    arrow = "\u2192"; // →
                } else {
                    const isGood = direction === "upIsGood" ? isPositive : !isPositive;
                    pillBg = isGood ? CODEX_TOKENS.successBg : CODEX_TOKENS.dangerBg;
                    pillColor = isGood ? CODEX_TOKENS.success : CODEX_TOKENS.danger;
                    arrow = isPositive ? "\u25B2" : "\u25BC"; // ▲ or ▼
                }

                if (isHighContrast) {
                    pillBg = "transparent";
                    pillColor = colorPalette.foreground?.value || pillColor;
                }

                const pillTextStr = data.changeLabel
                    ? String(data.changeLabel)
                    : this.autoFormatChange(cv);

                const changeAlignVal = String((changeFmt as any).changeAlign?.value || "left");
                this.pillArrow.textContent = arrow;
                this.pillText.textContent = " " + pillTextStr;
                this.pillEl.style.backgroundColor = pillBg;
                this.pillEl.style.color = pillColor;
                applyFont(this.pillEl, changeFmt as unknown as FontFmt);
                this.pillEl.style.alignSelf = alignSelfFor(changeAlignVal);
                this.pillEl.style.display = "";
            } else {
                this.pillEl.style.display = "none";
            }

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
        this.container = null;
        this.titleEl = null;
        this.labelEl = null;
        this.valueEl = null;
        this.subtitleEl = null;
        this.pillEl = null;
        this.pillArrow = null;
        this.pillText = null;
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
        if (value === null || value === undefined) return "\u2014";

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
        this.labelEl.style.display = "none";
        this.subtitleEl.style.display = "none";
        this.pillEl.style.display = "none";
        this.valueEl.textContent = "Drop a measure into Value";
        this.valueEl.style.fontSize = "13px";
        this.valueEl.style.color = "#999";
        this.container.style.borderLeft = "";
        this.container.style.borderTop = "";
        this.container.style.backgroundColor = "#ffffff";
    }
}
