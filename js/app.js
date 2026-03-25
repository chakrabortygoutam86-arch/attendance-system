/**
 * Main Application Module
 * Student Attendance Management System
 */

// ==================== INITIALIZATION ====================

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Initializing...');
  
  try {
    // Clear old database if version changed (for development)
    await clearOldDatabase();
    
    // Initialize database
    await db.init();
    console.log('[App] Database initialized');
    
    // Register service worker
    await registerServiceWorker();
    
    // Load initial data
    await loadInitialData();
    
    // Initialize page-specific functionality
    initPage();
    
    // Update sync status
    updateSyncStatus();
    
    console.log('[App] Initialization complete');
  } catch (error) {
    console.error('[App] Initialization failed:', error);
    showToast('Failed to initialize app: ' + error.message, 'error');
  }
});

// Clear old database version to force schema update
async function clearOldDatabase() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase('AttendanceDB');
      request.onsuccess = () => {
        console.log('[App] Old database cleared');
        resolve();
      };
      request.onerror = () => {
        console.log('[App] No old database to clear');
        resolve();
      };
      request.onblocked = () => {
        console.log('[App] Database clear blocked');
        resolve();
      };
    } catch (e) {
      resolve();
    }
  });
}

// Register service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('service-worker.js');
      console.log('[App] Service Worker registered:', registration);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_REQUEST') {
          api.triggerSync();
        }
      });
      
      return registration;
    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  }
}

// Load initial data from server or local storage
async function loadInitialData() {
  const lastSync = await db.getSetting('lastSync');
  const isOnline = navigator.onLine;
  
  if (isOnline) {
    try {
      // Try to sync with server
      showLoading('Syncing data...');
      await api.fullSync();
      hideLoading();
    } catch (error) {
      hideLoading();
      console.log('[App] Using local data');
    }
  }
}

// Initialize page-specific functionality
function initPage() {
  const page = document.body.dataset.page;
  
  switch(page) {
    case 'dashboard':
      initDashboard();
      break;
    case 'students':
      initStudents();
      break;
    case 'attendance':
      initAttendance();
      break;
    case 'reports':
      initReports();
      break;
  }
}

// ==================== DASHBOARD ====================

async function initDashboard() {
  console.log('[App] Initializing dashboard...');
  
  // Load statistics
  await loadDashboardStats();
  
  // Set up refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadDashboardStats);
  }
  
  // Set up sync button
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      showLoading('Syncing...');
      try {
        await api.triggerSync();
        await loadDashboardStats();
        showToast('Sync completed', 'success');
      } catch (error) {
        showToast('Sync failed', 'error');
      }
      hideLoading();
    });
  }
}

async function loadDashboardStats() {
  try {
    // Get all students
    const students = await db.getAllStudents();
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await db.getAttendanceByDate(today);
    
    // Calculate stats
    const totalStudents = students.length;
    const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'Absent').length;
    const notMarked = totalStudents - todayAttendance.length;
    
    // Calculate attendance percentage
    const attendancePercentage = totalStudents > 0 
      ? Math.round((presentToday / totalStudents) * 100) 
      : 0;
    
    // Update UI
    updateStatValue('total-students', totalStudents);
    updateStatValue('present-today', presentToday);
    updateStatValue('absent-today', absentToday);
    updateStatValue('attendance-percentage', attendancePercentage + '%');
    
    // Load recent attendance
    await loadRecentAttendance();
    
  } catch (error) {
    console.error('[App] Failed to load dashboard stats:', error);
  }
}

function updateStatValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = value;
  }
}

async function loadRecentAttendance() {
  const container = document.getElementById('recent-attendance');
  if (!container) return;
  
  // Get last 7 days of attendance
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const attendance = await db.getAttendanceByRange(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
  
  if (attendance.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-day"></i>
        <h3>No Recent Attendance</h3>
        <p>Start taking attendance to see records here</p>
      </div>
    `;
    return;
  }
  
  // Group by date
  const grouped = {};
  attendance.forEach(record => {
    if (!grouped[record.date]) {
      grouped[record.date] = { present: 0, absent: 0 };
    }
    if (record.status === 'Present') {
      grouped[record.date].present++;
    } else {
      grouped[record.date].absent++;
    }
  });
  
  // Render
  const dates = Object.keys(grouped).sort().reverse().slice(0, 5);
  
  container.innerHTML = dates.map(date => {
    const stats = grouped[date];
    const total = stats.present + stats.absent;
    const percentage = total > 0 ? Math.round((stats.present / total) * 100) : 0;
    
    return `
      <div class="attendance-item ${percentage >= 75 ? 'present' : 'absent'}">
        <div class="attendance-info">
          <div class="attendance-name">${formatDate(date)}</div>
          <div class="attendance-meta">
            <span class="badge badge-success">${stats.present} Present</span>
            <span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color);">${stats.absent} Absent</span>
          </div>
        </div>
        <div class="attendance-status">
          <span class="stat-value" style="font-size: 1.25rem;">${percentage}%</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== STUDENTS ====================

async function initStudents() {
  console.log('[App] Initializing students page...');
  
  // Load students
  await loadStudents();
  
  // Load filter options
  await loadFilterOptions();
  
  // Set up event listeners
  setupStudentEventListeners();
}

async function loadStudents() {
  const container = document.getElementById('students-list');
  if (!container) return;
  
  const searchQuery = document.getElementById('search-input')?.value || '';
  const courseFilter = document.getElementById('course-filter')?.value || '';
  const batchFilter = document.getElementById('batch-filter')?.value || '';
  
  try {
    const students = await db.searchStudents(searchQuery, courseFilter, batchFilter);
    
    if (students.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Students Found</h3>
          <p>Add students to get started</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = students.map(student => `
      <div class="list-item" data-id="${student.id}">
        <div class="list-item-content">
          <div class="list-item-title">${student.name}</div>
          <div class="list-item-subtitle">
            <span class="badge badge-primary" title="Student ID"><i class="fas fa-id-card"></i> ${student.studentId || 'N/A'}</span>
            <span class="badge">${student.course}</span>
            <span class="badge">${student.batch}</span>
            ${student.contact ? `<span><i class="fas fa-phone"></i> ${student.contact}</span>` : ''}
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-icon btn-sm btn-secondary" onclick="editStudent('${student.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-icon btn-sm btn-danger" onclick="deleteStudent('${student.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('[App] Failed to load students:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Students</h3>
        <p>Please try again</p>
      </div>
    `;
  }
}

async function loadFilterOptions() {
  const courseSelect = document.getElementById('course-filter');
  const batchSelect = document.getElementById('batch-filter');
  
  if (courseSelect) {
    const courses = await db.getCourses();
    courseSelect.innerHTML = `
      <option value="">All Courses</option>
      ${courses.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
  }
  
  if (batchSelect) {
    const batches = await db.getBatches();
    batchSelect.innerHTML = `
      <option value="">All Batches</option>
      ${batches.map(b => `<option value="${b}">${b}</option>`).join('')}
    `;
  }
}

function setupStudentEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => loadStudents(), 300));
  }
  
  // Filters
  const courseFilter = document.getElementById('course-filter');
  const batchFilter = document.getElementById('batch-filter');
  
  if (courseFilter) {
    courseFilter.addEventListener('change', () => loadStudents());
  }
  
  if (batchFilter) {
    batchFilter.addEventListener('change', () => loadStudents());
  }
  
  // Add student button
  const addBtn = document.getElementById('add-student-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => showStudentModal());
  }
  
  // Export button
  const exportBtn = document.getElementById('export-students-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportStudents);
  }
}

function showStudentModal(student = null) {
  const isEdit = !!student;
  
  const content = `
    <form id="student-form">
      <input type="hidden" id="student-id" value="${student?.id || ''}">
      <div class="form-group">
        <label class="form-label">Student ID / Roll Number *</label>
        <input type="text" class="form-input" id="student-studentId" value="${student?.studentId || ''}" required placeholder="e.g., ROLL001" ${isEdit ? 'readonly' : ''}>
        ${isEdit ? '<small style="color: var(--gray-500);">Student ID cannot be changed after creation</small>' : '<small style="color: var(--gray-500);">Enter a unique ID for this student</small>'}
      </div>
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input type="text" class="form-input" id="student-name" value="${student?.name || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Course *</label>
        <input type="text" class="form-input" id="student-course" value="${student?.course || ''}" required placeholder="e.g., Computer Science">
      </div>
      <div class="form-group">
        <label class="form-label">Batch *</label>
        <input type="text" class="form-input" id="student-batch" value="${student?.batch || ''}" required placeholder="e.g., 2024-A">
      </div>
      <div class="form-group">
        <label class="form-label">Contact Number</label>
        <input type="tel" class="form-input" id="student-contact" value="${student?.contact || ''}" placeholder="e.g., +1234567890">
      </div>
    </form>
  `;
  
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveStudent()">
      <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'}
    </button>
  `;
  
  showModal({
    title: isEdit ? 'Edit Student' : 'Add Student',
    content: content,
    footer: footer
  });
}

async function saveStudent() {
  const form = document.getElementById('student-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const id = document.getElementById('student-id').value;
  const studentId = document.getElementById('student-studentId').value.trim().toUpperCase();
  const name = document.getElementById('student-name').value.trim();
  const course = document.getElementById('student-course').value.trim();
  const batch = document.getElementById('student-batch').value.trim();
  const contact = document.getElementById('student-contact').value.trim();
  
  // Check if studentId already exists (for new students)
  if (!id) {
    const existingStudents = await db.getAllStudents();
    const exists = existingStudents.find(s => s.studentId === studentId);
    if (exists) {
      showToast('Student ID already exists. Please use a unique ID.', 'error');
      return;
    }
  }
  
  const student = {
    id: id || `STU_${Date.now()}`,
    studentId,
    name,
    course,
    batch,
    contact
  };
  
  try {
    showLoading('Saving...');
    
    // Save to local DB
    await db.saveStudent(student);
    
    // Add to pending operations if online
    if (navigator.onLine) {
      try {
        if (id) {
          await api.updateStudent(student);
        } else {
          const result = await api.addStudent(student);
          if (result.id) {
            await db.deleteStudent(student.id);
            student.id = result.id;
            await db.saveStudent(student);
          }
        }
      } catch (error) {
        // Add to pending operations
        await db.addPendingOperation(id ? 'updateStudent' : 'addStudent', student);
      }
    } else {
      // Add to pending operations
      await db.addPendingOperation(id ? 'updateStudent' : 'addStudent', student);
    }
    
    closeModal();
    await loadStudents();
    updateSyncStatus();
    showToast('Student saved successfully', 'success');
    
  } catch (error) {
    console.error('[App] Failed to save student:', error);
    showToast('Failed to save student: ' + (error.message || 'Unknown error'), 'error');
  } finally {
    hideLoading();
  }
}

async function editStudent(id) {
  const student = await db.getStudentById(id);
  if (student) {
    showStudentModal(student);
  }
}

async function deleteStudent(id) {
  confirmDialog('Are you sure you want to delete this student?', async () => {
    try {
      showLoading('Deleting...');
      
      // Delete from local DB
      await db.deleteStudent(id);
      
      // Add to pending operations
      if (navigator.onLine) {
        try {
          await api.deleteStudent(id);
        } catch (error) {
          await db.addPendingOperation('deleteStudent', { id });
        }
      } else {
        await db.addPendingOperation('deleteStudent', { id });
      }
      
      await loadStudents();
      updateSyncStatus();
      showToast('Student deleted successfully', 'success');
      
    } catch (error) {
      console.error('[App] Failed to delete student:', error);
      showToast('Failed to delete student', 'error');
    } finally {
      hideLoading();
    }
  });
}

async function exportStudents() {
  const students = await db.getAllStudents();
  exportToCSV(students, `students_${new Date().toISOString().split('T')[0]}.csv`);
}

// ==================== ATTENDANCE ====================

async function initAttendance() {
  console.log('[App] Initializing attendance page...');
  
  // Set default date to today
  const dateInput = document.getElementById('attendance-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('change', () => loadAttendanceList());
  }
  
  // Load filter options
  await loadAttendanceFilterOptions();
  
  // Set up event listeners
  setupAttendanceEventListeners();
  
  // Load attendance list
  await loadAttendanceList();
}

async function loadAttendanceFilterOptions() {
  const courseSelect = document.getElementById('attendance-course-filter');
  const batchSelect = document.getElementById('attendance-batch-filter');
  
  if (courseSelect) {
    const courses = await db.getCourses();
    courseSelect.innerHTML = `
      <option value="">All Courses</option>
      ${courses.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
    courseSelect.addEventListener('change', () => loadAttendanceList());
  }
  
  if (batchSelect) {
    const batches = await db.getBatches();
    batchSelect.innerHTML = `
      <option value="">All Batches</option>
      ${batches.map(b => `<option value="${b}">${b}</option>`).join('')}
    `;
    batchSelect.addEventListener('change', () => loadAttendanceList());
  }
}

function setupAttendanceEventListeners() {
  // Save attendance button
  const saveBtn = document.getElementById('save-attendance-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAttendance);
  }
  
  // Mark all present
  const markAllPresentBtn = document.getElementById('mark-all-present');
  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => markAll('Present'));
  }
  
  // Mark all absent
  const markAllAbsentBtn = document.getElementById('mark-all-absent');
  if (markAllAbsentBtn) {
    markAllAbsentBtn.addEventListener('click', () => markAll('Absent'));
  }
}

async function loadAttendanceList() {
  const container = document.getElementById('attendance-list');
  if (!container) return;
  
  const date = document.getElementById('attendance-date')?.value;
  const courseFilter = document.getElementById('attendance-course-filter')?.value || '';
  const batchFilter = document.getElementById('attendance-batch-filter')?.value || '';
  
  if (!date) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar"></i>
        <h3>Select a Date</h3>
        <p>Choose a date to take attendance</p>
      </div>
    `;
    return;
  }
  
  try {
    // Get students
    let students = await db.getAllStudents();
    
    // Apply filters
    if (courseFilter) {
      students = students.filter(s => s.course === courseFilter);
    }
    if (batchFilter) {
      students = students.filter(s => s.batch === batchFilter);
    }
    
    if (students.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Students Found</h3>
          <p>Add students to take attendance</p>
        </div>
      `;
      return;
    }
    
    // Get existing attendance for this date
    const existingAttendance = await db.getAttendanceByDate(date);
    const attendanceMap = {};
    existingAttendance.forEach(a => {
      // Use studentRef (internal ID) to match with student list
      attendanceMap[a.studentRef || a.studentId] = a.status;
    });
    
    // Render attendance list
    container.innerHTML = students.map(student => {
      const status = attendanceMap[student.id] || 'Absent';
      const isPresent = status === 'Present';
      
      return `
        <div class="attendance-item ${isPresent ? 'present' : 'absent'}" data-student-id="${student.id}">
          <div class="attendance-info">
            <div class="attendance-name">${student.name}</div>
            <div class="attendance-meta">
              <span class="badge badge-primary" title="Student ID"><i class="fas fa-id-card"></i> ${student.studentId || 'N/A'}</span>
              <span class="badge">${student.course}</span>
              <span class="badge">${student.batch}</span>
            </div>
          </div>
          <div class="attendance-status">
            <label class="toggle-switch">
              <input type="checkbox" class="attendance-toggle" 
                data-student-id="${student.id}" 
                ${isPresent ? 'checked' : ''}
                onchange="toggleAttendance(this)">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label ${isPresent ? 'text-success' : 'text-danger'}">${status}</span>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('[App] Failed to load attendance list:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Data</h3>
        <p>Please try again</p>
      </div>
    `;
  }
}

function toggleAttendance(checkbox) {
  const item = checkbox.closest('.attendance-item');
  const label = item.querySelector('.toggle-label');
  
  if (checkbox.checked) {
    item.classList.remove('absent');
    item.classList.add('present');
    label.textContent = 'Present';
    label.classList.remove('text-danger');
    label.classList.add('text-success');
  } else {
    item.classList.remove('present');
    item.classList.add('absent');
    label.textContent = 'Absent';
    label.classList.remove('text-success');
    label.classList.add('text-danger');
  }
}

function markAll(status) {
  const toggles = document.querySelectorAll('.attendance-toggle');
  toggles.forEach(toggle => {
    toggle.checked = status === 'Present';
    toggleAttendance(toggle);
  });
}

async function saveAttendance() {
  const date = document.getElementById('attendance-date')?.value;
  if (!date) {
    showToast('Please select a date', 'warning');
    return;
  }
  
  const items = document.querySelectorAll('.attendance-item');
  if (items.length === 0) {
    showToast('No students to save attendance for', 'warning');
    return;
  }
  
  // Get all students to map internal ID to studentId
  const allStudents = await db.getAllStudents();
  const studentMap = {};
  allStudents.forEach(s => {
    studentMap[s.id] = s;
  });
  
  const attendance = [];
  items.forEach(item => {
    const internalId = item.dataset.studentId;
    const student = studentMap[internalId];
    const studentName = item.querySelector('.attendance-name').textContent;
    const course = item.querySelector('.badge-primary')?.nextElementSibling?.textContent || '';
    const batch = item.querySelector('.badge:not(.badge-primary)')?.textContent || '';
    const isPresent = item.querySelector('.attendance-toggle').checked;
    
    attendance.push({
      studentId: internalId,
      customStudentId: student?.studentId || '',
      name: studentName,
      course,
      batch,
      status: isPresent ? 'Present' : 'Absent'
    });
  });
  
  try {
    showLoading('Saving attendance...');
    
    // Save to local DB
    for (const record of attendance) {
      await db.saveAttendance({
        date,
        studentRef: record.studentId, // Internal ID for reference
        studentId: record.customStudentId, // Custom student ID (roll number)
        name: record.name,
        course: record.course,
        batch: record.batch,
        status: record.status
      });
    }
    
    // Try to sync with server
    if (navigator.onLine) {
      try {
        await api.saveAttendance(date, attendance);
        showToast('Attendance saved and synced', 'success');
      } catch (error) {
        // Add to pending operations
        await db.addPendingOperation('saveAttendance', { date, records: attendance });
        showToast('Attendance saved locally (will sync when online)', 'warning');
      }
    } else {
      // Add to pending operations
      await db.addPendingOperation('saveAttendance', { date, records: attendance });
      showToast('Attendance saved locally (will sync when online)', 'warning');
    }
    
    updateSyncStatus();
    
  } catch (error) {
    console.error('[App] Failed to save attendance:', error);
    showToast('Failed to save attendance', 'error');
  } finally {
    hideLoading();
  }
}

// ==================== REPORTS ====================

async function initReports() {
  console.log('[App] Initializing reports page...');
  
  // Load filter options
  await loadReportFilterOptions();
  
  // Set up event listeners
  setupReportsEventListeners();
  
  // Generate initial report
  await generateReport();
}

async function loadReportFilterOptions() {
  const courseSelect = document.getElementById('report-course-filter');
  const batchSelect = document.getElementById('report-batch-filter');
  
  if (courseSelect) {
    const courses = await db.getCourses();
    courseSelect.innerHTML = `
      <option value="">All Courses</option>
      ${courses.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
  }
  
  if (batchSelect) {
    const batches = await db.getBatches();
    batchSelect.innerHTML = `
      <option value="">All Batches</option>
      ${batches.map(b => `<option value="${b}">${b}</option>`).join('')}
    `;
  }
  
  // Set default date range (current month)
  const startDate = document.getElementById('report-start-date');
  const endDate = document.getElementById('report-end-date');
  
  if (startDate && endDate) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    startDate.value = firstDay.toISOString().split('T')[0];
    endDate.value = today.toISOString().split('T')[0];
  }
}

function setupReportsEventListeners() {
  // Generate report button
  const generateBtn = document.getElementById('generate-report-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateReport);
  }
  
  // Export buttons
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportReportCSV);
  }
  
  const exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportReportJSON);
  }
}

async function generateReport() {
  const container = document.getElementById('report-container');
  if (!container) return;
  
  const startDate = document.getElementById('report-start-date')?.value;
  const endDate = document.getElementById('report-end-date')?.value;
  const courseFilter = document.getElementById('report-course-filter')?.value || '';
  const batchFilter = document.getElementById('report-batch-filter')?.value || '';
  
  if (!startDate || !endDate) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-alt"></i>
        <h3>Select Date Range</h3>
        <p>Choose start and end dates to generate report</p>
      </div>
    `;
    return;
  }
  
  try {
    showLoading('Generating report...');
    
    // Get students
    let students = await db.getAllStudents();
    
    // Apply filters
    if (courseFilter) {
      students = students.filter(s => s.course === courseFilter);
    }
    if (batchFilter) {
      students = students.filter(s => s.batch === batchFilter);
    }
    
    // Get attendance for date range
    const attendance = await db.getAttendanceByRange(startDate, endDate);
    
    // Calculate working days
    const workingDays = [...new Set(attendance.map(a => a.date))].length;
    
    // Calculate stats for each student
    const reportData = students.map(student => {
      const studentAttendance = attendance.filter(a => (a.studentRef || a.studentId) === student.id);
      const present = studentAttendance.filter(a => a.status === 'Present').length;
      const absent = studentAttendance.filter(a => a.status === 'Absent').length;
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return {
        ...student,
        present,
        absent,
        total,
        percentage,
        workingDays
      };
    });
    
    // Store for export
    window.currentReportData = reportData;
    
    // Render report
    renderReport(reportData, workingDays);
    
  } catch (error) {
    console.error('[App] Failed to generate report:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Generating Report</h3>
        <p>Please try again</p>
      </div>
    `;
  } finally {
    hideLoading();
  }
}

function renderReport(data, workingDays) {
  const container = document.getElementById('report-container');
  if (!container) return;
  
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Data Found</h3>
        <p>No students match the selected filters</p>
      </div>
    `;
    return;
  }
  
  // Calculate summary
  const totalStudents = data.length;
  const avgAttendance = Math.round(data.reduce((sum, s) => sum + s.percentage, 0) / totalStudents);
  const lowAttendanceCount = data.filter(s => s.percentage < 75).length;
  
  const summaryHtml = `
    <div class="stats-grid mb-2">
      <div class="stat-card primary">
        <div class="stat-value">${totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${avgAttendance}%</div>
        <div class="stat-label">Avg Attendance</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${workingDays}</div>
        <div class="stat-label">Working Days</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">${lowAttendanceCount}</div>
        <div class="stat-label">Below 75%</div>
      </div>
    </div>
  `;
  
  const tableHtml = `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Course</th>
            <th>Batch</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Total</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(student => `
            <tr class="${student.percentage < 75 ? 'low-attendance' : ''}">
              <td><span class="badge badge-primary">${student.studentId || 'N/A'}</span></td>
              <td>${student.name}</td>
              <td>${student.course}</td>
              <td>${student.batch}</td>
              <td>${student.present}</td>
              <td>${student.absent}</td>
              <td>${student.total}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <div class="progress-bar" style="width: 60px;">
                    <div class="progress-bar-fill ${student.percentage >= 75 ? 'success' : student.percentage >= 50 ? 'warning' : 'danger'}" 
                      style="width: ${student.percentage}%"></div>
                  </div>
                  <span>${student.percentage}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = summaryHtml + tableHtml;
}

function exportReportCSV() {
  if (!window.currentReportData) {
    showToast('Please generate a report first', 'warning');
    return;
  }
  
  const exportData = window.currentReportData.map(s => ({
    'Student ID': s.studentId || 'N/A',
    Name: s.name,
    Course: s.course,
    Batch: s.batch,
    Contact: s.contact,
    'Working Days': s.workingDays,
    Present: s.present,
    Absent: s.absent,
    Total: s.total,
    Percentage: s.percentage + '%'
  }));
  
  exportToCSV(exportData, `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
}

function exportReportJSON() {
  if (!window.currentReportData) {
    showToast('Please generate a report first', 'warning');
    return;
  }
  
  downloadJSON({
    generatedAt: new Date().toISOString(),
    data: window.currentReportData
  }, `attendance_report_${new Date().toISOString().split('T')[0]}.json`);
}

// ==================== BACKUP & RESTORE ====================

async function backupData() {
  try {
    showLoading('Creating backup...');
    
    const data = await db.exportAllData();
    downloadJSON(data, `attendance_backup_${new Date().toISOString().split('T')[0]}.json`);
    
    showToast('Backup created successfully', 'success');
  } catch (error) {
    console.error('[App] Backup failed:', error);
    showToast('Backup failed', 'error');
  } finally {
    hideLoading();
  }
}

async function restoreData(file) {
  try {
    showLoading('Restoring data...');
    
    const data = await readFileAsJSON(file);
    await db.importData(data);
    
    showToast('Data restored successfully', 'success');
    
    // Reload page
    setTimeout(() => location.reload(), 1500);
    
  } catch (error) {
    console.error('[App] Restore failed:', error);
    showToast('Restore failed: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function clearAllData() {
  confirmDialog('This will delete all local data. Are you sure?', async () => {
    try {
      showLoading('Clearing data...');
      await db.clearAllData();
      showToast('All data cleared', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      showToast('Failed to clear data', 'error');
    } finally {
      hideLoading();
    }
  });
}
