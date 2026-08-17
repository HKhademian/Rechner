# Code Style and Formatting Guidelines

All TypeScript, TSX, and JavaScript source files in this repository must adhere to the following code style and formatting standards:

## 1. Double Quotes for Strings and Imports
- Always use double quotes (`"`) for strings, imports, and object property keys where quotes are required.
- Do not use single quotes (`'`) for string literals or ESM import specifiers.
- Template literals (`` `...` ``) are reserved for string interpolation or multiline text.

## 2. Trailing Commas Everywhere
- Include a trailing comma (`,`) at the end of every element in multiline:
  - Object literals and type/interface definitions
  - Array literals and tuple definitions
  - Function/method parameter lists and argument calls
  - Import and export specifier lists
  - Enum definitions

## 3. Multiline Formatting for Maintainability
- Avoid long, unwieldy single-line JSX elements, inline style objects, or deeply nested callbacks.
- Break JSX attributes and properties onto separate lines when there are multiple attributes or complex inline styles.
- Break long parameter lists, object properties, and method chains across multiple clearly indented lines to maximize readability and diff clarity in version control.
