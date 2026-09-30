/**
 * Lumi Preschool - Google Apps Script
 * Hệ thống đồng bộ chấm công 2 chiều với Web App
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/**
 * Handle POST requests from Web App
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, data } = payload;

    let result;

    switch (action) {
      case 'checkin':
        result = handleCheckin(data);
        break;
      case 'checkout':
        result = handleCheckout(data);
        break;
      case 'sync_day':
        result = handleSyncDay(data);
        break;
      case 'sync_month':
        result = handleSyncMonth(data);
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

    let result;

    switch (action) {
      case 'status':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;
      case 'get_month':
        result = getMonthData(e.parameter.month, e.parameter.year);
        break;
      case 'get_teachers':
        result = getTeachersFromSheet();
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
 * Xử lý check-in: ghi vào sheet ngày + sheet tháng
 */
function handleCheckin(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const monthTab = getOrCreateMonthSheet(ss, data.date);
  const today = Utilities.formatDate(new Date(data.date), 'Asia/Ho_Chi_Minh', 'dd');

  // Tìm hoặc thêm hàng cho giáo viên
  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  // Tìm cột cho ngày (mỗi ngày có 2 cột: IN và OUT)
  const dayCol = findOrCreateDayColumn(monthTab, parseInt(today));

  // Ghi check-in time
  monthTab.getRange(teacherRow, dayCol).setValue(data.check_in_time);

  // Ghi trễ vào cột ghi chú nếu có
  if (data.late_minutes > 0) {
    const noteCol = findNoteColumn(monthTab, parseInt(today), 'in');
    if (noteCol) {
      monthTab.getRange(teacherRow, noteCol).setValue('Trễ ' + data.late_minutes + 'p');
    }
  }

  return { success: true, message: 'Check-in synced' };
}

/**
 * Xử lý check-out: cập nhật sheet tháng
 */
function handleCheckout(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const monthTab = getOrCreateMonthSheet(ss, data.date);
  const today = Utilities.formatDate(new Date(data.date), 'Asia/Ho_Chi_Minh', 'dd');

  const teacherRow = findOrCreateTeacherRow(monthTab, data.teacher_name);
  const dayCol = findOrCreateDayColumn(monthTab, parseInt(today));

  // Ghi check-out time (cột OUT = dayCol + 1)
  monthTab.getRange(teacherRow, dayCol + 1).setValue(data.check_out_time);

  // Ghi tăng ca
  if (data.overtime_minutes > 0) {
    const noteCol = findNoteColumn(monthTab, parseInt(today), 'out');
    if (noteCol) {
      monthTab.getRange(teacherRow, noteCol).setValue(
        'TC ' + data.overtime_minutes + 'p (' + data.overtime_amount + 'đ)'
      );
    }
  }

  return { success: true, message: 'Check-out synced' };
}

/**
 * Tạo hoặc lấy sheet tháng (VD: "Tháng 09/2026")
 */
function getOrCreateMonthSheet(ss, dateStr) {
  const date = new Date(dateStr);
  const month = Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'MM');
  const year = Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'yyyy');
  const sheetName = 'Th\u00e1ng ' + month + '/' + year;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupMonthSheet(sheet, parseInt(month), parseInt(year));
  }
  return sheet;
}

/**
 * Cấu hình sheet tháng mới
 */
function setupMonthSheet(sheet, month, year) {
  // Header row 1: Ngày 1, 2, 3, ...
  // Header row 2: IN, OUT, IN, OUT, ...
  const daysInMonth = new Date(year, month, 0).getDate();

  // Cột A: STT, Cột B: Giáo viên, Cột C trở đi: Ngày
  sheet.getRange(1, 1).setValue('STT');
  sheet.getRange(1, 2).setValue('Giáo viên');

  for (let day = 1; day <= daysInMonth; day++) {
    const col = 3 + (day - 1) * 2;
    sheet.getRange(1, col, 1, 2).merge().setValue('Ngày ' + day);
    sheet.getRange(2, col).setValue('IN');
    sheet.getRange(2, col + 1).setValue('OUT');
  }

  // Cột tổng hợp cuối tháng
  const summaryCol = 3 + daysInMonth * 2;
  sheet.getRange(1, summaryCol).setValue('Tổng ngày làm');
  sheet.getRange(1, summaryCol + 1).setValue('Tổng trễ (phút)');
  sheet.getRange(1, summaryCol + 2).setValue('Tổng TC (phút)');
  sheet.getRange(1, summaryCol + 3).setValue('Tiền TC');

  // Format header
  sheet.getRange(1, 1, 2, summaryCol + 3).setFontWeight('bold');
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);
}

/**
 * Tìm hàng của giáo viên hoặc tạo mới
 */
function findOrCreateTeacherRow(sheet, teacherName) {
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const names = sheet.getRange(3, 2, Math.max(lastRow - 2, 1), 1).getValues();

  for (let i = 0; i < names.length; i++) {
    if (names[i][0] === teacherName) {
      return i + 3;
    }
  }

  // Thêm giáo viên mới
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
 * Tìm cột ghi chú
 */
function findNoteColumn(sheet, day, type) {
  // Simplified: notes are stored alongside IN/OUT
  return null; // TODO: implement if needed
}

/**
 * Lấy dữ liệu tháng từ sheet
 */
function getMonthData(month, year) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = 'Th\u00e1ng ' + month + '/' + year;
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, message: 'Sheet not found: ' + sheetName };
  }

  const data = sheet.getDataRange().getValues();
  return { success: true, data: data };
}

/**
 * Lấy danh sách giáo viên từ sheet Master
 */
function getTeachersFromSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Master');

  if (!sheet) {
    return { success: false, message: 'Master sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
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
