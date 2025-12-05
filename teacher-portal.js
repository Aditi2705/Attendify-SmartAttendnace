/* Configuration object */
    const CONFIG = {
      // legacy fallbacks (used only if API calls fail)
      semesters: ['Semester 1','Semester 2','Semester 3','Semester 4','Semester 5','Semester 6','Semester 7','Semester 8'],
      subjects: []
    };

  // Base URL for backend API (override by setting window.API_BASE before script runs)
  // Default to the backend dev port 5014 (use http for local dev server binding).
  const API_BASE = window.API_BASE || 'http://localhost:5014/api';

    async function postSessionToServer(payload){
      try{
        const headers = {'Content-Type':'application/json'};
        const token = localStorage.getItem('smartAttendance.token');
        if(token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(`${API_BASE}/attendance/session`, {
          method: 'POST', headers, body: JSON.stringify(payload)
        });
        if(!res.ok){ const txt = await res.text().catch(()=>null); throw new Error(txt || `Server error ${res.status}`); }
        return await res.json().catch(()=>null);
      }catch(e){ console.warn('Failed to post session to server', e); return null; }
    }

    async function fetchHistoryFromServer(){
      try{
        const headers = {};
        const token = localStorage.getItem('smartAttendance.token');
        if(token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(`${API_BASE}/attendance/history`, { headers });
        if(!res.ok){
          const body = await res.text().catch(()=>null);
          console.warn('fetchHistoryFromServer: non-ok response', res.status, body);
          return null;
        }
        const data = await res.json().catch(()=>null);
        if(Array.isArray(data)){
          try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(data)); }catch(e){}
          renderAttendanceHistory(data);
        }
        return data;
      }catch(e){ console.warn('Failed to fetch history from server', e); return null; }
    }

    // students will be loaded from server; fallback to empty list until fetched
    let mockStudents = [];
    // classnames loaded from server (Course + Batch combined or Student.ClassName)
    let classNames = [];

    // Fetch students for selected className and optional semester from backend
    async function fetchStudents(className, semester){
      try{
        const headers = {};
        const token = localStorage.getItem('smartAttendance.token');
        if(token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(`${API_BASE}/student`, { headers });
        if(!res.ok) return [];
        const data = await res.json().catch(()=>[]);
        // API returns lowercase: fullName, rollNo, className
        const all = Array.isArray(data) ? data : [];
        const filtered = className ? all.filter(s => (s.className || '').toString() === className) : all;
        // Map to {rollNo, name} using correct lowercase field names from API
        mockStudents = filtered.map(s=>({ rollNo: s.rollNo || '', name: s.fullName || '' }));
        return mockStudents;
      }catch(e){ console.warn('Failed to fetch students', e); return []; }
    }

    // State
    const state = {
      selected: {course:'',batch:'',semester:'',subject:''},
      attendance: {}, // rollNo -> 'P'|'A'|null
      sessionActive:false,
      sessionDate:''
    };

    // Elements
    const selCourse = document.getElementById('selCourse');
    const selSemester = document.getElementById('selSemester');
    const selSubject = document.getElementById('selSubject');
    const startBtn = document.getElementById('startBtn');
    const errCourse = document.getElementById('errCourse');
    const errSemester = document.getElementById('errSemester');
    const errSubject = document.getElementById('errSubject');
    const setupSection = document.getElementById('setupSection');
    const attendanceSection = document.getElementById('attendanceSection');
    const sessionInfo = document.getElementById('sessionInfo');
    const studentsTbody = document.querySelector('#studentsTable tbody');
    const totalCountEl = document.getElementById('totalCount');
    const presentCountEl = document.getElementById('presentCount');
    const absentCountEl = document.getElementById('absentCount');
    const pendingCountEl = document.getElementById('pendingCount');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    const submitModal = document.getElementById('submitModal');
    const submitYes = document.getElementById('submitYes');
    const submitNo = document.getElementById('submitNo');
    const cancelModal = document.getElementById('cancelModal');
    const cancelYes = document.getElementById('cancelYes');
    const cancelNo = document.getElementById('cancelNo');
  const allPresentBtn = document.getElementById('allPresent');
  const allAbsentBtn = document.getElementById('allAbsent');
    const navTabs = document.querySelectorAll('.nav-tab');
    const markSection = document.getElementById('attendanceSection');
    const allSection = document.getElementById('allAttendanceSection');
    const filterCourse = document.getElementById('filterCourse');
    const filterSubject = document.getElementById('filterSubject');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const historyTbody = document.getElementById('historyTbody');
    const noRecordsEl = document.getElementById('noRecords');
    const viewModal = document.getElementById('viewModal');
    const viewContent = document.getElementById('viewContent');
    const viewSummary = document.getElementById('viewSummary');
    const viewClose = document.getElementById('viewClose');

    // Populate dropdowns
    function populateSelect(selectEl, items){
      items.forEach(it=>{const o=document.createElement('option');o.value=it;o.textContent=it;selectEl.appendChild(o)});
    }
    // populate filters (include "All" options)
    function populateFilter(selectEl, items, allLabel){
      selectEl.innerHTML = '';
      const oAll = document.createElement('option'); oAll.value=''; oAll.textContent = allLabel; selectEl.appendChild(oAll);
      items.forEach(it=>{const o=document.createElement('option');o.value=it;o.textContent=it;selectEl.appendChild(o)});
    }
    populateFilter(filterCourse, [], 'All Classes');
    populateFilter(filterSubject, CONFIG.subjects, 'All Subjects');

    // populate semester select with 1..8
    (function populateSemesters(){
      const sems = Array.from({length:8}, (_,i)=> `Semester ${i+1}`);
      selSemester.innerHTML = '<option value="">-- Select Semester --</option>';
      sems.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; selSemester.appendChild(o); });
    })();

    // Fetch classnames (distinct Student.ClassName) and subjects from server and populate selects
    async function loadServerLists(){
      try{
        const headers = {};
        const token = localStorage.getItem('smartAttendance.token');
        if(token) headers['Authorization'] = 'Bearer ' + token;
        // fetch students and derive distinct classnames
        const sres = await fetch(`${API_BASE}/student`, { headers });
        if(sres.ok){
          const studs = await sres.json().catch(()=>[]);
          const names = Array.isArray(studs) ? studs.map(s=> (s.className||s.ClassName||s.Classname||'').toString()).filter(Boolean) : [];
          classNames = [...new Set(names)];
          classNames.sort((a,b)=> a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
          // populate the Course select with class names
          selCourse.innerHTML = '<option value="">-- Select Class --</option>';
          classNames.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; selCourse.appendChild(o); });
          // also populate filterCourse
          populateFilter(filterCourse, classNames, 'All Classes');
        }
        // fetch subjects
        const subRes = await fetch(`${API_BASE}/subject`, { headers });
        if(subRes.ok){
          const subs = await subRes.json().catch(()=>[]);
          const subjNames = Array.isArray(subs) ? subs.map(s=> s.name || s.Name || s.subjectName || s.SubjectName).filter(Boolean) : [];
          subjNames.sort((a,b)=> a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
          // populate subject selects
          selSubject.innerHTML = '<option value="">-- Select Subject --</option>';
          subjNames.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; selSubject.appendChild(o); });
          populateFilter(filterSubject, subjNames, 'All Subjects');
        }
      }catch(e){ console.warn('Failed to load server lists', e); }
    }

    // Load logged-in teacher info and update header meta
    async function loadTeacherMeta(){
      try{
        const el = document.querySelector('.teacher-meta');
        if(!el) return;
        const headers = {};
        const token = localStorage.getItem('smartAttendance.token');
        if(token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(`${API_BASE}/teacher/me`, { headers });
        if(!res.ok){
          // if unauthorized/forbidden, leave existing meta intact
          console.warn('loadTeacherMeta: non-ok', res.status);
          return;
        }
        const data = await res.json().catch(()=>null);
        if(data){
          const name = data.fullName || data.FullName || data.name || data.Name || '';
          const email = data.email || data.Email || '';
          const txt = name ? (email ? `${name} · ${email}` : name) : (email || el.textContent);
          el.textContent = txt;
        }
      }catch(e){ console.warn('Failed to load teacher meta', e); }
    }

    // helpers
    function formatDate(d){
      const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
      const dd=String(d.getDate()).padStart(2,'0');
      return `${dd} ${months[d.getMonth()]} ${d.getFullYear()} (${days[d.getDay()]})`;
    }

    function validateSetup(){
      let valid=true;
      if(!selCourse.value){errCourse.classList.add('show');valid=false}else errCourse.classList.remove('show');
      if(!selSemester.value){errSemester.classList.add('show');valid=false}else errSemester.classList.remove('show');
      if(!selSubject.value){errSubject.classList.add('show');valid=false}else errSubject.classList.remove('show');
      startBtn.disabled = !valid;
      return valid;
    }

    // Update state on select change
    [selCourse,selSemester,selSubject].forEach(el=>el.addEventListener('change',()=>{
      state.selected.course = selCourse.value; state.selected.batch = ''; state.selected.semester = selSemester.value; state.selected.subject = selSubject.value;
      validateSetup();
    }));

    // Start Attendance (now fetches real students from backend before starting)
    startBtn.addEventListener('click', async ()=>{
      const ok = validateSetup();
      if(!ok) return;
      // fetch students for the selected course/batch/semester from server
      const students = await fetchStudents(state.selected.course, state.selected.semester);
      if(!Array.isArray(students) || students.length === 0){
        showToast('No students found for the selected class/semester', 'error');
        return;
      }
      // initialize attendance state for the fetched students
      students.forEach(s=> state.attendance[s.rollNo] = null);
      state.sessionActive = true;
      state.sessionDate = formatDate(new Date());
      // ISO timestamp used for server payloads (parseable by System.DateTime)
      state.sessionISO = new Date().toISOString();
      renderSessionInfo();
      renderStudentsTable();
      // show attendance section
      setupSection.style.display = 'none';
      // Ensure attendance section is immediately visible even if inline styles
      // were previously set by tab switching. Set display and ARIA/class state
      // so the browser renders the table right away.
      attendanceSection.style.display = 'block';
      attendanceSection.classList.add('show');
      attendanceSection.classList.add('tab-visible');
      attendanceSection.classList.remove('tab-hidden');
      attendanceSection.setAttribute('aria-hidden','false');
      // enable submit only when at least one marked
      updateSummary();
      // Ensure the tab state is correctly set to 'mark' after starting attendance
      switchTab('mark');
    });

    function renderSessionInfo(){
      sessionInfo.innerHTML='';
      const info = [
        ['Class', state.selected.course],
        ['Semester',state.selected.semester],
        ['Subject',state.selected.subject],
        ['Date',state.sessionDate]
      ];
      info.forEach(([k,v])=>{
        const card=document.createElement('div');card.className='info-card';card.innerHTML=`<b>${k}</b><div>${v}</div>`;sessionInfo.appendChild(card);
      });
    }

    function renderStudentsTable(){
      studentsTbody.innerHTML='';
      mockStudents.forEach((s,i)=>{
        const tr=document.createElement('tr');
        tr.innerHTML = `
          <td>${i+1}</td>
          <td>${s.rollNo}</td>
          <td>${s.name}</td>
          <td>
            <div class="status-toggle" data-roll="${s.rollNo}">
              <button class="toggle-btn" data-val="P">P</button>
              <button class="toggle-btn" data-val="A">A</button>
            </div>
          </td>
        `;
        studentsTbody.appendChild(tr);
      });

      // attach event listeners for toggle buttons
      document.querySelectorAll('.status-toggle').forEach(group=>{
        const roll = group.dataset.roll;
        group.querySelectorAll('.toggle-btn').forEach(btn=>{
          btn.addEventListener('click',()=>{
            const val = btn.dataset.val; // P or A
            // Set selection to the clicked value. Do not clear on repeated clicks.
            state.attendance[roll] = val;
            // update visuals
            updateRowVisuals(group, roll);
            updateSummary();
            // ensure bulk selection state updates (already called by updateSummary)
          });
        });
        // initial visual
        updateRowVisuals(group, roll);
      });
    }

    // Bulk actions: mark all present or all absent
    if(allPresentBtn && allAbsentBtn){
      allPresentBtn.addEventListener('click', ()=>{
        mockStudents.forEach(s=> state.attendance[s.rollNo] = 'P');
        document.querySelectorAll('.status-toggle').forEach(group=> updateRowVisuals(group, group.dataset.roll));
        // mark bulk button active
        allPresentBtn.classList.add('active');
        allAbsentBtn.classList.remove('active');
        updateSummary();
      });
      allAbsentBtn.addEventListener('click', ()=>{
        mockStudents.forEach(s=> state.attendance[s.rollNo] = 'A');
        document.querySelectorAll('.status-toggle').forEach(group=> updateRowVisuals(group, group.dataset.roll));
        // mark bulk button active
        allAbsentBtn.classList.add('active');
        allPresentBtn.classList.remove('active');
        updateSummary();
      });
    }

    // Update bulk button selection state based on current attendance
    function updateBulkSelectionState(){
      const total = mockStudents.length;
      let present=0, absent=0, pending=0;
      mockStudents.forEach(s=>{ const v = state.attendance[s.rollNo]; if(v==='P') present++; else if(v==='A') absent++; else pending++; });
      if(present === total){ allPresentBtn && allPresentBtn.classList.add('active'); allAbsentBtn && allAbsentBtn.classList.remove('active'); }
      else if(absent === total){ allAbsentBtn && allAbsentBtn.classList.add('active'); allPresentBtn && allPresentBtn.classList.remove('active'); }
      else { allPresentBtn && allPresentBtn.classList.remove('active'); allAbsentBtn && allAbsentBtn.classList.remove('active'); }
    }

    function updateRowVisuals(group, roll){
      const val = state.attendance[roll];
      group.querySelectorAll('.toggle-btn').forEach(btn=>{
        btn.classList.remove('active','present','absent');
        const v = btn.dataset.val;
        if(val === v){
          btn.classList.add('active', v==='P' ? 'present' : 'absent');
        }
      });
    }

    function updateSummary(){
      const total = mockStudents.length;
      let present=0,absent=0,pending=0;
      Object.values(state.attendance).forEach(v=>{ if(v==='P') present++; else if(v==='A') absent++; else pending++; });
      totalCountEl.textContent = `Total Students: ${total}`;
      presentCountEl.textContent = `Present: ${present}`;
      absentCountEl.textContent = `Absent: ${absent}`;
      pendingCountEl.textContent = `Pending: ${pending}`;
      // require that no pending students remain before allowing submit
      submitBtn.disabled = pending !== 0;
      // update bulk button visuals
      updateBulkSelectionState();
    }

    // Submit / Cancel flow with modals
    submitBtn.addEventListener('click', ()=>{ openModal(submitModal); });
    cancelBtn.addEventListener('click', ()=>{ openModal(cancelModal); });

    function openModal(mod){ mod.classList.add('show'); mod.querySelector('.modal').classList.add('show');
      // focus primary button
      const focusBtn = mod.querySelector('.modal .btn-primary, .modal .btn-danger'); if(focusBtn) focusBtn.focus();
    }
    function closeModal(mod){ mod.classList.remove('show'); mod.querySelector('.modal').classList.remove('show'); }

    // Submit modal actions
    submitYes.addEventListener('click', ()=>{
      // Prepare attendance data
      const attendanceArray = mockStudents.map(s=>({rollNo:s.rollNo,name:s.name,status: state.attendance[s.rollNo] || null}));
      const payload = {
        course: state.selected.course,
        batch: state.selected.batch,
        semester: state.selected.semester,
        subject: state.selected.subject,
        date: state.sessionISO || new Date().toISOString(),
        attendance: attendanceArray
      };
      console.log('Attendance saved:', payload);
      // Save to history first
      try{ saveSessionToHistory(payload); }catch(e){ console.warn('save history failed', e); }
      // Show success toast
      showToast('Attendance saved', 'success');
      // Return to setup: clear state but keep config selections cleared
      resetToSetup();
      closeModal(submitModal);
    });
    submitNo.addEventListener('click', ()=>{ closeModal(submitModal); });

    // Cancel modal actions
    cancelYes.addEventListener('click', ()=>{
      // discard data and return to setup
      resetToSetup();
      closeModal(cancelModal);
    });
    cancelNo.addEventListener('click', ()=>{ closeModal(cancelModal); });

    // close clicking backdrop (only treated as No -> close)
    [submitModal,cancelModal, document.getElementById('logoutModal')].forEach(mod=>{
      if(!mod) return;
      mod.addEventListener('click',(e)=>{ if(e.target === mod){ closeModal(mod); } });
      // ESC to close
      document.addEventListener('keydown',(e)=>{ if(e.key === 'Escape' && mod.classList.contains('show')) closeModal(mod); });
    });

    // --- Export CSV helper and Toast ---
    const toastEl = document.getElementById('toast');
    function showToast(message, type='success', timeout=3800){
      if(!toastEl) return;
      toastEl.querySelector('.msg').textContent = message;
      toastEl.classList.remove('success','error');
      if(type==='success') toastEl.classList.add('success');
      if(type==='error') toastEl.classList.add('error');
      toastEl.classList.add('show');
      setTimeout(()=>{ toastEl.classList.remove('show'); }, timeout);
    }

    function exportAttendanceAsCSV(payload){
      // Build CSV: top metadata then header + rows
      const meta = [
        ['Course', payload.course || ''],
        ['Batch', payload.batch || ''],
        ['Semester', payload.semester || ''],
        ['Subject', payload.subject || ''],
        ['Date', payload.date || '']
      ];
      const lines = [];
      meta.forEach(row=>{ lines.push(`${escapeCsv(row[0])},${escapeCsv(row[1])}`); });
      lines.push('');
      // header
      lines.push('Roll No.,Student Name,Status');
      // rows
      payload.attendance.forEach(r=>{
        lines.push(`${escapeCsv(r.rollNo)},${escapeCsv(r.name)},${escapeCsv(r.status||'')}`);
      });

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateKey = new Date().toISOString().split('T')[0];
      const subj = (payload.subject || 'attendance').replace(/[^a-z0-9_-]/ig,'_');
      a.href = url;
      a.download = `attendance_${dateKey}_${subj}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // --- Attendance history (localStorage) ---
    const HISTORY_KEY = 'attendanceHistory';
    function loadHistory(){
      try{ const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ console.warn('Failed to read history', e); return []; }
    }
    function saveHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch(e){ console.warn('Failed to save history', e); } }
    function saveSessionToHistory(payload){
      const list = loadHistory();
      const nowISO = new Date().toISOString();
      const rec = Object.assign({}, payload, {id: Date.now(), ts: nowISO});
      // attach summary counts
      const present = payload.attendance.filter(r=>r.status==='P').length;
      const total = payload.attendance.length;
      rec._present = present; rec._total = total; rec._percent = total?Math.round((present/total)*1000)/10:0;
      list.push(rec);
      // keep only latest 200 for storage practicality
      const trimmed = list.slice(-200);
      saveHistory(trimmed);
      // Also try to POST to the server in the background; ignore failures
      (async ()=>{
        try{ await postSessionToServer(rec); }catch(e){ /* already logged in helper */ }
      })();
      return rec;
    }

    // Render attendance history table (latest first, show upto 20)
    function renderAttendanceHistory(records){
      const source = records || loadHistory();
      try{ console.debug('renderAttendanceHistory: source length', Array.isArray(source)?source.length:typeof source, source && source[0]); }catch(e){}
      const rows = (source || []).slice().reverse();
      const latest = rows.slice(0,20);
      historyTbody.innerHTML = '';
      if(latest.length === 0){ historyTbody.style.display='none'; noRecordsEl.style.display='block'; return; }
      historyTbody.style.display='table-row-group'; noRecordsEl.style.display='none';
      latest.forEach((r,i)=>{
        const tr = document.createElement('tr');
        // date formatting: if r.ts available use it, else r.date
        const dateObj = r.ts ? new Date(r.ts) : new Date();
        const dateStr = formatDate(dateObj);
        const percent = (r._percent||0).toFixed(1);
        const percentClass = r._percent>=80? 'high' : (r._percent>=60? 'med' : 'low');
        tr.innerHTML = `
          <td>${i+1}</td>
          <td>${dateStr}</td>
          <td>${escapeHtml(r.course||'')}</td>
          <td>${escapeHtml(r.semester||'')}</td>
          <td>${escapeHtml(r.subject||'')}</td>
          <td>${r._present}/${r._total}</td>
          <td class="percent ${percentClass}">${percent}%</td>
          <td>
            <button class="toggle-btn" data-action="view" data-id="${r.id}">👁️</button>
            <button class="toggle-btn" data-action="download" data-id="${r.id}">📥</button>
          </td>
        `;
        historyTbody.appendChild(tr);
      });
      // attach actions for history rows (view / download)
      historyTbody.querySelectorAll('button[data-action]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const idStr = btn.dataset.id;
          const action = btn.dataset.action;
          // Try to find the record in persisted history first, then fallback to the
          // in-memory source that was passed to this renderer (covers server-only
          // renders where localStorage may not reflect the same object shapes).
          const persisted = loadHistory();
          let rec = persisted.find(r=> String(r.id) === idStr);
          if(!rec && Array.isArray(source)){
            rec = source.find(r=> String(r.id) === idStr);
          }
          if(!rec) return;
          if(action === 'download'){
            try{ exportAttendanceAsCSV(rec); showToast('Attendance downloaded', 'success'); }catch(e){ console.error(e); showToast('Download failed', 'error'); }
            return;
          }
          if(action === 'view'){
            openViewModal(rec);
            return;
          }
        });
      });

      // Show a read-only view modal for a saved attendance record
      function openViewModal(rec){
        viewContent.innerHTML = '';
        viewSummary.textContent = '';
        const tbl = document.createElement('table');
        tbl.style.width = '100%'; tbl.style.borderCollapse = 'collapse';
        const tb = document.createElement('tbody');
        // header
        const hdr = document.createElement('tr');
        hdr.innerHTML = '<th style="text-align:left;padding:8px">Roll No.</th><th style="text-align:left;padding:8px">Name</th><th style="text-align:left;padding:8px">Status</th>';
        tb.appendChild(hdr);
        (rec.attendance||[]).forEach(s=>{
          const tr = document.createElement('tr'); tr.style.borderBottom='1px solid #f2f2f2';
          const statusIcon = s.status==='P' ? '✅' : (s.status==='A' ? '❌' : '');
          tr.innerHTML = `<td style="padding:8px 6px">${escapeHtml(s.rollNo)}</td><td style="padding:8px 6px">${escapeHtml(s.name)}</td><td style="padding:8px 6px">${statusIcon}</td>`;
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        viewContent.appendChild(tbl);
        viewSummary.textContent = `Present: ${rec._present}  Absent: ${rec._total - rec._present}  Total: ${rec._total}  Attendance: ${rec._percent.toFixed(1)}%`;
        openModal(viewModal);
      }
    }

    viewClose && viewClose.addEventListener('click', ()=>{ closeModal(viewModal); });
    // close view modal on backdrop/ESC handled earlier


    function escapeCsv(val){
      if(val == null) return '';
      const s = String(val);
      if(s.includes(',') || s.includes('"') || s.includes('\n')){
        return '"' + s.replace(/"/g,'""') + '"';
      }
      return s;
    }

    // Escape text for safe insertion into HTML content (prevent XSS in rendered history)
    function escapeHtml(val){
      if(val == null) return '';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function resetToSetup(){
      // clear attendance
      state.selected = {course:'',batch:'',semester:'',subject:''};
      state.attendance = {};
      state.sessionActive=false;
      state.sessionDate='';
      // reset selects
      selCourse.value='';selSemester.value='';selSubject.value='';
      startBtn.disabled=true;
      // hide attendance section and show setup
      attendanceSection.classList.remove('show');
      setupSection.style.display='block';
      // clear table
      studentsTbody.innerHTML='';
      updateSummary();
    }

    // Logout behavior: if on attendance page, show logout confirmation modal; otherwise clear and redirect
    const logoutModal = document.getElementById('logoutModal');
    const logoutSave = document.getElementById('logoutSave');
    const logoutDiscard = document.getElementById('logoutDiscard');
    const logoutCancel = document.getElementById('logoutCancel');

    function clearPersistedState(){
      try{ localStorage.clear(); }catch(e){ console.warn('Failed to clear localStorage', e); }
    }

    document.getElementById('logoutBtn').addEventListener('click',()=>{
      const onAttendance = attendanceSection.classList.contains('show') || state.sessionActive;
      if(onAttendance){
        // Show logout-specific modal with tailored wording
        openModal(logoutModal);
      }else{
        // Immediately clear persisted state and redirect
        clearPersistedState();
        // small delay so UI can respond
        setTimeout(()=> window.location.href = 'index.html', 250);
      }
    });

  // Logout modal actions
  logoutSave && logoutSave.addEventListener('click', ()=>{
      // Save current attendance (same as submit) then redirect after a short delay to let toast be seen
      const attendanceArray = mockStudents.map(s=>({rollNo:s.rollNo,name:s.name,status: state.attendance[s.rollNo] || null}));
      const payload = {
        course: state.selected.course,
        batch: state.selected.batch,
        semester: state.selected.semester,
        subject: state.selected.subject,
        date: state.sessionISO || new Date().toISOString(),
        attendance: attendanceArray
      };
      try{ saveSessionToHistory(payload); }catch(e){ console.warn('save history failed', e); }
      try{
        exportAttendanceAsCSV(payload);
        showToast('Attendance saved and downloaded', 'success');
      }catch(err){
        console.error('Export failed', err);
        showToast('Attendance saved (export failed)', 'error');
      }
      // close modal, clear persisted state and then redirect after a short delay
      closeModal(logoutModal);
      resetToSetup();
      clearPersistedState();
      setTimeout(()=> window.location.href = 'index.html', 1200);
    });

    logoutDiscard && logoutDiscard.addEventListener('click', ()=>{
      // Discard changes and redirect; clear persisted state first
      closeModal(logoutModal);
      resetToSetup();
      clearPersistedState();
      // slight delay so modal close animation finishes
      setTimeout(()=> window.location.href = 'index.html', 400);
    });

    logoutCancel && logoutCancel.addEventListener('click', ()=>{ closeModal(logoutModal); });

    // Initialize UI
    updateSummary();
    // init nav behavior and history
    function switchTab(tab){
      navTabs.forEach(t=> t.classList.toggle('active', t.dataset.tab===tab));
      if(tab==='mark'){
        // hide All Attendance section immediately (avoid a brief visual "glance")
        // Also ensure display is none so the browser doesn't render it while the
        // mark view becomes visible. We still toggle the utility classes for
        // accessibility/animation consistency.
        allSection.style.display = 'none';
        allSection.classList.add('tab-hidden'); allSection.classList.remove('tab-visible'); allSection.setAttribute('aria-hidden','true');
        // show appropriate part of Mark Attendance: setup or active attendance
        if(state.sessionActive){
          setupSection.style.display = 'none';
          attendanceSection.style.display = 'block';
          attendanceSection.classList.add('tab-visible'); attendanceSection.classList.remove('tab-hidden'); attendanceSection.setAttribute('aria-hidden','false');
        }else{
          // show setup, hide attendance list
          setupSection.style.display = 'block';
          attendanceSection.style.display = 'none';
          attendanceSection.classList.add('tab-hidden'); attendanceSection.classList.remove('tab-visible'); attendanceSection.setAttribute('aria-hidden','true');
        }
      }else{
        // show All Attendance and hide both setup and attendance UI
        setupSection.style.display = 'none';
        // ensure the attendance area is hidden
        attendanceSection.style.display = 'none';
        attendanceSection.classList.add('tab-hidden'); attendanceSection.classList.remove('tab-visible'); attendanceSection.setAttribute('aria-hidden','true');
        // make All Attendance visible (ensure display:block so it renders)
        allSection.style.display = 'block';
        allSection.classList.add('tab-visible'); allSection.classList.remove('tab-hidden'); allSection.setAttribute('aria-hidden','false');
        // Try to fetch fresh history from server first, then render
        try{ fetchHistoryFromServer().then(data=>{ renderAttendanceHistory(Array.isArray(data)?data:undefined); }); }catch(e){ renderAttendanceHistory(); }
      }
    }
    navTabs.forEach(t=> t.addEventListener('click', ()=> switchTab(t.dataset.tab)));
    // default tab
    switchTab('mark');

    // Filters logic
    applyFiltersBtn && applyFiltersBtn.addEventListener('click', ()=>{
      const course = filterCourse.value || '';
      const subject = filterSubject.value || '';
      const records = loadHistory().filter(r=>{
        if(course && r.course !== course) return false;
        if(subject && r.subject !== subject) return false;
        return true;
      });
      renderAttendanceHistory(records);
    });
    resetFiltersBtn && resetFiltersBtn.addEventListener('click', ()=>{
      filterCourse.value=''; filterSubject.value=''; renderAttendanceHistory();
    });

    // Make percent coloring via CSS classes
    const style = document.createElement('style'); style.innerHTML = `
      .percent.high{color:#138a36;font-weight:700}
      .percent.med{color:#d97706;font-weight:700}
      .percent.low{color:#c92a2a;font-weight:700}
    `; document.head.appendChild(style);

    // initial render of history
    renderAttendanceHistory();
  // Try to fetch remote history (if backend available) and update UI
  try{ fetchHistoryFromServer(); }catch(e){ /* ignore */ }

    // Load classnames and subjects from server to populate selects
    try{ loadServerLists(); }catch(e){ /* ignore */ }

    // Load teacher meta (name/email) and update header
    try{ loadTeacherMeta(); }catch(e){ /* ignore */ }

    // Load logged-in teacher meta (name & email) and display in header
    async function loadTeacherMeta(){
      try{
        const token = localStorage.getItem('smartAttendance.token');
        if(!token) return;
        const res = await fetch(`${API_BASE}/teacher/me`, { headers: { 'Authorization': 'Bearer ' + token } });
        if(!res.ok) return;
        const t = await res.json().catch(()=>null);
        if(t){
          const metaEl = document.querySelector('.teacher-meta');
          if(metaEl){
            const name = t.fullName || t.FullName || t.fullname || '';
            const email = t.email || t.Email || '';
            metaEl.textContent = `${name} · ${email}`;
          }
        }
      }catch(e){ console.warn('Failed to load teacher meta', e); }
    }

    try{ loadTeacherMeta(); }catch(e){ /* ignore */ }

    // Accessibility: keyboard support for toggles (Enter/Space)
    document.addEventListener('keydown',(e)=>{
      if(e.target && e.target.classList && e.target.classList.contains('toggle-btn')){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.target.click(); }
      }
    });