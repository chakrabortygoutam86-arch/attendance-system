/**
 * Student Attendance Management System - Google Apps Script Backend
 * 
 * Sheet 1: Students
 * Columns: ID | StudentID | Name | Course | Batch | Contact
 * 
 * Sheet 2: Attendance
 * Columns: Date | StudentID | Name | Course | Batch | Status
 */

const SHEET_ID = '1V43ttQmbGROK3mW3bPlKrUI9xSAniqHDYHAw_Uh5JMU';

// CORS Headers for all responses
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setHeaders(getCorsHeaders());
}

// Main entry point for POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    
    switch(action) {
      case 'addStudent':
        result = addStudent(data);
        break;
      case 'updateStudent':
        result = updateStudent(data);
        break;
      case 'deleteStudent':
        result = deleteStudent(data);
        break;
      case 'getStudents':
        result = getStudents();
        break;
      case 'saveAttendance':
        result = saveAttendance(data);
        break;
      case 'updateAttendance':
        result = updateAttendance(data);
        break;
      case 'deleteAttendance':
        result = deleteAttendance(data);
        break;
      case 'getAttendance':
        result = getAttendance(data);
        break;
      case 'getAttendanceByDate':
        result = getAttendanceByDate(data);
        break;
      case 'getAttendanceByRange':
        result = getAttendanceByRange(data);
        break;
      case 'syncData':
        result = syncData(data);
        break;
      case 'bulkSync':
        result = bulkSync(data);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setHeaders(getCorsHeaders());
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setHeaders(getCorsHeaders());
  }
}

// Handle GET requests
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'getStudents':
        result = getStudents();
        break;
      case 'getAttendance':
        result = getAttendance({ date: e.parameter.date });
        break;
      case 'getAttendanceByDate':
        result = getAttendanceByDate({ date: e.parameter.date });
        break;
      case 'test':
        result = { success: true, message: 'API is working!' };
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setHeaders(getCorsHeaders());
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setHeaders(getCorsHeaders());
  }
}

// Get Students sheet
function getStudentsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Students');
  if (!sheet) {
    sheet = ss.insertSheet('Students');
    sheet.appendRow(['ID', 'StudentID', 'Name', 'Course', 'Batch', 'Contact']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  return sheet;
}

// Get Attendance sheet
function getAttendanceSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Attendance');
  if (!sheet) {
    sheet = ss.insertSheet('Attendance');
    sheet.appendRow(['Date', 'StudentID', 'Name', 'Course', 'Batch', 'Status']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  return sheet;
}

// Add a new student
function addStudent(data) {
  try {
    const sheet = getStudentsSheet();
    const id = 'STU_' + new Date().getTime();
    
    sheet.appendRow([
      id,
      data.studentId || '',
      data.name,
      data.course,
      data.batch,
      data.contact
    ]);
    
    return {
      success: true,
      id: id,
      message: 'Student added successfully'
    };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Update student
function updateStudent(data) {
  try {
    const sheet = getStudentsSheet();
    const data_range = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data_range.length; i++) {
      if (data_range[i][0] === data.id) {
        sheet.getRange(i + 1, 2).setValue(data.studentId || data_range[i][1]);
        sheet.getRange(i + 1, 3).setValue(data.name);
        sheet.getRange(i + 1, 4).setValue(data.course);
        sheet.getRange(i + 1, 5).setValue(data.batch);
        sheet.getRange(i + 1, 6).setValue(data.contact);
        return { success: true, message: 'Student updated successfully' };
      }
    }
    
    return { success: false, error: 'Student not found' };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Delete student
function deleteStudent(data) {
  try {
    const sheet = getStudentsSheet();
    const data_range = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data_range.length; i++) {
      if (data_range[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Student deleted successfully' };
      }
    }
    
    return { success: false, error: 'Student not found' };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Get all students
function getStudents() {
  try {
    const sheet = getStudentsSheet();
    const data = sheet.getDataRange().getValues();
    
    const students = [];
    for (let i = 1; i < data.length; i++) {
      students.push({
        id: data[i][0],
        studentId: data[i][1],
        name: data[i][2],
        course: data[i][3],
        batch: data[i][4],
        contact: data[i][5]
      });
    }
    
    return { success: true, students: students };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Save attendance
function saveAttendance(data) {
  try {
    const sheet = getAttendanceSheet();
    const date = data.date;
    const attendanceList = data.attendance;
    
    // Check for existing attendance on this date
    const existingData = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === date) {
        rowsToDelete.push(i + 1);
      }
    }
    
    // Delete existing rows in reverse order
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
    
    // Add new attendance records
    for (const record of attendanceList) {
      sheet.appendRow([
        date,
        record.studentId,
        record.name,
        record.course,
        record.batch,
        record.status
      ]);
    }
    
    return {
      success: true,
      message: 'Attendance saved successfully',
      count: attendanceList.length
    };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Update single attendance record
function updateAttendance(data) {
  try {
    const sheet = getAttendanceSheet();
    const data_range = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data_range.length; i++) {
      if (data_range[i][0] === data.date && data_range[i][1] === data.studentId) {
        sheet.getRange(i + 1, 6).setValue(data.status);
        return { success: true, message: 'Attendance updated successfully' };
      }
    }
    
    return { success: false, error: 'Attendance record not found' };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Delete attendance
function deleteAttendance(data) {
  try {
    const sheet = getAttendanceSheet();
    const data_range = sheet.getDataRange().getValues();
    
    const rowsToDelete = [];
    for (let i = 1; i < data_range.length; i++) {
      if (data_range[i][0] === data.date) {
        rowsToDelete.push(i + 1);
      }
    }
    
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
    
    return { success: true, message: 'Attendance deleted successfully' };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Get attendance by date
function getAttendanceByDate(data) {
  try {
    const sheet = getAttendanceSheet();
    const data_range = sheet.getDataRange().getValues();
    
    const attendance = [];
    for (let i = 1; i < data_range.length; i++) {
      if (data_range[i][0] === data.date) {
        attendance.push({
          date: data_range[i][0],
          studentId: data_range[i][1],
          name: data_range[i][2],
          course: data_range[i][3],
          batch: data_range[i][4],
          status: data_range[i][5]
        });
      }
    }
    
    return { success: true, attendance: attendance };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Get attendance by date range
function getAttendanceByRange(data) {
  try {
    const sheet = getAttendanceSheet();
    const data_range = sheet.getDataRange().getValues();
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    const attendance = [];
    for (let i = 1; i < data_range.length; i++) {
      const recordDate = new Date(data_range[i][0]);
      if (recordDate >= startDate && recordDate <= endDate) {
        attendance.push({
          date: data_range[i][0],
          studentId: data_range[i][1],
          name: data_range[i][2],
          course: data_range[i][3],
          batch: data_range[i][4],
          status: data_range[i][5]
        });
      }
    }
    
    return { success: true, attendance: attendance };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Get all attendance
function getAttendance(data) {
  try {
    const sheet = getAttendanceSheet();
    const data_range = sheet.getDataRange().getValues();
    
    const attendance = [];
    for (let i = 1; i < data_range.length; i++) {
      attendance.push({
        date: data_range[i][0],
        studentId: data_range[i][1],
        name: data_range[i][2],
        course: data_range[i][3],
        batch: data_range[i][4],
        status: data_range[i][5]
      });
    }
    
    return { success: true, attendance: attendance };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Sync data from local storage
function syncData(data) {
  try {
    const results = {
      students: { added: 0, updated: 0, failed: 0 },
      attendance: { added: 0, failed: 0 }
    };
    
    // Sync students
    if (data.students && data.students.length > 0) {
      for (const student of data.students) {
        const result = student.id ? updateStudent(student) : addStudent(student);
        if (result.success) {
          if (student.id) results.students.updated++;
          else results.students.added++;
        } else {
          results.students.failed++;
        }
      }
    }
    
    // Sync attendance
    if (data.attendance && data.attendance.length > 0) {
      for (const record of data.attendance) {
        const result = saveAttendance({
          date: record.date,
          attendance: record.records
        });
        if (result.success) results.attendance.added++;
        else results.attendance.failed++;
      }
    }
    
    return { success: true, results: results };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// Bulk sync for offline data
function bulkSync(data) {
  try {
    const results = {
      success: true,
      synced: [],
      failed: []
    };
    
    // Process each pending operation
    if (data.operations && data.operations.length > 0) {
      for (const op of data.operations) {
        let result;
        switch(op.type) {
          case 'addStudent':
            result = addStudent(op.data);
            break;
          case 'updateStudent':
            result = updateStudent(op.data);
            break;
          case 'deleteStudent':
            result = deleteStudent(op.data);
            break;
          case 'saveAttendance':
            result = saveAttendance(op.data);
            break;
          default:
            result = { success: false, error: 'Unknown operation type' };
        }
        
        if (result.success) {
          results.synced.push(op.id);
        } else {
          results.failed.push({ id: op.id, error: result.error });
        }
      }
    }
    
    return results;
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}
