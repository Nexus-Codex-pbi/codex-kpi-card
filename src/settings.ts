"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

import { BackgroundSettings } from "./shared/backgroundSettings";
import { BorderSettings } from "./shared/borderSettings";
import { TitleSettings } from "./shared/titleSettings";
import { alignSlice, alignSelfFor, textAlignFor } from "./shared/textFormatting";
import { CardSignatureSettings } from "./shared/cardSignatureSettings";

const ConstantOrRule = powerbi.VisualEnumerationInstanceKinds.ConstantOrRule;

// Alignment helpers + TitleSettings now live in _shared/formatting/ (D-13,
// D-14 — Plan 10 pilot). Re-exported here so visual.ts's existing import
// path (`from "./settings"`) stays stable — see visual.ts line 22.
export { TitleSettings, alignSlice, alignSelfFor, textAlignFor };

// ─── Card Style ─────────────────────────────────────────────
// v3 appearance engine pilot (Plan 15, D-16): accentColor is still the
// classic left/top border colour AND now doubles as the fallback tint
// for the new corner-bracket signature/dot/target-strip whenever no
// band colour applies (no Change Value bound, or Direction Logic is
// Neutral) — see visual.ts's `signalHex` resolution. No new capabilities
// were added for this pilot; the v2 look ships via new DEFAULT chrome
// only, so existing saved-report bindings on these two properties are
// untouched (additive-only, no schema churn).
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

    // Retired from the pane 2026-07-12 (Neil: dead control — render reads
    // the shared Background card since the v2 wave). Stays DECLARED
    // (schema lock) and is READ at render as a migration fallback for old
    // reports that set it before the shared card existed.
    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background Colour",
        value: { value: "#ffffff" },
        instanceKind: ConstantOrRule
    });

    // Hidden from the pane 2026-07-12 (Neil: redundant next to Corner
    // Accents + Border; accent colour is data-driven via the Accent
    // Colour field well). Card stays in the model so persisted values
    // still populate and the accent strip renders unchanged.
    visible: boolean = false;

    slices: FormattingSettingsSlice[] = [
        this.accentColor,
        this.accentPosition
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
// v3 appearance engine pilot (Plan 15, D-16): changeDirection now also
// decides which _shared/formatting/bandEngine.ts token (success/danger)
// tints the pill/dot/corner-bracket/target-strip together — a report
// saved with the default "Down is Good" keeps reading a decrease as
// success, deliberately NOT the band engine's literal directionColor()
// sign read (see visual.ts's `deltaBand` derivation).
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
    cardSignature = new CardSignatureSettings();
    visualBorder = new BorderSettings();
    titleSettings = new TitleSettings();
    cardStyle = new CardStyleSettings();
    background = new BackgroundSettings();
    valueFormat = new ValueFormatSettings();
    changeSettings = new ChangeSettings();
    labelStyle = new LabelStyleSettings();
    subtitleStyle = new SubtitleStyleSettings();

    cards: FormattingSettingsCard[] = [
        this.titleSettings,
        this.cardStyle,
        this.background,
        this.valueFormat,
        this.changeSettings,
        this.labelStyle,
        this.subtitleStyle,
        this.cardSignature,
        this.visualBorder
    ];
}
