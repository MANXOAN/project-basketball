import type { ThemeConfig } from "antd";

// Theme Ant Design đồng bộ với token trong index.css.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#cf4a0c",
    colorLink: "#b23d0a",
    colorInfo: "#cf4a0c",
    colorSuccess: "#059669",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorText: "#1c1917",
    colorTextSecondary: "#57534e",
    colorBorder: "#e7e5e4",
    colorBorderSecondary: "#f5f5f4",
    colorBgLayout: "#fffaf5",
    fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    fontSize: 14,
    borderRadius: 12,
    borderRadiusLG: 16,
    controlHeight: 40,
    controlHeightLG: 46,
    controlOutline: "rgba(249, 115, 22, 0.18)",
    boxShadowSecondary: "0 2px 4px rgba(28,25,23,.04), 0 16px 32px -12px rgba(28,25,23,.14)",
    motionEaseOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  components: {
    Button: { fontWeight: 600, primaryShadow: "0 8px 20px -10px rgba(207,74,12,.6)", defaultHoverBorderColor: "#fdba74", defaultHoverColor: "#b23d0a" },
    Table: { headerBg: "#fafaf9", headerColor: "#57534e", rowHoverBg: "#fff7ed", borderColor: "#f5f5f4", headerSplitColor: "transparent" },
    Menu: { itemSelectedBg: "#fff7ed", itemSelectedColor: "#b23d0a", itemHoverBg: "#f5f5f4", itemBorderRadius: 12 },
    Modal: { borderRadiusLG: 24, titleFontSize: 18 },
    Card: { borderRadiusLG: 20 },
    Tabs: { itemSelectedColor: "#b23d0a", inkBarColor: "#f97316", itemHoverColor: "#cf4a0c" },
    Segmented: { itemSelectedColor: "#b23d0a" },
    Tag: { borderRadiusSM: 999 },
    Pagination: { itemActiveBg: "#fff7ed" },
  },
};
