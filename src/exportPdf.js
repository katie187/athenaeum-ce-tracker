import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export function exportPdf(member, content, completed) {
  const doc = new jsPDF();
  const completedItems = content
    .filter((c) => completed[c.id])
    .sort((a, b) => new Date(completed[a.id]) - new Date(completed[b.id]));

  const totalHours = completedItems.reduce((sum, c) => sum + (c.ceHours || 0), 0);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("THE ATHENAEUM", 105, 25, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Continuing Education Record", 105, 33, { align: "center" });

  // Provider + member info
  doc.setFontSize(10);
  doc.setTextColor(100);
  const infoY = 45;
  doc.text(`Provider: The Athenaeum — Hello Joy OT LLC`, 14, infoY);
  doc.text(`Member: ${member.full_name}`, 14, infoY + 6);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    14,
    infoY + 12
  );
  doc.text(`Total CE Hours Earned: ${totalHours}`, 14, infoY + 18);

  doc.setDrawColor(200);
  doc.line(14, infoY + 23, 196, infoY + 23);

  if (completedItems.length === 0) {
    doc.setTextColor(120);
    doc.setFontSize(12);
    doc.text("No completed items to display.", 105, infoY + 40, {
      align: "center",
    });
  } else {
    // Table
    const typeLabel = { article: "Article", podcast: "Podcast", seminar: "Seminar" };

    autoTable(doc, {
      startY: infoY + 28,
      head: [["Title", "Type", "CE Hours", "Date Completed"]],
      body: completedItems.map((c) => [
        c.title,
        typeLabel[c.type] || c.type,
        c.ceHours,
        new Date(completed[c.id]).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [31, 61, 43], // forest green
        textColor: [245, 241, 232], // cream
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [250, 247, 240], // cream-soft
      },
      foot: [["", "", totalHours, ""]],
      footStyles: {
        fillColor: [31, 61, 43],
        textColor: [245, 241, 232],
        fontStyle: "bold",
        fontSize: 9,
      },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "The Athenaeum — Hello Joy OT LLC · Continuing Education Documentation",
    105,
    pageHeight - 10,
    { align: "center" }
  );

  doc.save(`CE-Record_${member.full_name.replace(/\s+/g, "-")}.pdf`);
}
