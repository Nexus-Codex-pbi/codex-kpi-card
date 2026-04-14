"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

const ConstantOrRule = powerbi.VisualEnumerationInstanceKinds.ConstantOrRule;

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

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Value Font Size",
        value: 32,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 12 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 72 }
        }
    });

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Value Colour",
        value: { value: "#130064" },
        instanceKind: ConstantOrRule
    });

    slices: FormattingSettingsSlice[] = [
        this.valueFormatType,
        this.currencySymbol,
        this.decimalPlaces,
        this.fontSize,
        this.valueColor
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

    slices: FormattingSettingsSlice[] = [
        this.showChange,
        this.changeDirection
    ];
}

// ─── Label Settings ─────────────────────────────────────────
export class LabelSettings extends FormattingSettingsCard {
    name = "labelSettings";
    displayName = "Labels";

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label Colour",
        value: { value: "#5e5d5a" },
        instanceKind: ConstantOrRule
    });

    subtitleColor = new formattingSettings.ColorPicker({
        name: "subtitleColor",
        displayName: "Subtitle Colour",
        value: { value: "#767676" },
        instanceKind: ConstantOrRule
    });

    slices: FormattingSettingsSlice[] = [
        this.labelColor,
        this.subtitleColor
    ];
}

// ─── Model ──────────────────────────────────────────────────
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardStyle = new CardStyleSettings();
    valueFormat = new ValueFormatSettings();
    changeSettings = new ChangeSettings();
    labelSettings = new LabelSettings();

    cards: FormattingSettingsCard[] = [
        this.cardStyle,
        this.valueFormat,
        this.changeSettings,
        this.labelSettings
    ];
}
