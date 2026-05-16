/**
 * Run once: node src/scripts/generateSampleData.js
 * Creates sample Excel files in server/sample-data/
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '../../sample-data');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─── Delivery File ────────────────────────────────────────────────────────────

const piList = ['PI-1', 'PI-2', 'PI-3', 'PI-4'];
const commitmentRows = [];
const flowRows = [];

for (const pi of piList) {
  const count = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const committed = Math.random() > 0.3 ? 'Committed' : 'Not Committed';
    const done = Math.random() > 0.25 ? 'Done' : 'In Progress';
    commitmentRows.push({ PI: pi, Feature: `Feature-${pi}-${i}`, Commitment: committed, Status: done });
  }

  const flowCount = 25 + Math.floor(Math.random() * 15);
  const baseDate = new Date(2024, 0, 1);
  for (let i = 0; i < flowCount; i++) {
    const start = new Date(baseDate.getTime() + Math.random() * 60 * 86400000);
    const dur = 5 + Math.floor(Math.random() * 20);
    const end = new Date(start.getTime() + dur * 86400000);
    const status = Math.random() > 0.2 ? 'Done' : Math.random() > 0.5 ? 'In Progress' : 'To Do';
    flowRows.push({
      PI: pi,
      Item: `Story-${pi}-${i}`,
      Status: status,
      StartDate: start.toISOString().split('T')[0],
      EndDate: status === 'Done' ? end.toISOString().split('T')[0] : null,
    });
  }
}

const deliveryWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(deliveryWb, XLSX.utils.json_to_sheet(commitmentRows), 'Commitment Summary');
XLSX.utils.book_append_sheet(deliveryWb, XLSX.utils.json_to_sheet(flowRows), 'FLOW');
XLSX.writeFile(deliveryWb, path.join(OUT, 'delivery.xlsx'));

// ─── QA Bug File ─────────────────────────────────────────────────────────────

const squads = ['Alpha', 'Beta', 'Gamma'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const bugRows = [];

for (const pi of piList) {
  for (const squad of squads) {
    const bugCount = 15 + Math.floor(Math.random() * 20);
    for (let i = 0; i < bugCount; i++) {
      const reopen = Math.random() > 0.85 ? 1 : 0;
      const resolution = Math.random() > 0.9 ? 'As Designed' : 'Fixed';
      bugRows.push({
        PI: pi,
        Squad: squad,
        Bug: `BUG-${pi}-${squad}-${i}`,
        Priority: priorities[Math.floor(Math.random() * priorities.length)],
        Status: Math.random() > 0.2 ? 'Closed' : 'Open',
        Resolution: resolution,
        'Reopen Count': reopen,
        Velocity: 30,
      });
    }
  }
}

const bugWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bugWb, XLSX.utils.json_to_sheet(bugRows), 'Bug Data');
XLSX.writeFile(bugWb, path.join(OUT, 'qa_bugs.xlsx'));

// ─── QA Escaping Defect File ─────────────────────────────────────────────────

const escapingRows = [];
for (const pi of piList) {
  const count = 3 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    escapingRows.push({
      PI: pi,
      Bug: `ESC-${pi}-${i}`,
      Priority: Math.random() > 0.5 ? 'Critical' : 'High',
      Squad: squads[Math.floor(Math.random() * squads.length)],
    });
  }
}

const escapingWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(escapingWb, XLSX.utils.json_to_sheet(escapingRows), 'Escaping Defect');
XLSX.writeFile(escapingWb, path.join(OUT, 'qa_escaping.xlsx'));

console.log('Sample data written to', OUT);
