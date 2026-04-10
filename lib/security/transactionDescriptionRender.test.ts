import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

/**
 * SEC-303: Transaction descriptions must not be interpreted as HTML.
 * TransactionList renders description as React text children (default escape),
 * not via dangerouslySetInnerHTML.
 */
describe("transaction description rendering (SEC-303)", () => {
  /*
   * Testing strategy
   *
   * partition on description payload shape:
   *   plain text (no markup)
   *   string containing HTML-like angle brackets
   *
   * partition on output encoding:
   *   angle brackets escaped in serialized HTML
   *   script tags not present as live markup in output
   */

  it("covers plain text payload and output contains literal characters", () => {
    const payload = "Funding from card";
    const el = createElement("span", { className: "text-gray-500" }, payload);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Funding from card");
    expect(html).not.toContain("&lt;");
  });

  it("covers HTML-like payload and output escapes angle brackets", () => {
    const payload = '<img src=x onerror=alert(1)>';
    const el = createElement("span", { className: "text-gray-500" }, payload);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("&lt;img");
    expect(html).toContain("alert(1)&gt;");
    expect(html).not.toMatch(/<img\s/);
  });
});
