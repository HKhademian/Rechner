import "./Navigation.css";
import type {
  JSX,
} from "preact";
import {
  DarkThemeIcon,
  LightThemeIcon,
  SystemThemeIcon,
  ThemePaletteIcon,
} from "#components/Icons";
import {
  PopoverAlign,
  PopoverMenu,
} from "#components/ui/PopoverMenu";
import {
  type SegmentedOption,
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  type ThemePalette,
  type ThemeStyle,
  ThemeMode,
} from "#engine/types";
import {
  activeThemeMode,
  activeThemePalette,
  activeThemeStyle,
  setThemeMode,
  setThemePalette,
  setThemeStyle,
} from "#store/themeStore";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  THEME_PALETTE_OPTIONS,
  THEME_STYLE_OPTIONS,
} from "#utils/themeConfig";

const MODE_OPTIONS: readonly SegmentedOption<ThemeMode>[] = [
  {
    value: ThemeMode.Light,
    label: "Light",
    title: "Light mode",
  },
  {
    value: ThemeMode.Dark,
    label: "Dark",
    title: "Dark mode",
  },
  {
    value: ThemeMode.System,
    label: "Auto",
    title: "Follow system color scheme",
  },
];

const STYLE_OPTIONS: readonly SegmentedOption<ThemeStyle>[] = THEME_STYLE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
  title: option.description,
}));

function renderModeIcon(mode: ThemeMode): JSX.Element {
  if (mode === ThemeMode.Dark) {
    return <DarkThemeIcon size={14} />;
  }
  if (mode === ThemeMode.System) {
    return <SystemThemeIcon size={14} />;
  }
  return <LightThemeIcon size={14} />;
}

/**
 * Global appearance switcher combining switchable minimal design styles (Swiss,
 * Editorial, Utility), Light/Dark/Auto mode, and curated institutional palettes.
 */
export default function ThemeToggle(): JSX.Element {
  const hydrated = useHydrated();
  const mode = hydrated ? activeThemeMode.value : DEFAULT_APPEARANCE_SETTINGS.mode;
  const palette = hydrated ? activeThemePalette.value : DEFAULT_APPEARANCE_SETTINGS.palette;
  const style = hydrated ? activeThemeStyle.value : DEFAULT_APPEARANCE_SETTINGS.style;

  const handlePaletteSelect = (nextPalette: ThemePalette): void => {
    setThemePalette(nextPalette);
  };

  return (
    <PopoverMenu
      className="theme-switcher"
      panelClassName="theme-switcher__panel"
      align={PopoverAlign.Right}
      summaryAriaLabel="Appearance, design style, and color theme"
      panelAriaLabel="Appearance, design style, and color palette settings"
      summary={(
        <>
          <span
            className={`theme-switcher__swatch theme-switcher__swatch--${palette}`}
            aria-hidden="true"
          />
          {renderModeIcon(mode)}
          <span className="theme-switcher__summary-label">Appearance</span>
        </>
      )}
    >
      <div className="theme-switcher__section">
        <div className="theme-switcher__section-title">
          <ThemePaletteIcon size={14} />
          <span>Design Style</span>
        </div>
        <SegmentedControl
          label="Design style"
          value={style}
          options={STYLE_OPTIONS}
          onChange={setThemeStyle}
          compact
          fullWidth
        />
      </div>

      <div className="theme-switcher__section">
        <div className="theme-switcher__section-title">
          <span>Color Mode</span>
        </div>
        <SegmentedControl
          label="Color mode"
          value={mode}
          options={MODE_OPTIONS}
          onChange={setThemeMode}
          compact
          fullWidth
        />
      </div>

      <div className="theme-switcher__section">
        <div className="theme-switcher__section-title">
          <span>Palette</span>
        </div>
        <div className="theme-switcher__palettes" role="group" aria-label="Color palette">
          {THEME_PALETTE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="theme-switcher__palette-btn"
              aria-pressed={option.value === palette}
              onClick={() => handlePaletteSelect(option.value)}
            >
              <span
                className={`theme-switcher__swatch theme-switcher__swatch--${option.value}`}
                aria-hidden="true"
              />
              <span className="theme-switcher__palette-text">
                <span className="theme-switcher__palette-name">{option.label}</span>
                <span className="theme-switcher__palette-desc">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </PopoverMenu>
  );
}
