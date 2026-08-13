import { createTheme } from "@mui/material";

/**
 * Mini design system: design tokens + MUI component overrides.
 * Generated components must consume these tokens (via the theme /
 * sx prop) instead of hardcoding colors or radii.
 */
export const tokens = {
  color: {
    primary: "#0F766E",
    primaryDark: "#115E59",
    primaryLight: "#14B8A6",
    accent: "#B45309",
    accentLight: "#D97706",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
  },
  /**
   * Radii in px. NOTE: in the `sx` prop a bare number is multiplied by
   * theme.shape.borderRadius — use the px string form there:
   *   sx={{ borderRadius: `${tokens.radius.lg}px` }}
   */
  radius: { sm: 6, md: 10, lg: 16 },
  shadow: { card: "0 1px 3px rgba(15, 23, 42, 0.08)" },
} as const;

export const theme = createTheme({
  palette: {
    mode: "light",
    contrastThreshold: 4.5,
    primary: { main: tokens.color.primary, dark: tokens.color.primaryDark, light: tokens.color.primaryLight },
    secondary: { main: tokens.color.accent, light: tokens.color.accentLight },
    background: { default: tokens.color.background, paper: tokens.color.surface },
    text: { primary: tokens.color.textPrimary, secondary: tokens.color.textSecondary },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: tokens.radius.md },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          boxShadow: tokens.shadow.card,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: tokens.radius.md } },
    },
    MuiTextField: { defaultProps: { size: "small" } },
  },
});
