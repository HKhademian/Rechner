# Centralized Icons Architecture & Intention-Based Naming

All visual icons, SVG graphics, symbol badges, and iconographic markers in this project MUST be centrally defined in and exported from [src/components/Icons.tsx](file:///Users/ho/Projects/calculator/src/components/Icons.tsx).

## Architectural Mandates

1. **Intention-Based Naming (Semantic Purpose over Visual Content)**:
   - Icon component names MUST represent their **functional intention, domain purpose, or semantic role**, NEVER their literal visual shape, physical object, or drawing content.
   - ❌ **Forbidden Literal Shape Names**: `MoonIcon`, `SunIcon`, `MonitorIcon`, `PlusIcon`, `CloseIcon`, `XIcon`, `BabyIcon`, `CoinsIcon`, `BriefcaseIcon`, `LightningIcon`, `ScrollDocIcon`, `LightbulbIcon`, `LinkChainIcon`, `WarningTriangleIcon`, `CheckmarkIcon`, `TrashIcon`, `GearIcon`, `PencilIcon`.
   - ✅ **Required Intention-Based Names**:
     - Theme Modes: `DarkThemeIcon`, `LightThemeIcon`, `SystemThemeIcon`
     - Navigation & Modes: `CalculatorNavigationIcon`, `SimulatorNavigationIcon`
     - Domain Milestones: `ChildBirthMilestoneIcon`, `PregnancyMilestoneIcon`, `EmploymentCompensationIcon`, `TaxClassSwapMilestoneIcon`, `CareerPromotionMilestoneIcon`, `SpecialEventTriggerIcon`, `FinancialInflowIcon`, `FinancialEventIcon`
     - User Actions: `AddActionIcon`, `DismissIcon`, `RemoveItemIcon`, `DeleteActionIcon`, `ExportDataIcon`, `ConfigureSandboxIcon`, `EditSettingsIcon`, `ResetDefaultsIcon`
     - Legal & Statutory: `StatutorySectionIcon`, `LegalStatuteDocumentationIcon`, `OptimizationInsightIcon`, `CitationReferenceIcon`, `ExternalLegalSourceIcon`, `InformationalNoticeIcon`
     - Status & Workflow: `EligibilityConfirmedIcon`, `SuccessStatusIcon`, `StatutoryLimitationWarningIcon`, `StepTransitionIcon`, `ExpandSectionIcon`, `CollapseSectionIcon`, `AuditInspectionIcon`, `SimulationPeriodIcon`

2. **Single Source of Truth**:
   - No component, page, or module may declare inline `<svg>` elements or import third-party icon libraries directly.
   - All icons must be declared as strongly-typed Preact components in `src/components/Icons.tsx`.

3. **No Hardcoded Visual Emojis in JSX**:
   - Visual emojis used as UI icons, button markers, tab symbols, or badge indicators must NOT be hardcoded as raw text/emojis in component JSX.
   - Every visual symbol must be encapsulated in an exported, intention-named Icon component in `src/components/Icons.tsx`.

4. **Consistent IconProps Interface**:
   - All icon components must accept optional `size?: number` and `className?: string` props with sensible institutional defaults.
   - Scalable vector graphics (`<svg>`) or accessible semantic wrappers should be used for crisp institutional rendering across light and dark themes.

