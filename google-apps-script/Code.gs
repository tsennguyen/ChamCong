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
 * Xử lý check-in: ghi vào sheet tháng
 */
function handleCheckin(data, ss) {
  const targetSs = ss || getSpreadsheet();
  const monthTab = getOrCreateMonthSheet(targetSs, data.date);
  const today = Utilities.formatDate(new Date(data.date), 'Asia/Ho_Chi_Minh', 'dd');

  // Tìm hoặc thêm hàng cho giáo viên
  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  // Tìm cột cho ngày (mỗi ngày có 2 cột: IN và OUT)
  const dayCol = findOrCreateDayColumn(monthTab, parseInt(today, 10));

  // Ghi check-in time
  monthTab.getRange(teacherRow, dayCol).setValue(data.check_in_time);

  return { success: true, message: 'Check-in synced', row: teacherRow, col: dayCol };
}

/**
 * Xử lý check-out: cập nhật sheet tháng
 */
function handleCheckout(data, ss) {
  const targetSs = ss || getSpreadsheet();
  const monthTab = getOrCreateMonthSheet(targetSs, data.date);
  const today = Utilities.formatDate(new Date(data.date), 'Asia/Ho_Chi_Minh', 'dd');

  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  const dayCol = findOrCreateDayColumn(monthTab, parseInt(today, 10));

  // Ghi check-out time (cột OUT = dayCol + 1)
  monthTab.getRange(teacherRow, dayCol + 1).setValue(data.check_out_time);

  return { success: true, message: 'Check-out synced', row: teacherRow, col: dayCol + 1 };
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
 * Tạo hoặc lấy sheet tháng (VD: "Tháng 09/2026")
 */
function getOrCreateMonthSheet(ss, dateStr) {
  const date = new Date(dateStr);
  const month = Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'MM');
  const year = Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'yyyy');
  const sheetName = 'Tháng ' + month + '/' + year;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupMonthSheet(sheet, parseInt(month, 10), parseInt(year, 10));
  }
  return sheet;
}

/**
 * Cấu hình sheet tháng mới
 */
function setupMonthSheet(sheet, month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();

  sheet.getRange(1, 1).setValue('STT');
  sheet.getRange(1, 2).setValue('Giáo viên');

  for (let day = 1; day <= daysInMonth; day++) {
    const col = 3 + (day - 1) * 2;
    sheet.getRange(1, col, 1, 2).merge().setValue('Ngày ' + day);
    sheet.getRange(2, col).setValue('IN');
    sheet.getRange(2, col + 1).setValue('OUT');
  }

  const summaryCol = 3 + daysInMonth * 2;
  sheet.getRange(1, summaryCol).setValue('Tổng ngày làm');
  sheet.getRange(1, summaryCol + 1).setValue('Tổng trễ (phút)');
  sheet.getRange(1, summaryCol + 2).setValue('Tổng TC (phút)');
  sheet.getRange(1, summaryCol + 3).setValue('Tiền TC');

  sheet.getRange(1, 1, 2, summaryCol + 3).setFontWeight('bold');
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);
}

/**
 * Tìm hàng của giáo viên hoặc tạo mới
 */
function findOrCreateTeacherRow(sheet, teacherName) {
  const lastRow = Math.max(sheet.getLastRow(), 2);
  if (lastRow > 2) {
    const names = sheet.getRange(3, 2, lastRow - 2, 1).getValues();
    for (let i = 0; i < names.length; i++) {
      if (names[i][0] === teacherName) {
        return i + 3;
      }
    }
  }

  const newRow = lastRow + 1;
  sheet.getRange(newRow, 1).setValue(newRow - 2); // STT
  sheet.getRange(newRow, 2).setValue(teacherName);
  return newRow;
}

/**
 * Tìm cột cho ngày (IN column)
 */
function findOrCreateDayColumn(sheet, day) {
  return 3 + (day - 1) * 2; // Col C + offset
}

/**
 * Lấy dữ liệu tháng từ sheet
 */
function getMonthData(month, year, ss) {
  const targetSs = ss || getSpreadsheet();
  const sheetName = 'Tháng ' + month + '/' + year;
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
