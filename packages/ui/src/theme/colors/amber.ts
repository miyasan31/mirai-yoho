import { defineSemanticTokens } from "@pandacss/dev";

export const amber = defineSemanticTokens.colors({
  "1": { value: { _light: "#fefdfb", _dark: "#16120c" } },
  "2": { value: { _light: "#fff9ed", _dark: "#1d180f" } },
  "3": { value: { _light: "#fff3d0", _dark: "#302008" } },
  "4": { value: { _light: "#ffecb6", _dark: "#3f2700" } },
  "5": { value: { _light: "#ffe39b", _dark: "#4d3000" } },
  "6": { value: { _light: "#ffd97f", _dark: "#5c3d05" } },
  "7": { value: { _light: "#f8c35f", _dark: "#714f19" } },
  "8": { value: { _light: "#eba724", _dark: "#8f6424" } },
  "9": { value: { _light: "#ffb224", _dark: "#ffb224" } },
  "10": { value: { _light: "#f5a61f", _dark: "#ffc14d" } },
  "11": { value: { _light: "#ad5700", _dark: "#ffcf70" } },
  "12": { value: { _light: "#4f2a00", _dark: "#ffe7b8" } },
  a1: { value: { _light: "#c0800004", _dark: "#e58f1206" } },
  a2: { value: { _light: "#ffb30012", _dark: "#ffb31a0f" } },
  a3: { value: { _light: "#ffb3002f", _dark: "#ffb30024" } },
  a4: { value: { _light: "#ffb30049", _dark: "#ffb30033" } },
  a5: { value: { _light: "#ffb20064", _dark: "#ffb63543" } },
  a6: { value: { _light: "#ffaf0080", _dark: "#ffb94254" } },
  a7: { value: { _light: "#f7a300a0", _dark: "#ffbf5570" } },
  a8: { value: { _light: "#ea9a00db", _dark: "#ffc56792" } },
  a9: { value: { _light: "#ffb224", _dark: "#ffb224" } },
  a10: { value: { _light: "#f1a100e0", _dark: "#ffc14d" } },
  a11: { value: { _light: "#a55300", _dark: "#ffcf70" } },
  a12: { value: { _light: "#4f2a00", _dark: "#ffe7b8" } },
  solid: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.amber.9}", _dark: "{colors.amber.9}" },
      },
      hover: {
        value: { _light: "{colors.amber.10}", _dark: "{colors.amber.10}" },
      },
    },
    fg: { DEFAULT: { value: { _light: "white", _dark: "white" } } },
  },
  subtle: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a3}", _dark: "{colors.amber.a3}" },
      },
      hover: {
        value: { _light: "{colors.amber.a4}", _dark: "{colors.amber.a4}" },
      },
      active: {
        value: { _light: "{colors.amber.a5}", _dark: "{colors.amber.a5}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a11}", _dark: "{colors.amber.a11}" },
      },
    },
  },
  surface: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a2}", _dark: "{colors.amber.a2}" },
      },
      active: {
        value: { _light: "{colors.amber.a3}", _dark: "{colors.amber.a3}" },
      },
    },
    border: {
      DEFAULT: {
        value: { _light: "{colors.amber.a6}", _dark: "{colors.amber.a6}" },
      },
      hover: {
        value: { _light: "{colors.amber.a7}", _dark: "{colors.amber.a7}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a11}", _dark: "{colors.amber.a11}" },
      },
    },
  },
  outline: {
    bg: {
      hover: {
        value: { _light: "{colors.amber.a2}", _dark: "{colors.amber.a2}" },
      },
      active: {
        value: { _light: "{colors.amber.a3}", _dark: "{colors.amber.a3}" },
      },
    },
    border: {
      DEFAULT: {
        value: { _light: "{colors.amber.a7}", _dark: "{colors.amber.a7}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a11}", _dark: "{colors.amber.a11}" },
      },
    },
  },
  plain: {
    bg: {
      hover: {
        value: { _light: "{colors.amber.a3}", _dark: "{colors.amber.a3}" },
      },
      active: {
        value: { _light: "{colors.amber.a4}", _dark: "{colors.amber.a4}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.amber.a11}", _dark: "{colors.amber.a11}" },
      },
    },
  },
});
