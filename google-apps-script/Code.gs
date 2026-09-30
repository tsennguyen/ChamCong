/**
 * Lumi Preschool - Google Apps Script
 * Hệ thống đồng bộ chấm công 2 chiều với Web App
 */

const SPREADSHEET_ID = '1cDB_bxLEjertoCi0X5Lef2r_GTLDv_uBOXGgLbbiVgk';

function getSpreadsheet(customId) {
  const id = customId || SPREADSHEET_ID;
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(id);
}

/**
 * Handle POST requests from Web App
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, data, spreadsheet_id } = payload;
    const ss = getSpreadsheet(spreadsheet_id);

    let result;

    switch (action) {
      case 'checkin':
        result = handleCheckin(data, ss);
        break;
      case 'checkout':
        result = handleCheckout(data, ss);
        break;
      case 'sync_day':
        result = handleSyncDay(data, ss);
        break;
      case 'sync_month':
        result = handleSyncMonth(data, ss);
        break;
      case 'repair':
        result = repairMonthSheet(data.month, data.year, ss);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for fetching data from Sheets)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'status';
    const ss = getSpreadsheet(e.parameter.spreadsheet_id);

    let result;

    switch (action) {
      case 'status':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;
      case 'get_month':
        result = getMonthData(e.parameter.month, e.parameter.year, ss);
        break;
      case 'get_teachers':
        result = getTeachersFromSheet(ss);
        break;
      case 'repair':
        result = repairMonthSheet(e.parameter.month, e.parameter.year, ss);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message,
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Format chuỗi thời gian gọn gàng HH:mm:ss
 */
function formatTimeString(timeStr) {
  if (!timeStr) return '';
  const s = String(timeStr).trim();
  if (s.includes('T')) {
    return Utilities.formatDate(new Date(s), 'Asia/Ho_Chi_Minh', 'HH:mm:ss');
  }
  return s;
}

/**
 * Đảm bảo cell (row, col) tồn tại trên sheet, tự động mở rộng nếu thiếu
 */
function ensureCellExists(sheet, row, col) {
  const maxRows = sheet.getMaxRows();
  if (row > maxRows) {
    sheet.insertRowsAfter(maxRows, Math.max(10, row - maxRows + 5));
  }
  const maxCols = sheet.getMaxColumns();
  if (col > maxCols) {
    sheet.insertColumnsAfter(maxCols, Math.max(10, col - maxCols + 5));
  }
}

/**
 * Xử lý check-in: ghi vào sheet tháng
 */
function handleCheckin(data, ss) {
  const targetSs = ss || getSpreadsheet();
  const monthTab = getOrCreateMonthSheet(targetSs, data.date);
  
  // Lấy ngày an toàn từ YYYY-MM-DD
  const dateParts = String(data.date).split('-');
  const day = parseInt(dateParts[2], 10);

  // Tìm hoặc thêm hàng cho giáo viên
  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  // Tìm cột cho ngày (mỗi ngày có 2 cột: IN và OUT)
  const dayCol = findOrCreateDayColumn(monthTab, day);

  ensureCellExists(monthTab, teacherRow, dayCol);

  // Ghi check-in time dưới dạng text
  const timeVal = formatTimeString(data.check_in_time);
  const cell = monthTab.getRange(teacherRow, dayCol);
  cell.setNumberFormat('@');
  cell.setValue(timeVal);

  return { success: true, message: 'Check-in synced', row: teacherRow, col: dayCol };
}

/**
 * Xử lý check-out: cập nhật sheet tháng
 */
function handleCheckout(data, ss) {
  const targetSs = ss || getSpreadsheet();
  const monthTab = getOrCreateMonthSheet(targetSs, data.date);
  
  const dateParts = String(data.date).split('-');
  const day = parseInt(dateParts[2], 10);

  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  const dayCol = findOrCreateDayColumn(monthTab, day);
  const checkoutCol = dayCol + 1;

  ensureCellExists(monthTab, teacherRow, checkoutCol);

  const timeVal = formatTimeString(data.check_out_time);
  const cell = monthTab.getRange(teacherRow, checkoutCol);
  cell.setNumberFormat('@');
  cell.setValue(timeVal);

  return { success: true, message: 'Check-out synced', row: teacherRow, col: checkoutCol };
}

/**
 * Đồng bộ toàn bộ record của 1 ngày
 */
function handleSyncDay(data, ss) {
  const targetSs = ss || getSpreadsheet();
  const records = data.records || [];
  let count = 0;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.check_in_time) {
      handleCheckin(rec, targetSs);
    }
    if (rec.check_out_time) {
      handleCheckout(rec, targetSs);
    }
    count++;
  }

  return { success: true, message: 'Synced day successfully', count: count };
}

/**
 * Đồng bộ danh sách records cả tháng
 */
function handleSyncMonth(data, ss) {
  return handleSyncDay(data, ss);
}

/**
 * Tạo hoặc lấy sheet tháng (VD: "Tháng 10/2026")
 */
function getOrCreateMonthSheet(ss, dateStr) {
  const parts = String(dateStr).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const monthStr = month < 10 ? '0' + month : '' + month;
  const sheetName = 'Tháng ' + monthStr + '/' + year;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupMonthSheet(sheet, month, year);
  } else {
    ensureMonthHeaders(sheet, month, year);
  }
  return sheet;
}

/**
 * Cấu hình sheet tháng mới đầy đủ 70 cột
 */
function setupMonthSheet(sheet, month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const summaryCol = 3 + daysInMonth * 2;
  const totalColsNeeded = summaryCol + 4; // 68 or 70 cols

  // Mở rộng đủ cột trước khi ghi dữ liệu
  if (sheet.getMaxColumns() < totalColsNeeded) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalColsNeeded - sheet.getMaxColumns() + 2);
  }
  // Đảm bảo đủ ít nhất 50 dòng
  if (sheet.getMaxRows() < 50) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 50 - sheet.getMaxRows());
  }

  ensureMonthHeaders(sheet, month, year);

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);
}

/**
 * Đảm bảo toàn bộ header các ngày trong tháng và tổng kết được điền đầy đủ
 */
function ensureMonthHeaders(sheet, month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const summaryCol = 3 + daysInMonth * 2;
  const totalColsNeeded = summaryCol + 4;

  if (sheet.getMaxColumns() < totalColsNeeded) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalColsNeeded - sheet.getMaxColumns() + 2);
  }

  sheet.getRange(1, 1).setValue('STT');
  sheet.getRange(1, 2).setValue('Giáo viên');

  for (let day = 1; day <= daysInMonth; day++) {
    const col = 3 + (day - 1) * 2;
    sheet.getRange(1, col, 1, 2).merge().setValue('Ngày ' + day);
    sheet.getRange(2, col).setValue('IN');
    sheet.getRange(2, col + 1).setValue('OUT');
  }

  sheet.getRange(1, summaryCol).setValue('Tổng ngày làm');
  sheet.getRange(1, summaryCol + 1).setValue('Tổng trễ (phút)');
  sheet.getRange(1, summaryCol + 2).setValue('Tổng TC (phút)');
  sheet.getRange(1, summaryCol + 3).setValue('Tiền TC');

  sheet.getRange(1, 1, 2, totalColsNeeded).setFontWeight('bold');
}

/**
 * Tìm hàng của giáo viên hoặc tạo mới
 */
function findOrCreateTeacherRow(sheet, teacherName) {
  const cleanName = String(teacherName || '').trim();
  const lastRow = Math.max(sheet.getLastRow(), 2);
  if (lastRow > 2) {
    const names = sheet.getRange(3, 2, lastRow - 2, 1).getValues();
    for (let i = 0; i < names.length; i++) {
      if (names[i][0] && String(names[i][0]).trim().toLowerCase() === cleanName.toLowerCase()) {
        return i + 3;
      }
    }
  }

  const newRow = lastRow + 1;
  ensureCellExists(sheet, newRow, 2);
  sheet.getRange(newRow, 1).setValue(newRow - 2); // STT
  sheet.getRange(newRow, 2).setValue(cleanName);
  return newRow;
}

/**
 * Tìm cột cho ngày (IN column)
 */
function findOrCreateDayColumn(sheet, day) {
  const col = 3 + (day - 1) * 2;
  ensureCellExists(sheet, 2, col + 1);
  return col;
}

/**
 * Sửa chữa sheet tháng
 */
function repairMonthSheet(month, year, ss) {
  const targetSs = ss || getSpreadsheet();
  const m = parseInt(month || '10', 10);
  const y = parseInt(year || '2026', 10);
  const mStr = m < 10 ? '0' + m : '' + m;
  const sheetName = 'Tháng ' + mStr + '/' + y;
  let sheet = targetSs.getSheetByName(sheetName);
  if (!sheet) {
    sheet = targetSs.insertSheet(sheetName);
  }
  setupMonthSheet(sheet, m, y);
  return { success: true, message: 'Repaired sheet ' + sheetName };
}

/**
 * Lấy dữ liệu tháng từ sheet
 */
function getMonthData(month, year, ss) {
  const targetSs = ss || getSpreadsheet();
  const m = parseInt(month || '10', 10);
  const y = parseInt(year || '2026', 10);
  const mStr = m < 10 ? '0' + m : '' + m;
  const sheetName = 'Tháng ' + mStr + '/' + y;
  const sheet = targetSs.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, message: 'Sheet not found: ' + sheetName };
  }

  const data = sheet.getDataRange().getValues();
  return { success: true, data: data };
}

/**
 * Lấy danh sách giáo viên từ sheet Master
 */
function getTeachersFromSheet(ss) {
  const targetSs = ss || getSpreadsheet();
  const sheet = targetSs.getSheetByName('Master') || targetSs.getSheets()[0];

  if (!sheet) {
    return { success: false, message: 'No sheet found' };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, teachers: [] };

  const headers = data[0];
  const teachers = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  return { success: true, teachers: teachers };
}
