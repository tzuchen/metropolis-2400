/**
 * 統一 UI 字型與文字排版工具模組。
 *
 * 此模組提供：
 * 1. 中文（CJK）字型堆疊常數。
 * 2. 一般 UI 文字字型產生函數 getFont。
 * 3. 標題文字字型產生函數 getTitleFont。
 *
 * 設計目標：
 * - 讓 UI 中所有文字排版使用一致的字型策略。
 * - 中文文字自動放大 2px，並確保最小 13px，提升可讀性。
 * - 英文文字使用 monospace，保持等寬字型一致性。
 * - 提供 bold 選項，方便一般文字與標題文字共用同一套規則。
 */

/**
 * 中文（CJK）字型堆疊。
 *
 * 優先順序：
 * 1. Noto Sans TC
 * 2. Microsoft JhengHei
 * 3. PingFang TC
 * 4. monospace（最終 fallback）
 */
export const CJK_FONT_STACK =
  '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", monospace';

/**
 * 取得一般 UI 文字使用的 CSS font 字串。
 *
 * @param size 基礎字體大小（單位：px）
 * @param isZh 是否為中文文字
 * @param bold 是否使用粗體，預設為 false
 * @returns 可直接用於 CSS font 屬性的字串
 *
 * @example
 * getFont(14, false);
 * // => "14px monospace"
 *
 * getFont(14, true);
 * // => "16px \"Noto Sans TC\", \"Microsoft JhengHei\", \"PingFang TC\", monospace"
 *
 * getFont(10, true, true);
 * // => "bold 13px \"Noto Sans TC\", \"Microsoft JhengHei\", \"PingFang TC\", monospace"
 */
export function getFont(size: number, isZh: boolean, bold: boolean = false): string {
  /**
   * 中文文字會自動放大 2px，並確保最小 13px。
   * 英文文字則維持原始 size。
   */
  const fontSize = isZh ? Math.max(size + 2, 13) : size;

  /**
   * 中文使用 CJK_FONT_STACK，英文使用 monospace。
   */
  const fontFamily = isZh ? CJK_FONT_STACK : 'monospace';

  /**
   * 若 bold 為 true，則在 CSS font shorthand 中加入 "bold"。
   * 注意：CSS font shorthand 中，font-weight 需放在 font-size 之前。
   */
  const fontWeight = bold ? 'bold ' : '';

  return `${fontWeight}${fontSize}px ${fontFamily}`;
}

/**
 * 取得標題文字使用的 CSS font 字串。
 *
 * 標題文字預設使用粗體，並沿用 getFont 的中文放大規則。
 *
 * @param size 基礎字體大小（單位：px）
 * @param isZh 是否為中文文字
 * @returns 可直接用於 CSS font 屬性的字串
 *
 * @example
 * getTitleFont(16, false);
 * // => "bold 16px monospace"
 *
 * getTitleFont(16, true);
 * // => "bold 18px \"Noto Sans TC\", \"Microsoft JhengHei\", \"PingFang TC\", monospace"
 */
export function getTitleFont(size: number, isZh: boolean): string {
  return getFont(size, isZh, true);
}
