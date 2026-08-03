import logo from "@/assets/logo";

export type ReportColumn = { key: string; label: string };

export type ReportOptions = {
  title: string;
  subtitle?: string;
  filters: { label: string; value: string }[];
  columns: ReportColumn[];
  rows: Record<string, string | number | null | undefined>[];
};

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Builds an official, branded HTML report and opens the browser print/save-as-PDF dialog. */
export function exportPdf(opts: ReportOptions) {
  const generated = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(opts.title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 10mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #14231a; margin: 0; font-size: 10px; }
  header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #1f7a4d; padding-bottom: 10px; }
  header img { width: 54px; height: 54px; object-fit: contain; }
  .org { font-size: 15px; font-weight: 700; color: #1f7a4d; letter-spacing: .2px; }
  .sys { font-size: 10px; color: #5b6b60; text-transform: uppercase; letter-spacing: 1.4px; }
  h1 { font-size: 15px; margin: 14px 0 2px; }
  .sub { color: #5b6b60; font-size: 10px; margin-bottom: 8px; }
  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
  .chip { border: 1px solid #d5e2da; background: #f3f8f5; border-radius: 999px; padding: 3px 9px; font-size: 9px; }
  .chip b { color: #1f7a4d; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: #1f7a4d; color: #fff; text-align: left; padding: 6px 7px; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; }
  td { padding: 5px 7px; border-bottom: 1px solid #e5ece8; vertical-align: top; }
  tr:nth-child(even) td { background: #fafcfb; }
  tr { break-inside: avoid; }
  footer { position: fixed; bottom: 6mm; left: 0; right: 0; display: flex; justify-content: space-between;
           font-size: 8px; color: #7a8a80; border-top: 1px solid #e5ece8; padding-top: 4px; }
  .watermark { position: fixed; inset: 0; display: grid; place-items: center; opacity: .045; z-index: -1; }
  .watermark img { width: 60%; }
</style></head>
<body>
  <div class="watermark"><img src="${logo}" alt="" /></div>
  <header>
    <img src="${logo}" alt="Ngwathe Local Municipality" />
    <div>
      <div class="org">Ngwathe Local Municipality</div>
      <div class="sys">Ngwathe Connect · Service Delivery Audit</div>
    </div>
  </header>
  <h1>${esc(opts.title)}</h1>
  ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
  <div class="filters">
    ${opts.filters.map((f) => `<span class="chip"><b>${esc(f.label)}:</b> ${esc(f.value)}</span>`).join("")}
    <span class="chip"><b>Records:</b> ${opts.rows.length}</span>
    <span class="chip"><b>Generated:</b> ${esc(generated)}</span>
  </div>
  <table>
    <thead><tr>${opts.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead>
    <tbody>
      ${opts.rows
        .map((r) => `<tr>${opts.columns.map((c) => `<td>${esc(r[c.key])}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  </table>
  <footer>
    <span>Ngwathe Connect — official audit extract. Contains protected personal information (POPIA).</span>
    <span>${esc(generated)}</span>
  </footer>
  <script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 350); });<\/script>
</body></html>`;

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    alert("Allow pop-ups for this site to generate the PDF report.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** Downloads the same dataset as a CSV file. */
export function exportCsv(filename: string, columns: ReportColumn[], rows: Record<string, unknown>[]) {
  const lines = [
    columns.map((c) => c.label),
    ...rows.map((r) => columns.map((c) => r[c.key])),
  ];
  const csv = lines.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
