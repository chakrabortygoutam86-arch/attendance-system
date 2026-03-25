/**
 * API Module - Google Sheets Integration
 * Student Attendance Management System
 */

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyKqrOh_a8HFywS5lACGE2qMRvGIdq2pW_LAiEyvMDsS7CggTsFX0nfvEpvZI7E3FgBJw/exec';

class API {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[API] Device is online');
      this.triggerSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[API] Device is offline');
    });
  }

  // Check if online
  checkOnlineStatus() {
    this.isOnline = navigator.onLine;
    return this.isOnline;
  }

  // Make API request
  async request(action, data = {}) {
    // Check online status
    if (!this.checkOnlineStatus()) {
      throw new Error('Device is offline');
    }

    const url = `${APPS_SCRIPT_URL}?action=${action}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error('[API] Request failed:', error);
      throw error;
    }
  }

  // ==================== STUDENTS ====================

  // Add student to Google Sheets
  async addStudent(student) {
    return this.request('addStudent', student);
  }

  // Update student in Google Sheets
  async updateStudent(student) {
    return this.request('updateStudent', student);
  }

  // Delete student from Google Sheets
  async deleteStudent(studentId) {
    return this.request('deleteStudent', { id: studentId });
  }

  // Get all students from Google Sheets
  async getStudents() {
    return this.request('getStudents');
  }

  // ==================== ATTENDANCE ====================

  // Save attendance to Google Sheets
  async saveAttendance(date, attendance) {
    return this.request('saveAttendance', {
      date: date,
      attendance: attendance
    });
  }

  // Update single attendance record
  async updateAttendance(date, studentId, status) {
    return this.request('updateAttendance', {
      date: date,
      studentId: studentId,
      status: status
    });
  }

  // Delete attendance from Google Sheets
  async deleteAttendance(date) {
    return this.request('deleteAttendance', { date: date });
  }

  // Get attendance by date
  async getAttendanceByDate(date) {
    return this.request('getAttendanceByDate', { date: date });
  }

  // Get attendance by date range
  async getAttendanceByRange(startDate, endDate) {
    return this.request('getAttendanceByRange', {
      startDate: startDate,
      endDate: endDate
    });
  }

  // Get all attendance
  async getAllAttendance() {
    return this.request('getAttendance');
  }

  // ==================== SYNC ====================

  // Sync pending operations
  async syncPendingOperations() {
    if (this.syncInProgress) {
      console.log('[API] Sync already in progress');
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    console.log('[API] Starting sync...');

    try {
      // Get pending operations
      const pendingOps = await db.getPendingOperations();
      
      if (pendingOps.length === 0) {
        console.log('[API] No pending operations');
        this.syncInProgress = false;
        return { synced: 0, failed: 0 };
      }

      console.log(`[API] Found ${pendingOps.length} pending operations`);

      // Sync each operation
      const results = { synced: 0, failed: 0, errors: [] };

      for (const op of pendingOps) {
        try {
          let apiResult;
          
          switch (op.type) {
            case 'addStudent':
              apiResult = await this.addStudent(op.data);
              if (apiResult.success) {
                // Update local student with new ID if generated
                if (apiResult.id) {
                  const student = await db.getStudentById(op.data.id);
                  if (student) {
                    await db.deleteStudent(op.data.id);
                    student.id = apiResult.id;
                    await db.saveStudent(student);
                  }
                }
              }
              break;
              
            case 'updateStudent':
              apiResult = await this.updateStudent(op.data);
              break;
              
            case 'deleteStudent':
              apiResult = await this.deleteStudent(op.data.id);
              break;
              
            case 'saveAttendance':
              apiResult = await this.saveAttendance(op.data.date, op.data.records);
              break;
              
            default:
              console.warn('[API] Unknown operation type:', op.type);
              continue;
          }

          if (apiResult && apiResult.success) {
            // Delete pending operation
            await db.deletePendingOperation(op.id);
            results.synced++;
          } else {
            results.failed++;
            results.errors.push({ op: op.type, error: apiResult?.error || 'Unknown error' });
          }
        } catch (error) {
          console.error('[API] Sync operation failed:', error);
          results.failed++;
          results.errors.push({ op: op.type, error: error.message });
        }
      }

      // Also sync any pending local records
      await this.syncPendingRecords();

      console.log('[API] Sync completed:', results);
      this.syncInProgress = false;
      
      // Update last sync time
      await db.setSetting('lastSync', new Date().toISOString());
      
      return results;
    } catch (error) {
      console.error('[API] Sync failed:', error);
      this.syncInProgress = false;
      throw error;
    }
  }

  // Sync pending local records (students and attendance with pending status)
  async syncPendingRecords() {
    // Sync pending students
    const students = await db.getAllStudents();
    const pendingStudents = students.filter(s => s._syncStatus === 'pending');

    for (const student of pendingStudents) {
      try {
        let result;
        if (student.id.startsWith('TEMP_')) {
          // New student
          result = await this.addStudent(student);
          if (result.success && result.id) {
            await db.deleteStudent(student.id);
            student.id = result.id;
          }
        } else {
          // Updated student
          result = await this.updateStudent(student);
        }

        if (result.success) {
          student._syncStatus = 'synced';
          student._syncedAt = new Date().toISOString();
          await db.saveStudent(student);
        }
      } catch (error) {
        console.error('[API] Failed to sync student:', error);
      }
    }

    // Sync pending attendance
    const attendance = await db.getAllAttendance();
    const pendingAttendance = attendance.filter(a => a._syncStatus === 'pending');

    // Group by date
    const groupedByDate = {};
    for (const record of pendingAttendance) {
      if (!groupedByDate[record.date]) {
        groupedByDate[record.date] = [];
      }
      groupedByDate[record.date].push(record);
    }

    // Sync each date's attendance
    for (const [date, records] of Object.entries(groupedByDate)) {
      try {
        const attendanceData = records.map(r => ({
          studentId: r.studentId,
          name: r.name,
          course: r.course,
          batch: r.batch,
          status: r.status
        }));

        const result = await this.saveAttendance(date, attendanceData);
        
        if (result.success) {
          for (const record of records) {
            record._syncStatus = 'synced';
            record._syncedAt = new Date().toISOString();
            await db.saveAttendance(record);
          }
        }
      } catch (error) {
        console.error('[API] Failed to sync attendance:', error);
      }
    }
  }

  // Trigger sync
  async triggerSync() {
    if (!this.checkOnlineStatus()) {
      console.log('[API] Cannot sync - device is offline');
      return;
    }

    try {
      const result = await this.syncPendingOperations();
      
      // Update UI
      updateSyncStatus();
      
      if (result.synced > 0) {
        showToast(`${result.synced} items synced successfully`, 'success');
      }
      
      return result;
    } catch (error) {
      console.error('[API] Auto-sync failed:', error);
    }
  }

  // Full sync - download all data from server
  async fullSync() {
    if (!this.checkOnlineStatus()) {
      throw new Error('Cannot sync - device is offline');
    }

    try {
      console.log('[API] Starting full sync...');

      // Get all students from server
      const studentsResult = await this.getStudents();
      if (studentsResult.success && studentsResult.students) {
        // Save to local DB
        for (const student of studentsResult.students) {
          student._syncStatus = 'synced';
          student._syncedAt = new Date().toISOString();
          await db.saveStudent(student);
        }
      }

      // Get all attendance from server
      const attendanceResult = await this.getAllAttendance();
      if (attendanceResult.success && attendanceResult.attendance) {
        // Save to local DB
        for (const record of attendanceResult.attendance) {
          record._syncStatus = 'synced';
          record._syncedAt = new Date().toISOString();
          await db.saveAttendance(record);
        }
      }

      // Update last sync time
      await db.setSetting('lastSync', new Date().toISOString());

      console.log('[API] Full sync completed');
      return { success: true };
    } catch (error) {
      console.error('[API] Full sync failed:', error);
      throw error;
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const result = await this.request('test');
      return result.success;
    } catch (error) {
      console.error('[API] Connection test failed:', error);
      return false;
    }
  }
}

// Create global API instance
const api = new API();
