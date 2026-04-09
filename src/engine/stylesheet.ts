/**
 * StyleSheetManager — Engine-level Constructable Stylesheet Singleton
 *
 * Consolidates all CSS stylesheet operations:
 * - adoptCSS()   : Adopt external CSS (used by data-injest)
 * - ensureRule()  : JIT single-rule insertion (future use)
 * - collectRules(): Serialize managed rules (used by data-build)
 * - removeSheet() : Remove a named sheet
 * - dispose()     : Full teardown
 */

class StyleSheetManager {
  /** Named external sheets adopted via adoptCSS() */
  private _adoptedSheets: Map<string, CSSStyleSheet> = new Map();

  /** The single JIT sheet for on-demand rules */
  private _jitSheet: CSSStyleSheet | null = null;

  /** Dedup guard for JIT rules — tracks known class names */
  private _knownClasses: Set<string> = new Set();

  /** Auto-incrementing ID for unnamed sheets */
  private _nextId = 0;

  /**
   * Lazily initialize the JIT sheet.
   * Only created when first needed, avoiding overhead if never used.
   */
  private _getJitSheet(): CSSStyleSheet {
    if (!this._jitSheet) {
      this._jitSheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this._jitSheet];
    }
    return this._jitSheet;
  }

  /**
   * Adopt an external CSS string as a Constructable Stylesheet.
   * Returns a cleanup function that removes the sheet.
   *
   * @param cssText - The full CSS text to adopt
   * @param id - Optional identifier for the sheet (for removeSheet)
   */
  async adoptCSS(cssText: string, id?: string): Promise<() => void> {
    const sheetId = id || `_auto_${this._nextId++}`;

    // If a sheet with this ID already exists, replace its contents
    const existing = this._adoptedSheets.get(sheetId);
    if (existing) {
      await existing.replace(cssText);
      return () => this.removeSheet(sheetId);
    }

    const sheet = new CSSStyleSheet();
    await sheet.replace(cssText);
    this._adoptedSheets.set(sheetId, sheet);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

    return () => this.removeSheet(sheetId);
  }

  /**
   * Ensure a CSS rule exists for a given class name.
   * If the class is already known, this is a no-op.
   * Used for JIT utility class generation.
   *
   * @param className - The class name (without leading dot)
   * @param cssText - The full CSS rule text, e.g. ".p-4 { padding: 1rem }"
   */
  ensureRule(className: string, cssText: string): void {
    if (this._knownClasses.has(className)) return;

    const sheet = this._getJitSheet();
    try {
      sheet.insertRule(cssText, sheet.cssRules.length);
      this._knownClasses.add(className);
    } catch {
      // Invalid CSS rule — silently skip
    }
  }

  /**
   * Collect all CSS rules from managed sheets (adopted + JIT).
   * Used by data-build for serialization.
   */
  collectRules(): string {
    const sheets: string[] = [];

    // Adopted sheets
    this._adoptedSheets.forEach((sheet) => {
      const rules: string[] = [];
      try {
        for (const rule of sheet.cssRules) {
          rules.push(rule.cssText);
        }
      } catch { /* cross-origin sheets are inaccessible */ }
      if (rules.length) sheets.push(rules.join('\n'));
    });

    // JIT sheet
    if (this._jitSheet) {
      const rules: string[] = [];
      try {
        for (const rule of this._jitSheet.cssRules) {
          rules.push(rule.cssText);
        }
      } catch { /* safety */ }
      if (rules.length) sheets.push(rules.join('\n'));
    }

    return sheets.join('\n\n');
  }

  /**
   * Remove a previously adopted sheet by its ID.
   */
  removeSheet(id: string): void {
    const sheet = this._adoptedSheets.get(id);
    if (!sheet) return;

    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
    this._adoptedSheets.delete(id);
  }

  /**
   * Full teardown — remove all managed sheets.
   */
  dispose(): void {
    // Remove all adopted sheets
    this._adoptedSheets.forEach((_sheet, id) => this.removeSheet(id));
    this._adoptedSheets.clear();

    // Remove JIT sheet
    if (this._jitSheet) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== this._jitSheet);
      this._jitSheet = null;
    }

    this._knownClasses.clear();
    this._nextId = 0;
  }
}

/** Global StyleSheetManager — singleton */
export const stylesheet = new StyleSheetManager();
