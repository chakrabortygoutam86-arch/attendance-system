/**
 * Database Module - IndexedDB for Offline Storage
 * Student Attendance Management System
 */

const DB_NAME = 'AttendanceDB';
const DB_VERSION = 2; // Incremented to trigger schema update

// Database stores
const STORES = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  PENDING_OPS: 'pendingOperations',
  SETTINGS: 'settings'
};

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[DB] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[DB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Students store
        if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
          const studentStore = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
          studentStore.createIndex('name', 'name', { unique: false });
          studentStore.createIndex('course', 'course', { unique: false });
          studentStore.createIndex('batch', 'batch', { unique: false });
          console.log('[DB] Students store created');
        }

        // Attendance store
        if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
          const attendanceStore = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
          attendanceStore.createIndex('date', 'date', { unique: false });
          attendanceStore.createIndex('studentRef', 'studentRef', { unique: false });
          attendanceStore.createIndex('date_studentRef', ['date', 'studentRef'], { unique: false });
          console.log('[DB] Attendance store created');
        }

        // Pending operations store
        if (!db.objectStoreNames.contains(STORES.PENDING_OPS)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_OPS, { keyPath: 'id', autoIncrement: true });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[DB] Pending operations store created');
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          console.log('[DB] Settings store created');
        }
      };
    });
  }

  // ==================== STUDENTS ====================

  // Add or update student
  async saveStudent(student) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.STUDENTS], 'readwrite');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      // Add sync status
      student._syncStatus = 'pending';
      student._lastModified = new Date().toISOString();
      
      const request = store.put(student);

      request.onsuccess = () => {
        console.log('[DB] Student saved:', student.id);
        resolve(student);
      };

      request.onerror = () => {
        console.error('[DB] Failed to save student:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all students
  async getAllStudents() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.STUDENTS], 'readonly');
      const store = transaction.objectStore(STORES.STUDENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get student by ID
  async getStudentById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.STUDENTS], 'readonly');
      const store = transaction.objectStore(STORES.STUDENTS);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Delete student
  async deleteStudent(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.STUDENTS], 'readwrite');
      const store = transaction.objectStore(STORES.STUDENTS);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[DB] Student deleted:', id);
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Search students
  async searchStudents(query, course = '', batch = '') {
    const students = await this.getAllStudents();
    
    return students.filter(student => {
      const matchesQuery = !query || 
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.id.toLowerCase().includes(query.toLowerCase()) ||
        (student.studentId && student.studentId.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCourse = !course || student.course === course;
      const matchesBatch = !batch || student.batch === batch;
      
      return matchesQuery && matchesCourse && matchesBatch;
    });
  }

  // Get unique courses
  async getCourses() {
    const students = await this.getAllStudents();
    const courses = [...new Set(students.map(s => s.course))].filter(Boolean);
    return courses.sort();
  }

  // Get unique batches
  async getBatches() {
    const students = await this.getAllStudents();
    const batches = [...new Set(students.map(s => s.batch))].filter(Boolean);
    return batches.sort();
  }

  // ==================== ATTENDANCE ====================

  // Save attendance record
  async saveAttendance(record) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORES.ATTENDANCE], 'readwrite');
        const store = transaction.objectStore(STORES.ATTENDANCE);
        
        // Generate unique ID using internal student reference
        const studentRef = record.studentRef || record.studentId || 'unknown';
        record.id = `${record.date}_${studentRef}`;
        record.studentRef = studentRef;
        record._syncStatus = 'pending';
        record._lastModified = new Date().toISOString();
        
        const request = store.put(record);

        request.onsuccess = () => {
          console.log('[DB] Attendance saved:', record.id);
          resolve(record);
        };

        request.onerror = () => {
          console.error('[DB] Failed to save attendance:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('[DB] Error in saveAttendance:', error);
        reject(error);
      }
    });
  }

  // Save multiple attendance records
  async saveAttendanceBatch(records) {
    const saved = [];
    for (const record of records) {
      try {
        const savedRecord = await this.saveAttendance(record);
        saved.push(savedRecord);
      } catch (error) {
        console.error('[DB] Failed to save attendance record:', error);
      }
    }
    return saved;
  }

  // Get attendance by date
  async getAttendanceByDate(date) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTENDANCE], 'readonly');
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const index = store.index('date');
      const request = index.getAll(date);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get attendance by date range
  async getAttendanceByRange(startDate, endDate) {
    const allAttendance = await this.getAllAttendance();
    
    return allAttendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
    });
  }

  // Get all attendance
  async getAllAttendance() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTENDANCE], 'readonly');
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get attendance for student
  async getStudentAttendance(studentRef) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTENDANCE], 'readonly');
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const index = store.index('studentRef');
      const request = index.getAll(studentRef);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Delete attendance by date
  async deleteAttendanceByDate(date) {
    const attendance = await this.getAttendanceByDate(date);
    
    for (const record of attendance) {
      await this.deleteAttendance(record.id);
    }
    
    return attendance.length;
  }

  // Delete attendance record
  async deleteAttendance(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTENDANCE], 'readwrite');
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[DB] Attendance deleted:', id);
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Check if attendance exists for date
  async hasAttendanceForDate(date) {
    const attendance = await this.getAttendanceByDate(date);
    return attendance.length > 0;
  }

  // ==================== PENDING OPERATIONS ====================

  // Add pending operation
  async addPendingOperation(type, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PENDING_OPS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_OPS);
      
      const operation = {
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      const request = store.add(operation);

      request.onsuccess = () => {
        console.log('[DB] Pending operation added:', type);
        resolve({ ...operation, id: request.result });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get all pending operations
  async getPendingOperations() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PENDING_OPS], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_OPS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Delete pending operation
  async deletePendingOperation(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PENDING_OPS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_OPS);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[DB] Pending operation deleted:', id);
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Clear all pending operations
  async clearPendingOperations() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PENDING_OPS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_OPS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[DB] All pending operations cleared');
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ==================== SETTINGS ====================

  // Set setting
  async setSetting(key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get setting
  async getSetting(key, defaultValue = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : defaultValue);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ==================== SYNC STATUS ====================

  // Mark records as synced
  async markAsSynced(storeName, ids) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = ids.length;
      
      for (const id of ids) {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const record = request.result;
          if (record) {
            record._syncStatus = 'synced';
            record._syncedAt = new Date().toISOString();
            store.put(record);
          }
          completed++;
          if (completed === total) {
            resolve(true);
          }
        };
        
        request.onerror = () => {
          completed++;
          if (completed === total) {
            resolve(true);
          }
        };
      }
      
      if (total === 0) {
        resolve(true);
      }
    });
  }

  // Get pending sync count
  async getPendingSyncCount() {
    const students = await this.getAllStudents();
    const attendance = await this.getAllAttendance();
    const operations = await this.getPendingOperations();
    
    const pendingStudents = students.filter(s => s._syncStatus === 'pending').length;
    const pendingAttendance = attendance.filter(a => a._syncStatus === 'pending').length;
    
    return pendingStudents + pendingAttendance + operations.length;
  }

  // ==================== EXPORT/IMPORT ====================

  // Export all data
  async exportAllData() {
    const students = await this.getAllStudents();
    const attendance = await this.getAllAttendance();
    
    return {
      students,
      attendance,
      exportDate: new Date().toISOString()
    };
  }

  // Import data
  async importData(data) {
    // Import students
    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        await this.saveStudent(student);
      }
    }
    
    // Import attendance
    if (data.attendance && Array.isArray(data.attendance)) {
      for (const record of data.attendance) {
        await this.saveAttendance(record);
      }
    }
    
    return true;
  }

  // Clear all data
  async clearAllData() {
    const stores = [STORES.STUDENTS, STORES.ATTENDANCE, STORES.PENDING_OPS];
    
    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    }
    
    return true;
  }
}

// Create global database instance
const db = new Database();
