import { jsPDF } from 'jspdf';
import { AppConfig } from '../types';

/**
 * Strips or decodes HTML entities into clean readable plaintext.
 */
function decodeHtmlEntities(text: string): string {
  const element = document.createElement('textarea');
  element.innerHTML = text;
  return element.value;
}

/**
 * Generates and downloads an exhaustive, beautifully formatted executive PDF
 * specification report for an application in the Admin Control Panel.
 * 
 * Strict Guidelines:
 * - INCLUDES: Full App Description HTML, Key Features HTML, FAQs, Release Notes,
 *   Technical specs, Developer info, Safety notices, and SEO meta.
 * - EXCLUDES: App ID, Canonical Public URL, Secret/Vault download links, and User reviews.
 */
export async function exportAppToPdf(app: AppConfig): Promise<void> {
  if (!app) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Premium Slate Color Palette
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const lightBgColor: [number, number, number] = [248, 250, 252]; // Slate 50
  const cardBgColor: [number, number, number] = [241, 245, 249]; // Slate 100
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200
  const emeraldColor: [number, number, number] = [16, 185, 129];
  const amberColor: [number, number, number] = [245, 158, 11];

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = margin;
      drawHeaderStrip();
    }
  };

  const drawHeaderStrip = () => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY, contentWidth, 2, 'F');
    currentY += 5;
  };

  // 1. Top Executive Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('APPLICATION TRANSPARENCY PLATFORM', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('COMPLETE APPLICATION SPECIFICATION & EDITORIAL REPORT', margin + 6, currentY + 15);

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin - 6, currentY + 15, { align: 'right' });

  currentY += 28;

  // 2. App Hero Card (NO App ID)
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'FD');

  // App Name
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const appName = app.name || 'Unnamed Application';
  doc.text(appName, margin + 6, currentY + 9);

  // Subtitle / category & version
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Order #${app.serial_number || 0}  |  Folder: `, margin + 6, currentY + 16);
  
  // Category highlight
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(app.category || 'General', margin + 35, currentY + 16);

  // Technical summary line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Developer: ${app.developer || 'Official Studio'}   •   Version: ${app.version || '1.0'}   •   Size: ${app.file_size || 'N/A'}`, margin + 6, currentY + 22);

  // Status Badge on right
  const isLive = app.sync_to_public !== false;
  if (isLive) {
    doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  } else {
    doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  }
  doc.roundedRect(pageWidth - margin - 32, currentY + 6, 26, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isLive ? 'LIVE ON WEB' : 'ADMIN DRAFT', pageWidth - margin - 19, currentY + 10.8, { align: 'center' });

  currentY += 31;

  // Section Header Helper
  const drawSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(margin, currentY, 3, 5.5, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(title, margin + 6, currentY + 4.2);
    currentY += 8;
  };

  // Grid Key-Value Rows Helper
  const drawSpecsTable = (items: Array<{ label: string; value: string | number | boolean | undefined; highlight?: boolean }>) => {
    const colWidth = (contentWidth - 4) / 2;
    const rowHeight = 7;
    const totalRows = Math.ceil(items.length / 2);

    checkPageBreak(totalRows * rowHeight + 6);

    for (let r = 0; r < totalRows; r++) {
      const item1 = items[r * 2];
      const item2 = items[r * 2 + 1];

      const rowY = currentY + r * rowHeight;
      const isEven = r % 2 === 0;

      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(margin, rowY, contentWidth, rowHeight, 'FD');

      // Left Column
      if (item1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(item1.label, margin + 4, rowY + 4.6);

        doc.setFont('helvetica', item1.highlight ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.setTextColor(item1.highlight ? accentColor[0] : primaryColor[0], item1.highlight ? accentColor[1] : primaryColor[1], item1.highlight ? accentColor[2] : primaryColor[2]);
        const valStr = String(item1.value !== undefined && item1.value !== null && item1.value !== '' ? item1.value : 'None');
        doc.text(valStr, margin + 42, rowY + 4.6);
      }

      // Dividing Line
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(margin + colWidth + 2, rowY, margin + colWidth + 2, rowY + rowHeight);

      // Right Column
      if (item2) {
        const col2X = margin + colWidth + 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(item2.label, col2X, rowY + 4.6);

        doc.setFont('helvetica', item2.highlight ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.setTextColor(item2.highlight ? accentColor[0] : primaryColor[0], item2.highlight ? accentColor[1] : primaryColor[1], item2.highlight ? accentColor[2] : primaryColor[2]);
        const valStr2 = String(item2.value !== undefined && item2.value !== null && item2.value !== '' ? item2.value : 'None');
        doc.text(valStr2, col2X + 38, rowY + 4.6);
      }
    }

    currentY += totalRows * rowHeight + 6;
  };

  // 3. Technical & Package Specifications
  drawSectionHeader('1. TECHNICAL & PACKAGE SPECIFICATIONS');
  drawSpecsTable([
    { label: 'Package Size:', value: app.file_size || 'N/A', highlight: true },
    { label: 'App Version:', value: app.version || '1.0' },
    { label: 'Developer / Studio:', value: app.developer || 'Official Studio', highlight: true },
    { label: 'Rating Score:', value: `${app.rating || 4.2} / 5.0` },
    { label: 'Total Rating Votes:', value: app.review_count || 0 },
    { label: 'Safety Evaluation:', value: app.safety_status || 'Verified' },
    { label: 'Publish Date:', value: app.publish_date || 'N/A' },
    { label: 'Target Region:', value: app.target_region || 'Global / India' },
    { label: 'Top Chart Category:', value: app.is_top_chart ? (app.top_chart_category || 'Featured') : 'Not Ranked' },
    { label: 'Featured Banner:', value: app.is_featured ? 'Active (Yes)' : 'No' },
    { label: 'Hot / Trending Badge:', value: app.is_hot ? 'Active (Yes)' : 'No' },
    { label: 'New Addition Badge:', value: app.is_new ? 'Active (Yes)' : 'No' }
  ]);

  /**
   * Helper function to render HTML elements cleanly into jsPDF.
   */
  const renderHtmlContent = (htmlContent: string) => {
    if (!htmlContent || !htmlContent.trim()) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('No content provided.', margin + 4, currentY + 4);
      currentY += 8;
      return;
    }

    try {
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
      const elements = Array.from(htmlDoc.body.childNodes);

      elements.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const rawText = decodeHtmlEntities(node.textContent || '').trim();
          if (rawText) {
            const lines = doc.splitTextToSize(rawText, contentWidth - 6);
            checkPageBreak(lines.length * 4.5 + 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
            doc.text(lines, margin + 4, currentY + 4);
            currentY += lines.length * 4.5 + 3;
          }
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toUpperCase();
          const innerText = decodeHtmlEntities(el.textContent || '').trim();

          if (!innerText) return;

          if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
            checkPageBreak(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(tagName === 'H1' ? 11 : tagName === 'H2' ? 10 : 9);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            
            // Draw small left marker
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(margin + 2, currentY + 1.5, 1.5, 4, 'F');
            
            const lines = doc.splitTextToSize(innerText, contentWidth - 10);
            doc.text(lines, margin + 6, currentY + 4.8);
            currentY += lines.length * 4.8 + 3;
          } else if (tagName === 'UL' || tagName === 'OL') {
            const listItems = Array.from(el.querySelectorAll('li'));
            listItems.forEach((li, idx) => {
              const liText = decodeHtmlEntities(li.textContent || '').trim();
              if (liText) {
                const bulletSymbol = tagName === 'OL' ? `${idx + 1}. ` : '• ';
                const lines = doc.splitTextToSize(liText, contentWidth - 14);
                checkPageBreak(lines.length * 4.2 + 2);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
                doc.text(bulletSymbol, margin + 6, currentY + 4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
                doc.text(lines, margin + 12, currentY + 4);
                currentY += lines.length * 4.2 + 2;
              }
            });
            currentY += 2;
          } else if (tagName === 'BLOCKQUOTE') {
            const lines = doc.splitTextToSize(innerText, contentWidth - 16);
            checkPageBreak(lines.length * 4.5 + 6);

            doc.setFillColor(cardBgColor[0], cardBgColor[1], cardBgColor[2]);
            doc.rect(margin + 4, currentY, contentWidth - 8, lines.length * 4.5 + 4, 'F');

            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(margin + 4, currentY, 2, lines.length * 4.5 + 4, 'F');

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.text(lines, margin + 10, currentY + 4.5);
            currentY += lines.length * 4.5 + 7;
          } else {
            // Standard Paragraph / Div
            const lines = doc.splitTextToSize(innerText, contentWidth - 8);
            checkPageBreak(lines.length * 4.5 + 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
            doc.text(lines, margin + 4, currentY + 4);
            currentY += lines.length * 4.5 + 3.5;
          }
        }
      });
    } catch (e) {
      // Plain text fallback
      const cleanText = decodeHtmlEntities(htmlContent.replace(/<[^>]*>/g, ' ')).trim();
      const lines = doc.splitTextToSize(cleanText, contentWidth - 8);
      checkPageBreak(lines.length * 4.5 + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(lines, margin + 4, currentY + 4);
      currentY += lines.length * 4.5 + 4;
    }
  };

  // 4. Complete Application Description HTML
  drawSectionHeader('2. COMPLETE APPLICATION DESCRIPTION & OVERVIEW');
  renderHtmlContent(app.description_html);
  currentY += 4;

  // 5. App Features List HTML (if available)
  if (app.features_html && app.features_html.trim()) {
    drawSectionHeader('3. KEY APP FEATURES & HIGHLIGHTS');
    renderHtmlContent(app.features_html);
    currentY += 4;
  }

  // 6. Frequently Asked Questions (FAQs)
  if (app.faqs && app.faqs.length > 0) {
    drawSectionHeader(`4. FREQUENTLY ASKED QUESTIONS (FAQS) - ${app.faqs.length} ITEMS`);
    app.faqs.forEach((faq, index) => {
      const qText = decodeHtmlEntities(faq.question || '').trim();
      const aText = decodeHtmlEntities(faq.answer || '').trim();

      const qLines = doc.splitTextToSize(`Q${index + 1}: ${qText}`, contentWidth - 12);
      const aLines = doc.splitTextToSize(aText, contentWidth - 12);
      const totalBoxHeight = qLines.length * 4.5 + aLines.length * 4.2 + 8;

      checkPageBreak(totalBoxHeight + 4);

      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(margin, currentY, contentWidth, totalBoxHeight, 1.5, 1.5, 'FD');

      // Question
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(qLines, margin + 4, currentY + 4.8);

      // Answer
      const answerStartY = currentY + qLines.length * 4.5 + 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(aLines, margin + 4, answerStartY);

      currentY += totalBoxHeight + 3.5;
    });
    currentY += 2;
  }

  // 7. Release Notes (if available)
  if (app.release_notes && app.release_notes.trim()) {
    drawSectionHeader("5. WHAT'S NEW / RELEASE NOTES");
    renderHtmlContent(app.release_notes);
    currentY += 4;
  }

  // 8. Search Engine Optimization (SEO) & Metadata (NO Canonical URL)
  drawSectionHeader('6. SEARCH ENGINE OPTIMIZATION (SEO) & METADATA');
  
  const drawBlockField = (label: string, value: string | undefined) => {
    const textVal = (value || '').trim() || 'Not Configured';
    const splitLines = doc.splitTextToSize(textVal, contentWidth - 8);
    const boxHeight = Math.max(10, splitLines.length * 4.2 + 8);

    checkPageBreak(boxHeight + 4);

    doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(label.toUpperCase(), margin + 4, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(splitLines, margin + 4, currentY + 9.5);

    currentY += boxHeight + 3.5;
  };

  drawBlockField('Google SEO Meta Title', app.seo_title || '');
  drawBlockField('Google SEO Meta Description', app.seo_description || '');
  
  if (app.seo_keywords) {
    drawBlockField('SEO Keywords & Meta Tags', app.seo_keywords);
  }

  // 9. Compliance & Safety Callout Notices
  if (app.red_box_msg || app.yellow_box_msg || app.idea_box_msg || app.custom_admin_box_html) {
    drawSectionHeader('7. COMPLIANCE & SAFETY CALLOUT NOTICES');
    if (app.red_box_msg) {
      drawBlockField('Critical Red Alert Notice (Security / Caution)', app.red_box_msg);
    }
    if (app.yellow_box_msg) {
      drawBlockField('Advisory Yellow Box Notice (Important Notice)', app.yellow_box_msg);
    }
    if (app.idea_box_msg) {
      drawBlockField('Information & Idea Box Notice (Tips)', app.idea_box_msg);
    }
    if (app.custom_admin_box_html) {
      drawBlockField(app.custom_admin_box_heading || 'Custom Administration Notice', decodeHtmlEntities(app.custom_admin_box_html.replace(/<[^>]*>/g, ' ')).trim());
    }
  }

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text('INTERNAL ADMIN APP SPEC SHEET', margin, pageHeight - 6.5);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Trigger browser download
  const cleanFilename = (app.slug || app.name || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  doc.save(`${cleanFilename}_complete_report.pdf`);
}
