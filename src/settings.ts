"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

const ConstantOrRule = powerbi.VisualEnumerationInstanceKinds.ConstantOrRule;

// ─── Alignment helpers (mirrors _template-codex pattern) ────
export function alignSlice(name: string, defaultValue: string = "left") {
    return new formattingSettings.AlignmentGroup({
        name,
        displayName: "Alignment",
        mode: powerbi.visuals.AlignmentGroupMode.Horizonal,
        value: defaultValue,
    });
}

export function alignSelfFor(v: string | undefined): string {
    return v === "center" ? "center" : v === "right" ? "flex-end" : "flex-start";
}

export function textAlignFor(v: string | undefined): string {
    return v === "center" || v === "right" ? v : "left";
}

// ─── Visual Title ───────────────────────────────────────────
// Renders inside the iframe (Policy 1180.2.5 — the PBI auto-title
// strip is host chrome and absorbs right-clicks).
// Default OFF so existing reports render unchanged when upgraded.
export class TitleSettings extends FormattingSettingsCard {
    name = "titleSettings";
    displayName = "Visual Title";

    showTitle = new formattingSettings.ToggleSwitch({ name: "showTitle", displayName: "Show Title", value: false });
    titleText = new formattingSettings.TextInput({ name: "titleText", displayName: "Title Text", placeholder: "Visual title", value: "" });

    titleFontFamily = new formattingSettings.FontPicker({ name: "titleFontFamily", displayName: "Font Family", value: "Segoe UI, sans-serif" });
    titleFontSize = new formattingSettings.NumUpDown({ name: "titleFontSize", displayName: "Font Size", value: 14 });
    titleBold = new formattingSettings.ToggleSwitch({ name: "titleBold", displayName: "Bold", value: true });
    titleItalic = new formattingSettings.ToggleSwitch({ name: "titleItalic", displayName: "Italic", value: false });
    titleUnderline = new formattingSettings.ToggleSwitch({ name: "titleUnderline", displayName: "Underline", value: false });

    titleFont = new formattingSettings.FontControl({
        name: "titleFont", displayName: "Font",
        fontFamily: this.titleFontFamily, fontSize: this.titleFontSize,
        bold: this.titleBold, italic: this.titleItalic, underline: this.titleUnderline,
    });

    titleAlign = alignSlice("titleAlign", "left");

    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor", displayName: "Font Color",
        value: { value: "#1a1a2e" }, instanceKind: ConstantOrRule,
    });

    slices: FormattingSettingsSlice[] = [
        this.showTitle, this.titleText, this.titleFont, this.titleAlign, this.titleColor
    ];
}

// ─── Card Style ─────────────────────────────────────────────
export class CardStyleSettings extends FormattingSettingsCard {
    name = "cardStyle";
    displayName = "Card Style";

    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Accent Colour",
        description: "Left or top border colour",
        value: { value: "#130064" },
        instanceKind: ConstantOrRule
    });

    accentPosition = new formattingSettings.ItemDropdown({
        name: "accentPosition",
        displayName: "Accent Position",
        items: [
            { displayName: "Left", value: "left" },
            { displayName: "Top", value: "top" },
            { displayName: "None", value: "none" }
        ],
        value: { displayName: "Left", value: "left" }
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background Colour",
        value: { value: "#ffffff" },
        instanceKind: ConstantOrRule
    });

    slices: FormattingSettingsSlice[] = [
        this.accentColor,
        this.accentPosition,
        this.backgroundColor
    ];
}

// ─── Value Format ───────────────────────────────────────────
export class ValueFormatSettings extends FormattingSettingsCard {
    name = "valueFormat";
    displayName = "Value Format";

    valueFormatType = new formattingSettings.ItemDropdown({
        name: "valueFormatType",
        displayName: "Format",
        items: [
            { displayName: "Number", value: "number" },
            { displayName: "Percent", value: "percent" },
            { displayName: "Currency", value: "currency" },
            { displayName: "Text", value: "text" }
        ],
        value: { displayName: "Number", value: "number" }
    });

    currencySymbol = new formattingSettings.TextInput({
        name: "currencySymbol",
        displayName: "Currency Symbol",
        placeholder: "$",
        value: "$"
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Decimal Places",
        value: 0,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 6 }
        }
    });

    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font Family", value: "Segoe UI, sans-serif" });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font Size", value: 32 });
    bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: true });
    italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });

    valueFont = new formattingSettings.FontControl({
        name: "valueFont", displayName: "Font",
        fontFamily: this.fontFamily, fontSize: this.fontSize,
        bold: this.bold, italic: this.italic, underline: this.underline,
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Value Colour",
        value: { value: "#130064" },
        instanceKind: ConstantOrRule
    });

    valueAlign = alignSlice("valueAlign", "left");

    slices: FormattingSettingsSlice[] = [
        this.valueFormatType,
        this.currencySymbol,
        this.decimalPlaces,
        this.valueFont,
        this.valueColor,
        this.valueAlign
    ];
}

// ─── Change Settings ────────────────────────────────────────
export class ChangeSettings extends FormattingSettingsCard {
    name = "changeSettings";
    displayName = "Change Indicator";

    showChange = new formattingSettings.ToggleSwitch({
        name: "showChange",
        displayName: "Show Change Pill",
        value: true
    });

    changeDirection = new formattingSettings.ItemDropdown({
        name: "changeDirection",
        displayName: "Direction Logic",
        description: "upIsGood: green when positive. downIsGood: green when negative.",
        items: [
            { displayName: "Up is Good", value: "upIsGood" },
            { displayName: "Down is Good", value: "downIsGood" },
            { displayName: "Neutral", value: "neutral" }
        ],
        value: { displayName: "Down is Good", value: "downIsGood" }
    });

    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font Family", value: "Segoe UI, sans-serif" });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font Size", value: 12 });
    bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: true });
    italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });

    changeFont = new formattingSettings.FontControl({
        name: "changeFont", displayName: "Font",
        fontFamily: this.fontFamily, fontSize: this.fontSize,
        bold: this.bold, italic: this.italic, underline: this.underline,
    });

    changeAlign = alignSlice("changeAlign", "left");

    slices: FormattingSettingsSlice[] = [
        this.showChange,
        this.changeDirection,
        this.changeFont,
        this.changeAlign
    ];
}

// ─── Label Style ────────────────────────────────────────────
export class LabelStyleSettings extends FormattingSettingsCard {
    name = "labelStyle";
    displayName = "Label";

    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font Family", value: "Segoe UI, sans-serif" });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font Size", value: 11 });
    bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: true });
    italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });

    labelFont = new formattingSettings.FontControl({
        name: "labelFont", displayName: "Font",
        fontFamily: this.fontFamily, fontSize: this.fontSize,
        bold: this.bold, italic: this.italic, underline: this.underline,
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label Colour",
        value: { value: "#5e5d5a" },
        instanceKind: ConstantOrRule
    });

    labelAlign = alignSlice("labelAlign", "left");

    slices: FormattingSettingsSlice[] = [
        this.labelFont,
        this.labelColor,
        this.labelAlign
    ];
}

// ─── Subtitle Style ─────────────────────────────────────────
export class SubtitleStyleSettings extends FormattingSettingsCard {
    name = "subtitleStyle";
    displayName = "Subtitle";

    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font Family", value: "Segoe UI, sans-serif" });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font Size", value: 12 });
    bold = new formattingSettings.ToggleSwitch({ name: "bold", displayName: "Bold", value: false });
    italic = new formattingSettings.ToggleSwitch({ name: "italic", displayName: "Italic", value: false });
    underline = new formattingSettings.ToggleSwitch({ name: "underline", displayName: "Underline", value: false });

    subtitleFont = new formattingSettings.FontControl({
        name: "subtitleFont", displayName: "Font",
        fontFamily: this.fontFamily, fontSize: this.fontSize,
        bold: this.bold, italic: this.italic, underline: this.underline,
    });

    subtitleColor = new formattingSettings.ColorPicker({
        name: "subtitleColor",
        displayName: "Subtitle Colour",
        value: { value: "#767676" },
        instanceKind: ConstantOrRule
    });

    subtitleAlign = alignSlice("subtitleAlign", "left");

    slices: FormattingSettingsSlice[] = [
        this.subtitleFont,
        this.subtitleColor,
        this.subtitleAlign
    ];
}

// ─── Model ──────────────────────────────────────────────────
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    titleSettings = new TitleSettings();
    cardStyle = new CardStyleSettings();
    valueFormat = new ValueFormatSettings();
    changeSettings = new ChangeSettings();
    labelStyle = new LabelStyleSettings();
    subtitleStyle = new SubtitleStyleSettings();

    cards: FormattingSettingsCard[] = [
        this.titleSettings,
        this.cardStyle,
        this.valueFormat,
        this.changeSettings,
        this.labelStyle,
        this.subtitleStyle
    ];
}
