const CONFIG = {
  attendanceThreshold: 75,
  API_BASE: window.API_BASE || 'http://localhost:5014/api'
};

let studentData = null;
let attendanceRecords = [];
let allStats = null; // Store full stats for filtering

// Course duration mapping (in semesters)
const COURSE_DURATION = {
  'B.Tech': 8,
  'BCA': 6,
  'MCA': 4,
  'M.Tech': 4
};

// Get course duration by extracting course name from className
function getCourseDuration(className) {
  if (!className) return 8; // Default to 8 semesters
  const course = className.split(' ')[0]; // Extract first word (e.g., "B.Tech" from "B.Tech CSE 2021-2025")
  return COURSE_DURATION[course] || 8;
}

// Filter stats by semester (or return all if semesterNum is null)
function filterStatsBySemester(stats, semesterNum) {
  if (semesterNum === null) {
    return stats; // Return all stats
  }
  
  const semesterKey = `Semester ${semesterNum}`;
  
  // Filter overall stats
  const filteredStats = {
    overall: { totalClasses: 0, attended: 0, missed: 0, percentage: 0 },
    subjects: {},
    semesters: {},
    monthly: {},
    recentActivity: []
  };
  
  // Filter subject stats for the selected semester
  Object.entries(stats.subjects).forEach(([key, subject]) => {
    const subjectSemesterRecords = attendanceRecords.filter(record => {
      const recSem = `Semester ${record.semester || '1'}`;
      return recSem === semesterKey && record.subject === subject.name;
    });
    
    if (subjectSemesterRecords.length > 0) {
      const semesterSubjectStats = { name: subject.name, present: 0, absent: 0, total: 0, percentage: 0 };
      subjectSemesterRecords.forEach(record => {
        const studentAtt = record.attendance.find(a => (a.rollNo || '').toString() === studentData.rollNo);
        if (studentAtt) {
          semesterSubjectStats.total++;
          if (studentAtt.status === 'P') semesterSubjectStats.present++;
          else semesterSubjectStats.absent++;
        }
      });
      
      if (semesterSubjectStats.total > 0) {
        semesterSubjectStats.percentage = Math.round((semesterSubjectStats.present / semesterSubjectStats.total) * 1000) / 10;
        filteredStats.subjects[subject.name] = semesterSubjectStats;
      }
    }
  });
  
  // Get overall stats for this semester
  if (stats.semesters[semesterKey]) {
    filteredStats.overall = {
      totalClasses: stats.semesters[semesterKey].total,
      attended: stats.semesters[semesterKey].present,
      missed: stats.semesters[semesterKey].total - stats.semesters[semesterKey].present,
      percentage: stats.semesters[semesterKey].percentage
    };
  }
  
  // Include semester info for reference
  filteredStats.semesters[semesterKey] = stats.semesters[semesterKey];
  
  // Filter monthly data for this semester (optional, can be left as is)
  Object.entries(stats.monthly).forEach(([key, month]) => {
    filteredStats.monthly[key] = month;
  });
  
  // Filter recent activity for this semester
  filteredStats.recentActivity = stats.recentActivity.filter(activity => {
    const record = attendanceRecords.find(r => r.date === activity.date);
    return record && `Semester ${record.semester || '1'}` === semesterKey;
  });
  
  return filteredStats;
}

// Fetch logged-in student data from API
async function fetchStudentData() {
  try {
    const headers = {};
    const token = localStorage.getItem('smartAttendance.token');
    if (!token) {
      console.warn('No token found, redirecting to login');
      window.location.href = 'index.html';
      return null;
    }
    headers['Authorization'] = 'Bearer ' + token;
    
    // Fetch current logged-in student from /api/student/me endpoint
    const res = await fetch(`${CONFIG.API_BASE}/student/me`, { headers });
    if (!res.ok) {
      console.warn('Failed to fetch student data', res.status);
      return null;
    }
    const student = await res.json().catch(() => null);
    return student;
  } catch (e) {
    console.warn('Failed to fetch student data', e);
    return null;
  }
}

// Fetch attendance history from API
async function fetchAttendanceHistory() {
  try {
    const headers = {};
    const token = localStorage.getItem('smartAttendance.token');
    if (!token) return [];
    headers['Authorization'] = 'Bearer ' + token;
    
    const res = await fetch(`${CONFIG.API_BASE}/attendance/history`, { headers });
    if (!res.ok) {
      console.warn('Failed to fetch attendance history', res.status);
      return [];
    }
    const history = await res.json().catch(() => []);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.warn('Failed to fetch attendance history', e);
    return [];
  }
}

// Build attendance statistics from records
function buildAttendanceStats(records, student) {
  if (!student || !Array.isArray(records)) {
    return { overall: {}, subjects: {}, semesters: {}, monthly: {}, recentActivity: [] };
  }
  
  const studentRollNo = student.rollNo;
  const stats = {
    overall: { totalClasses: 0, attended: 0, missed: 0, percentage: 0 },
    subjects: {},
    semesters: {},
    monthly: {},
    recentActivity: []
  };
  
  // Process each attendance record
  records.forEach(record => {
    if (!record.attendance || !Array.isArray(record.attendance)) return;
    
    const studentAttendance = record.attendance.find(a => (a.rollNo || '').toString() === studentRollNo);
    if (!studentAttendance) return;
    
    const isPresent = studentAttendance.status === 'P';
    const subject = record.subject || 'Unknown';
    const semester = `Semester ${record.semester || '1'}`;
    const dateObj = new Date(record.date);
    const monthKey = dateObj.toLocaleString('en-US', { year: 'numeric', month: 'long' });
    
    // Overall stats
    stats.overall.totalClasses++;
    if (isPresent) stats.overall.attended++;
    else stats.overall.missed++;
    
    // Subject stats
    if (!stats.subjects[subject]) {
      stats.subjects[subject] = { name: subject, present: 0, absent: 0, total: 0, percentage: 0 };
    }
    stats.subjects[subject].total++;
    if (isPresent) stats.subjects[subject].present++;
    else stats.subjects[subject].absent++;
    
    // Semester stats
    if (!stats.semesters[semester]) {
      stats.semesters[semester] = { semester, present: 0, total: 0, percentage: 0, subjects: new Set() };
    }
    stats.semesters[semester].total++;
    if (isPresent) stats.semesters[semester].present++;
    stats.semesters[semester].subjects.add(subject);
    
    // Monthly stats
    if (!stats.monthly[monthKey]) {
      stats.monthly[monthKey] = { month: monthKey, present: 0, total: 0, percentage: 0 };
    }
    stats.monthly[monthKey].total++;
    if (isPresent) stats.monthly[monthKey].present++;
    
    // Recent activity (for table)
    stats.recentActivity.push({
      date: record.date,
      subject,
      status: isPresent ? 'present' : 'absent'
    });
  });
  
  // Calculate percentages
  if (stats.overall.totalClasses > 0) {
    stats.overall.percentage = Math.round((stats.overall.attended / stats.overall.totalClasses) * 1000) / 10;
  }
  
  Object.values(stats.subjects).forEach(subject => {
    if (subject.total > 0) {
      subject.percentage = Math.round((subject.present / subject.total) * 1000) / 10;
    }
  });
  
  Object.values(stats.semesters).forEach(semester => {
    if (semester.total > 0) {
      semester.percentage = Math.round((semester.present / semester.total) * 1000) / 10;
      semester.subjects = semester.subjects.size;
    }
  });
  
  Object.values(stats.monthly).forEach(month => {
    if (month.total > 0) {
      month.percentage = Math.round((month.present / month.total) * 1000) / 10;
    }
  });
  
  // Sort recent activity by date (newest first)
  stats.recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return stats;
}

function getAttendanceColor(percentage) {
  if (percentage >= CONFIG.attendanceThreshold) return 'var(--success-color)';
  if (percentage >= 60) return 'var(--warning-color)';
  return 'var(--danger-color)';
}

function getAttendanceStatus(percentage) {
  if (percentage >= CONFIG.attendanceThreshold) return 'Good Standing';
  if (percentage >= 60) return 'Below Requirement';
  return 'At Risk';
}

function renderStudentInfo() {
  if (!studentData) return;
  
  document.getElementById('welcome-message').innerText = `Welcome, ${studentData.fullName || studentData.name || 'Student'}!`;
  document.getElementById('profile-pic').innerText = (studentData.fullName || studentData.name || 'S').charAt(0).toUpperCase();
  
  const detailsContainer = document.getElementById('student-details');
  detailsContainer.innerHTML = `
    <div><strong>Roll No.:</strong> ${studentData.rollNo || 'N/A'}</div>
    <div><strong>Name:</strong> ${studentData.fullName || studentData.name || 'N/A'}</div>
    <div><strong>Email:</strong> ${studentData.email || 'N/A'}</div>
    <div><strong>Class:</strong> ${studentData.className || 'N/A'}</div>
  `;
}

function renderOverallAttendance(stats) {
  const summary = stats.overall;
  const color = getAttendanceColor(summary.percentage);
  const status = getAttendanceStatus(summary.percentage);
  
  const container = document.getElementById('overall-attendance-summary');
  container.innerHTML = `
    <div class="attendance-percentage" style="color: ${color};">${summary.percentage.toFixed(1)}%</div>
    <div class="progress-bar-container" style="height: 25px; max-width: 400px; margin: auto;">
      <div class="progress-bar" style="width: ${summary.percentage}%; background-color: ${color};"></div>
    </div>
    <div class="attendance-stats">
      <div><strong>Total Classes:</strong> ${summary.totalClasses}</div>
      <div><strong>Attended:</strong> ${summary.attended}</div>
      <div><strong>Missed:</strong> ${summary.missed}</div>
      <div><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${status}</span></div>
    </div>
  `;
}

function renderSubjectAttendance(stats) {
  const container = document.getElementById('subject-cards-container');
  const subjects = Object.values(stats.subjects);
  
  if (subjects.length === 0) {
    container.innerHTML = '<p>No attendance records yet</p>';
    return;
  }
  
  container.innerHTML = subjects.map(subject => {
    const color = getAttendanceColor(subject.percentage);
    return `
      <div class="subject-card">
        <h4>📚 ${subject.name}</h4>
        <div style="font-size: 24px; font-weight: bold; color: ${color};">${subject.percentage.toFixed(1)}%</div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${subject.percentage}%; background-color: ${color};"></div>
        </div>
        <div>
          <span class="status-present">Present: ${subject.present}</span> | 
          <span class="status-absent">Absent: ${subject.absent}</span> | 
          Total: ${subject.total}
        </div>
      </div>
    `;
  }).join('');
}

function renderSemesterAttendance(stats) {
  const container = document.getElementById('semester-cards-container');
  const semesters = Object.values(stats.semesters).sort((a, b) => {
    const semA = parseInt(a.semester.match(/\d+/)?.[0] || 0);
    const semB = parseInt(b.semester.match(/\d+/)?.[0] || 0);
    return semB - semA;
  });
  
  if (semesters.length === 0) {
    container.innerHTML = '<p>No semester data</p>';
    return;
  }
  
  container.innerHTML = semesters.map(sem => {
    const color = getAttendanceColor(sem.percentage);
    return `
      <div class="semester-card">
        <h4>${sem.semester}</h4>
        <div style="font-size: 24px; font-weight: bold; color: ${color};">${sem.percentage.toFixed(1)}%</div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${sem.percentage}%; background-color: ${color};"></div>
        </div>
        <div>Present: ${sem.present}/${sem.total} classes</div>
        <div>${sem.subjects} subjects</div>
      </div>
    `;
  }).join('');
}

function renderMonthlyAttendance(stats) {
  const container = document.getElementById('monthly-cards-container');
  const months = Object.values(stats.monthly).sort((a, b) => new Date(b.month) - new Date(a.month));
  
  if (months.length === 0) {
    container.innerHTML = '<p>No monthly data</p>';
    return;
  }
  
  container.innerHTML = months.map(month => {
    const color = getAttendanceColor(month.percentage);
    return `
      <div class="monthly-card">
        <h4>${month.month}</h4>
        <div style="font-size: 20px; font-weight: bold; color: ${color};">${month.percentage.toFixed(1)}%</div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${month.percentage}%; background-color: ${color};"></div>
        </div>
        <div>Present: ${month.present}/${month.total}</div>
      </div>
    `;
  }).join('');
}

function renderRecentActivity(stats) {
  const container = document.getElementById('recent-activity-body');
  const activities = stats.recentActivity.slice(0, 20); // Show latest 20
  
  if (activities.length === 0) {
    container.innerHTML = '<tr><td colspan="3">No attendance activity</td></tr>';
    return;
  }
  
  container.innerHTML = activities.map(activity => {
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
    const statusClass = activity.status === 'present' ? 'status-present' : 'status-absent';
    const statusText = activity.status.charAt(0).toUpperCase() + activity.status.slice(1);
    return `
      <tr>
        <td>${formattedDate}</td>
        <td>${activity.subject}</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }).join('');
}

function renderAttendanceAlert(stats) {
  const container = document.getElementById('attendance-alert-container');
  const percentage = stats.overall.percentage;
  const present = stats.overall.attended;
  const total = stats.overall.totalClasses;
  const threshold = CONFIG.attendanceThreshold;
  
  // Clear previous content
  container.innerHTML = '';
  
  // Show alert only if below threshold and there is data
  if (percentage < threshold && total > 0) {
    const classesNeeded = Math.ceil((threshold * total - 100 * present) / (100 - threshold));
    
    container.innerHTML = `
      <div class="attendance-warning">
        <h4>⚠️ ATTENDANCE WARNING</h4>
        <p>Your attendance is below ${threshold}%. Current: <strong>${percentage.toFixed(1)}%</strong></p>
        <p>You need to attend the next <strong>${Math.max(classesNeeded, 0)}</strong> classes consecutively to meet the requirement.</p>
      </div>
    `;
  }
}

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// Populate semester dropdown based on course duration
function populateSemesterDropdown(className) {
  const selector = document.getElementById('semesterSelector');
  if (!selector) return;
  
  const duration = getCourseDuration(className);
  selector.innerHTML = '<option value="">All Semesters</option>';
  
  for (let i = 1; i <= duration; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Semester ${i}`;
    selector.appendChild(option);
  }
  
  // Add change event listener
  selector.addEventListener('change', (e) => {
    const selectedSem = e.target.value ? parseInt(e.target.value) : null;
    const filteredStats = filterStatsBySemester(allStats, selectedSem);
    
    // Re-render sections with filtered data
    renderOverallAttendance(filteredStats);
    renderAttendanceAlert(filteredStats); // Re-render alert with filtered stats
  });
}

// Initialize page with real data
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch data from API
  studentData = await fetchStudentData();
  attendanceRecords = await fetchAttendanceHistory();
  
  if (!studentData) {
    console.warn('Failed to load student data');
    // Keep page displayable but show minimal content
  }
  
  // Build stats from records
  const stats = buildAttendanceStats(attendanceRecords, studentData);
  allStats = stats; // Store for filtering
  
  // Render all sections
  renderStudentInfo();
  populateSemesterDropdown(studentData?.className);
  renderOverallAttendance(stats);
  renderSubjectAttendance(stats);
  renderSemesterAttendance(stats);
  renderMonthlyAttendance(stats);
  renderRecentActivity(stats);
  renderAttendanceAlert(stats);
  
  document.querySelector('.logout-btn').addEventListener('click', () => {
    localStorage.removeItem('smartAttendance.token');
    localStorage.removeItem('smartAttendance.userRole');
    window.location.href = 'index.html';
  });
});

