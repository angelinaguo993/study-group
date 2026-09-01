// ============================================
// Supabase setup
// ============================================
const SUPABASE_URL = 'https://irrciwbcscmnjjaqclbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycmNpd2Jjc2NtbmpqYXFjbGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDIzNjQsImV4cCI6MjEwMzA3ODM2NH0.xfv9eTMse8wsyTwVOix9VfEcHeGs0pPKhahEKtNIr34';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let classes = [];
let assignments = [];
let corrections = [];
let calendarEvents = [];
let enrolledClassIds = new Set();

const iconPool = ['✦', '▤', '▰', '∑', '◌', '✎', '⚗', 'A', '◆', '↗', '★', '❖'];
const colorPool = ['green-paper', 'purple-paper', 'orange-paper'];
const subjectDotColors = ['math', 'chem', 'history', 'spanish', 'blue', 'purple', 'orange', 'gold'];

function getConsistentVisuals(identifier) {
  if (!identifier) return { icon: '◆', color: 'blue' };
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);
  return {
    icon: iconPool[index % iconPool.length],
    color: subjectDotColors[index % subjectDotColors.length]
  };
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const resources = [
  { title: 'Derivative rules at a glance', type: 'Study guide', subject: 'AP Calc', collection: 'AP', author: 'Maya Thompson', icon: '✦', color: 'green-paper' },
  { title: 'Calorimetry practice problems', type: 'Practice', subject: 'Chemistry', collection: 'IB', author: 'Jordan Lee', icon: '▤', color: 'purple-paper' },
  { title: 'Things Fall Apart themes', type: 'Notes', subject: 'English 10', collection: 'elective', author: 'Sam Patel', icon: '▰', color: 'orange-paper' },
  { title: 'Digital SAT math formula sheet', type: 'Study guide', subject: 'Math', collection: 'SAT', author: 'Avery Chen', icon: '∑', color: 'green-paper' },
  { title: 'ACT science timing drills', type: 'Practice', subject: 'Science', collection: 'ACT', author: 'Maya Thompson', icon: '◌', color: 'purple-paper' },
  { title: 'College essay brainstorming prompts', type: 'Notes', subject: 'Writing', collection: 'other', author: 'Jordan Lee', icon: '✎', color: 'orange-paper' }
];
let activeResourceCollection = 'all';
let activeResourceSubject = 'all';
let activeHomeworkFilter = 'yours';

const authScreen = document.querySelector('#authScreen');
const shell = document.querySelector('.shell');
let authMode = 'signin';

function showAuthError(message) {
  const el = document.querySelector('#authError');
  el.textContent = message;
  el.hidden = !message;
}

function setAuthMode(mode) {
  authMode = mode;
  showAuthError('');
  document.querySelector('#authHeading').textContent = mode === 'signin' ? 'Sign in' : 'Create your account';
  document.querySelector('#authSubtitle').textContent = mode === 'signin' ? 'Welcome back — sign in to see your homework.' : 'Set up your StudyGroup account.';
  document.querySelector('#authNameField').hidden = mode === 'signin';
  document.querySelector('#authEmailField').hidden = mode === 'signin';
  document.querySelector('#authSubmit').textContent = mode === 'signin' ? 'Sign in' : 'Sign up';
  document.querySelector('#authToggle').innerHTML = mode === 'signin'
    ? `Don't have an account? <button type="button" id="authSwitch">Sign up</button>`
    : `Already have an account? <button type="button" id="authSwitch">Sign in</button>`;
  document.querySelector('#authSwitch').addEventListener('click', () => setAuthMode(mode === 'signin' ? 'signup' : 'signin'));
}
setAuthMode('signin');

document.querySelector('#authSubmit').addEventListener('click', async () => {
  const username = document.querySelector('#authUsername').value.trim();
  const password = document.querySelector('#authPassword').value;
  showAuthError('');
  if (!username || !password) return showAuthError('Please enter a username and password.');

  if (authMode === 'signup') {
    const email = document.querySelector('#authEmail').value.trim();
    const name = document.querySelector('#authName').value.trim();
    if (!name) return showAuthError('Please enter your full name.');
    if (!email) return showAuthError('Please enter your email.');
    const { error } = await db.auth.signUp({ email, password, options: { data: { full_name: name, username } } });
    if (error) return showAuthError(error.message.includes('duplicate') || error.message.includes('unique') ? 'That username is already taken.' : error.message);
    showAuthError('Account created! Check your email if confirmation is required, then sign in.');
  } else {
    const { data: resolvedEmail, error: lookupError } = await db.rpc('get_email_by_username', { uname: username });
    if (lookupError || !resolvedEmail) return showAuthError('Invalid username or password.');
    const { error } = await db.auth.signInWithPassword({ email: resolvedEmail, password });
    if (error) return showAuthError('Invalid username or password.');
  }
});

document.querySelector('#signOutButton').addEventListener('click', async () => {
  await db.auth.signOut();
});

db.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    initializeApp();
  } else {
    currentUser = null;
    currentProfile = null;
    authScreen.classList.remove('hidden');
    shell.style.display = 'none';
  }
});

async function initializeApp() {
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
  if (error || !profile) {
    showAuthError('Could not load your profile. Try refreshing.');
    return;
  }
  currentProfile = profile;
  authScreen.classList.add('hidden');
  shell.style.display = '';

  document.querySelector('#profileName').textContent = currentProfile.full_name;
  document.querySelector('#profileRole').textContent = currentProfile.role === 'mod' ? 'Moderator' : 'Student';
  document.querySelector('#profileAvatar').textContent = initialsOf(currentProfile.full_name);
  document.querySelector('#studentName').textContent = currentProfile.full_name.split(' ')[0];
  document.querySelector('#manageNavLink').hidden = currentProfile.role !== 'mod';

  await loadEnrollments();
  await loadClassesAndHomework();
  await loadCalendarEvents();
  await loadDiscussionPosts();
  renderHomework();
  renderSchedule();
  renderResources();
  renderAgendaList();
  applyModDiscussionControls();
  await refreshModRequestUI();
  if (currentProfile.role === 'mod') {
    renderManageClasses();
    populateHomeworkClassSelect();
    renderManageHomework();
    renderManageEvents();
    await loadCorrections();
    await loadModRequests();
  } 
}

function initialsOf(name) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

const dashboardAssignments = document.querySelector('#dashboardAssignments');
const focusAssignment = document.querySelector('#focusAssignment');
const homeworkList = document.querySelector('#homeworkList');
const courseFilter = document.querySelector('#courseFilter');

async function loadEnrollments() {
  const { data } = await db.from('enrollments').select('class_id').eq('student_id', currentUser.id);
  enrolledClassIds = new Set((data || []).map(row => row.class_id));
}

async function loadClassesAndHomework() {
  const { data: classesData } = await db.from('classes').select('*').order('name');
  classes = classesData || [];

  const { data: homeworkData } = await db.from('homework').select('*, classes(*), profiles!homework_created_by_fkey(full_name)').order('due_date', { ascending: true, nullsFirst: false });
  const { data: completionsData } = await db.from('completions').select('homework_id').eq('student_id', currentUser.id);
  const completedSet = new Set((completionsData || []).map(c => c.homework_id));

  const { data: calendarEventsData, error: calendarEventsError } = await db
  .from('calendar_events')
  .select('*')
  .order('event_date', { ascending: true });

  calendarEvents = calendarEventsError ? [] : (calendarEventsData || []);

  assignments = (homeworkData || []).map(h => ({
    id: h.id,
    classId: h.class_id,
    course: h.classes?.name || 'Unknown class',
    subject: h.classes?.subject_code || 'other',
    teacher: h.classes?.teacher || '',
    postedBy: h.profiles?.full_name || 'a moderator',
    title: h.title,
    description: h.description || '',
    dueDate: h.due_date ? new Date(h.due_date + 'T00:00:00') : null,
    dueDateRaw: h.due_date || '',
    due: h.due_date ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(h.due_date + 'T00:00:00')) : 'No due date',
    completed: completedSet.has(h.id),
    enrolled: enrolledClassIds.has(h.class_id)
  }));

  const courseNames = [...new Set(classes.map(c => c.name))];
  courseFilter.innerHTML = `<option>All classes</option>${courseNames.map(course => `<option>${course}</option>`).join('')}`;
  if (typeof renderCalendar === 'function') {
    renderCalendar();
  }
}

function assignmentIcon(classId) {
  return getConsistentVisuals(classId).icon;
}

function assignmentTagColor(classId) {
  return getConsistentVisuals(classId).color;
}

function sortedIncomplete() {
  return assignments.filter(a => !a.completed && a.enrolled).sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
}

function updateDashboardAssignments() {
  const upcoming = sortedIncomplete();
  const focus = upcoming[0];
  const overviewAssignments = upcoming.slice(1, 4);

  focusAssignment.hidden = !focus;
  if (focus) {
    document.querySelector('#focusDue').textContent = `Due ${focus.due}`;
    document.querySelector('#focusDot').className = `subject-dot ${focus.subject}`;
    document.querySelector('#focusDot').textContent = assignmentIcon(focus.subject);
    document.querySelector('#focusTitle').textContent = focus.title;
    document.querySelector('#focusMeta').innerHTML = `${escapeHtml(focus.course)} <span>·</span> ${escapeHtml(focus.teacher)}`;
    document.querySelector('#focusFooter').textContent = `Posted by ${focus.postedBy}`;
    const focusButton = document.querySelector('#completeFocus');
    focusButton.dataset.id = focus.id;
    focusButton.classList.remove('completed');
    focusButton.innerHTML = '<span>✓</span> Mark complete';
  }

  dashboardAssignments.innerHTML = overviewAssignments.length ? overviewAssignments.map(a => {
    const initials = (a.teacher || '').split(' ').map(part => part[0]).join('').slice(0, 2);
    return `<article class="assignment-card" data-id="${a.id}"><div class="card-meta"><span class="course-tag ${assignmentTagColor(a.subject)}">${escapeHtml(a.course)}</span><span>Due ${escapeHtml(a.due)}</span></div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description)}</p><div class="card-bottom"><span class="teacher"><i class="mini-avatar">${escapeHtml(initials)}</i> ${escapeHtml(a.teacher)}</span><button class="circle-check dashboard-check" aria-label="Complete assignment">✓</button></div></article>`;
  }).join('') : '<p class="empty-homework">Nothing to show here right now — you\'re all caught up!</p>';

  const remaining = upcoming.length;
  document.querySelector('#assignmentCount').textContent = `${remaining} assignment${remaining === 1 ? '' : 's'}`;
}

function matchingAssignments() {
  const course = courseFilter.value;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return assignments.filter(a => {
    const matchesTab = activeHomeworkFilter === 'all' ||
      (activeHomeworkFilter === 'yours' && !a.completed && a.enrolled) ||
      (activeHomeworkFilter === 'week' && a.dueDate && a.dueDate >= now && a.dueDate <= weekFromNow) ||
      (activeHomeworkFilter === 'completed' && a.completed);
    return matchesTab && (course === 'All classes' || a.course === course);
  });
}

function updateFilterCounts() {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const counts = {
    yours: assignments.filter(a => !a.completed && a.enrolled).length,
    week: assignments.filter(a => a.dueDate && a.dueDate >= now && a.dueDate <= weekFromNow).length,
    completed: assignments.filter(a => a.completed).length,
    all: assignments.length
  };
  document.querySelectorAll('.filter').forEach(button => { button.querySelector('b').textContent = counts[button.dataset.filter]; });
  document.querySelector('#homeworkNavCount').textContent = counts.yours;
}

function renderHomework() {
  const visibleAssignments = matchingAssignments();
  homeworkList.innerHTML = visibleAssignments.length ? visibleAssignments.map(a => {
    return `<article class="homework-row ${a.completed ? 'is-complete' : ''}"><span class="subject-dot ${a.subject}">${assignmentIcon(a.subject)}</span><div class="homework-main"><span class="course-tag ${assignmentTagColor(a.subject)}">${escapeHtml(a.course)}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description)}</p><small>${escapeHtml(a.teacher)}</small></div><div class="homework-due"><b>${escapeHtml(a.due)}</b><small>Due date</small></div><button class="circle-check homework-check ${a.completed ? 'done' : ''}" data-id="${a.id}" aria-label="${a.completed ? 'Mark incomplete' : 'Mark complete'}">✓</button></article>`;
  }).join('') : '<p class="empty-homework">No assignments found for this view.</p>';
  updateFilterCounts();
  updateDashboardAssignments();
}

async function toggleCompletion(assignment) {
  if (!assignment.completed) {
    await db.from('completions').insert({ student_id: currentUser.id, homework_id: assignment.id });
    assignment.completed = true;
  } else {
    await db.from('completions').delete().eq('student_id', currentUser.id).eq('homework_id', assignment.id);
    assignment.completed = false;
  }
  renderHomework();
  toast(assignment.completed ? 'Marked as completed.' : 'Marked as incomplete.');
}

homeworkList.addEventListener('click', event => {
  const button = event.target.closest('.homework-check');
  if (!button) return;
  const assignment = assignments.find(a => a.id === button.dataset.id);
  if (assignment) toggleCompletion(assignment);
});

document.querySelector('#completeFocus').addEventListener('click', e => {
  const assignment = assignments.find(a => a.id === e.currentTarget.dataset.id);
  if (assignment) toggleCompletion(assignment);
});

dashboardAssignments.addEventListener('click', event => {
  const button = event.target.closest('.dashboard-check');
  if (!button) return;
  const card = button.closest('.assignment-card');
  const assignment = assignments.find(a => a.id === card.dataset.id);
  if (assignment) toggleCompletion(assignment);
});

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeHomeworkFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  renderHomework();
}));
courseFilter.addEventListener('change', renderHomework);

// ============================================
// Calendar
// ============================================
const grid = document.querySelector('#calendarGrid');
const calendarMonth = document.querySelector('#calendarMonth');
const calendarLegend = document.querySelector('#calendarLegend');

const todayDate = new Date();
const currentMonthIndex = todayDate.getMonth();
const currentDay = todayDate.getDate();
const currentYear = todayDate.getFullYear();

let displayedMonth = currentMonthIndex;
let displayedYear = currentYear;

const calendarColors = [
  { bg: 'blue-bg', line: 'blue-line' },
  { bg: 'purple-bg', line: 'purple-line' },
  { bg: 'orange-bg', line: 'orange-line' },
  { bg: 'gold-bg', line: 'gold-line' }
];

function getEnrolledClassesForCalendar() {
  return classes.filter(c => enrolledClassIds.has(c.id));
}

function getClassColor(classId) {
  const enrolledClasses = getEnrolledClassesForCalendar();
  const index = enrolledClasses.findIndex(c => c.id === classId);

  if (index === -1) {
    return calendarColors[0];
  }

  return calendarColors[index % calendarColors.length];
}

function renderCalendarLegend() {
  const enrolledClasses = getEnrolledClassesForCalendar();

  const classLegend = enrolledClasses.map((classItem, index) => {
    const color = calendarColors[index % calendarColors.length];

    return `
      <span>
        <i class="legend-dot ${color.bg}"></i>
        ${escapeHtml(classItem.name)}
      </span>
    `;
  }).join('');

  calendarLegend.innerHTML =
    classLegend +
    `<span><i class="legend-dot event-bg"></i>Upcoming events</span>`;
}

function getCalendarAssignments(year, month) {
  return assignments.filter(assignment => {
    if (!assignment.enrolled || !assignment.dueDate) return false;

    return (
      assignment.dueDate.getFullYear() === year &&
      assignment.dueDate.getMonth() === month
    );
  });
}

function getCalendarEvents(year, month) {
  return calendarEvents.filter(event => {
    const eventDate = new Date(event.event_date + 'T00:00:00');

    return (
      eventDate.getFullYear() === year &&
      eventDate.getMonth() === month
    );
  });
}

function renderCalendar() {
  const year = displayedYear;
  const firstDay = new Date(year, displayedMonth, 1).getDay();
  const mondayFirstOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, displayedMonth + 1, 0).getDate();
  const totalCells = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;

  calendarMonth.textContent = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, displayedMonth, 1));

  renderCalendarLegend();

  const monthAssignments = getCalendarAssignments(year, displayedMonth);
  const monthEvents = getCalendarEvents(year, displayedMonth);

  grid.innerHTML = Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayFirstOffset + 1;
    const isCurrentMonth = day > 0 && day <= daysInMonth;

    if (!isCurrentMonth) {
      return `<div class="day empty-day"><span></span></div>`;
    }

    const isToday =
      displayedMonth === currentMonthIndex &&
      displayedYear === currentYear &&
      day === currentDay;

    const dayAssignments = monthAssignments.filter(assignment => {
      return assignment.dueDate.getDate() === day;
    });

    const dayEvents = monthEvents.filter(event => {
      const eventDate = new Date(event.event_date + 'T00:00:00');
      return eventDate.getDate() === day;
    });

    const assignmentHtml = dayAssignments.map(assignment => {
      const color = getClassColor(assignment.classId);

      return `
        <div class="calendar-event ${color.bg}" title="${escapeHtml(assignment.title)}">
          ${escapeHtml(assignment.title)}
        </div>
      `;
    }).join('');

    const eventHtml = dayEvents.map(event => {
      return `
        <div class="calendar-event event-bg" title="${escapeHtml(event.description || event.title)}">
          ${escapeHtml(event.title)}
        </div>
      `;
    }).join('');

    return `
      <div class="day ${isToday ? 'today' : ''}">
        <span>${day}</span>
        ${assignmentHtml}
        ${eventHtml}
      </div>
    `;
  }).join('');
}

renderCalendar();

document.querySelector('#previousMonth').addEventListener('click', () => {
  if (displayedMonth === 0) {
    displayedMonth = 11;
    displayedYear--;
  } else {
    displayedMonth--;
  }

  renderCalendar();
});

document.querySelector('#nextMonth').addEventListener('click', () => {
  if (displayedMonth === 11) {
    displayedMonth = 0;
    displayedYear++;
  } else {
    displayedMonth++;
  }

  renderCalendar();
});

document.querySelector('#todayButton').addEventListener('click', () => {
  displayedMonth = currentMonthIndex;
  displayedYear = currentYear;
  renderCalendar();
});

const currentDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
document.querySelector('#topbarDate').textContent = currentDate;
document.querySelector('#dashboardDate').textContent = currentDate;

// ============================================
// Navigation + URL routing
// ============================================

const BASE_PATH = '/study-group';

const validViews = [
  'dashboard',
  'homework',
  'calendar',
  'resources',
  'manage',
  'settings'
];

function getViewFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '');

  if (path === '' || path === BASE_PATH) {
    const savedRoute = sessionStorage.getItem('study-group-route');

    if (savedRoute) {
      sessionStorage.removeItem('study-group-route');

      const savedView = savedRoute.replace(/^\/+/, '');

      if (validViews.includes(savedView)) {
        return savedView;
      }
    }

    return 'dashboard';
  }

  const prefix = `${BASE_PATH}/`;

  if (path.startsWith(prefix)) {
    const view = path.slice(prefix.length).split('/')[0];

    if (validViews.includes(view)) {
      return view;
    }
  }

  return 'dashboard';
}

function updateUrl(view, replace = false) {
  const path = view === 'dashboard'
    ? `${BASE_PATH}/`
    : `${BASE_PATH}/${view}`;

  if (window.location.pathname !== path) {
    if (replace) {
      window.history.replaceState({ view }, '', path);
    } else {
      window.history.pushState({ view }, '', path);
    }
  }
}

function showView(view, updateHistory = true) {
  if (!validViews.includes(view)) {
    view = 'dashboard';
  }

  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active-view');
  });

  const targetView = document.querySelector(`#${view}`);

  if (!targetView) {
    console.error(`View "${view}" was not found.`);
    return;
  }

  targetView.classList.add('active-view');

  document.querySelectorAll('.nav-link').forEach(nav => {
    nav.classList.toggle('active', nav.dataset.view === view);
  });

  document.querySelector('#crumb').innerHTML =
    `${view === 'dashboard' ? 'Dashboard' : view[0].toUpperCase() + view.slice(1)}
    <span>/</span>
    ${view === 'dashboard' ? currentDate : 'Interlake High School'}`;

  if (updateHistory) {
    updateUrl(view);
  }

  window.scrollTo(0, 0);

  if (view === 'manage' && currentProfile?.role === 'mod') {
    loadCorrections();
    loadModRequests();
  }
}

// Handle clicks on navigation links
document.querySelectorAll('[data-view]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();

    const view = link.dataset.view;

    showView(view);
  });
});

// Handle browser Back / Forward buttons
window.addEventListener('popstate', () => {
  showView(getViewFromPath(), false);
});

// Start on the correct URL
const initialView = getViewFromPath();
showView(initialView, false);
updateUrl(initialView, true); // sync the address bar (replace, not push, so back button stays clean)

function toast(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2600); }

const resourceGrid = document.querySelector('#resourceGrid');
const resourceSubjectFilter = document.querySelector('#resourceSubjectFilter');

function renderResources() {
  const enrolledClasses = classes.filter(c => enrolledClassIds.has(c.id));
  const selectedSubject = resourceSubjectFilter.value;
  resourceSubjectFilter.innerHTML = `<option value="all">All subjects</option>${enrolledClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}`;
  resourceSubjectFilter.value = enrolledClasses.some(c => c.id === selectedSubject) ? selectedSubject : 'all';
  
  const visibleResources = resources.filter(resource =>
    (activeResourceCollection === 'all' || resource.collection === activeResourceCollection) &&
    (activeResourceSubject === 'all' || resource.classId === activeResourceSubject)
  );

  resourceGrid.innerHTML = visibleResources.length ? visibleResources.map(resource => {
    // Assign random icon and color if not already assigned
    if (!resource.icon) resource.icon = getRandomItem(iconPool);
    if (!resource.color) resource.color = getRandomItem(colorPool);

    const subjectLabel = resource.className || 'General';
    return `<article class="resource-card clickable-resource-card" data-index="${resources.indexOf(resource)}"><div class="resource-icon ${resource.color}">${resource.icon}</div><div><span class="resource-type">${escapeHtml(resource.type).toUpperCase()} · ${escapeHtml(subjectLabel).toUpperCase()}</span><h3>${escapeHtml(resource.title)}</h3><p>Shared by ${escapeHtml(resource.author)}</p></div>${currentProfile?.role === 'mod' ? `<button class="mod-delete" aria-label="Delete resource">🗑</button>` : ''}</article>`;
  }).join('') : '<p class="empty-resources">No resources in this collection yet.</p>';
}

resourceGrid.addEventListener('click', event => {
  const deleteBtn = event.target.closest('.mod-delete');
  if (deleteBtn) {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    const card = deleteBtn.closest('.resource-card');
    const index = Number(card.dataset.index);
    resources.splice(index, 1);
    renderResources();
    toast('Resource removed.');
    return;
  }

  const card = event.target.closest('.clickable-resource-card');
  if (!card) return;
  const index = Number(card.dataset.index);
  const resource = resources[index];
  if (!resource) return;

  // Open popup modal showing details, description, and link
  const safeLink = /^https?:\/\//i.test(resource.link || '') ? resource.link : '#';
  openModal(
    resource.title, 
    `Shared by ${resource.author} · Type: ${resource.type.toUpperCase()}`, 
    'resource-detail',
    resource
  );
});

document.querySelectorAll('[data-resource-collection]').forEach(button => button.addEventListener('click', () => {
  activeResourceCollection = button.dataset.resourceCollection;
  document.querySelectorAll('.resource-tabs [data-resource-collection]').forEach(tab => tab.classList.toggle('active', tab.dataset.resourceCollection === activeResourceCollection));
  renderResources();
}));
resourceSubjectFilter.addEventListener('change', () => {
  activeResourceSubject = resourceSubjectFilter.value;
  renderResources();
});
renderResources();

const modal = document.querySelector('#modal');
const modalEyebrow = document.querySelector('#modalEyebrow');
const modalFields = document.querySelector('#modalFields');
let modalType = 'correction';
function openModal(title, text, type = 'correction', extraData = null) {
  modalType = type;
  document.querySelector('#modalTitle').textContent = title;
  document.querySelector('#modalText').textContent = text;
  modalEyebrow.hidden = type === 'correction';
  
  if (type === 'resource') {
    const enrolledClasses = classes.filter(c => enrolledClassIds.has(c.id));
    const classOptions = enrolledClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    modalFields.innerHTML = `<label>Title<input id="resourceTitle" type="text" placeholder="e.g., Unit 3 study guide" required></label><label>Class<select id="resourceClass">${classOptions || '<option value="">No classes in your schedule yet</option>'}</select></label><label>Category<select id="resourceCategory" required><option value="notes">Notes</option><option value="practice">Practice</option><option value="study guide">Study guide</option><option value="other">Other</option></select></label><label>Collection<select id="resourceCollection" required><option value="AP">AP</option><option value="IB">IB</option><option value="SAT">SAT</option><option value="ACT">ACT</option><option value="elective">Elective</option><option value="other">Other</option></select></label><label>Link<input id="resourceLink" type="url" placeholder="https://" required></label><label>Description<textarea id="resourceDescription" placeholder="What is this material good for?" required></textarea></label>`;
    document.querySelector('#submitModal').textContent = 'Share resource';
    document.querySelector('#submitModal').style.display = '';
  } else if (type === 'resource-detail' && extraData) {
    const safeLink = /^https?:\/\//i.test(extraData.link || '') ? extraData.link : '#';
    modalFields.innerHTML = `
      <div class="resource-detail-meta">
        <p><b>Description:</b></p>
        <p style="margin-top: 4px; margin-bottom: 16px; color: var(--text-muted);">${escapeHtml(extraData.description || 'No description provided.')}</p>
        <p><b>Link:</b></p>
        <a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer" class="text-link" style="display: inline-block; margin-top: 4px;">Open resource link ↗</a>
      </div>
    `;
    document.querySelector('#submitModal').style.display = 'none'; // Hide submit button for viewing details
  } else if (type === 'discussion') {
    const enrolledClasses = classes.filter(c => enrolledClassIds.has(c.id));
    const classOptions = enrolledClasses.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    modalFields.innerHTML = `
      <label>Title of post<input id="discussionTitle" type="text" placeholder="What do you want to discuss?" required></label>
      <label>Subject (optional)
        <select id="discussionSubject">
          <option value="">Select a subject...</option>
          ${classOptions}
        </select>
      </label>
      <label>Description of post<textarea id="discussionDescription" placeholder="Add context or a question for your classmates." required></textarea></label>
    `;
    document.querySelector('#submitModal').textContent = 'Create post';
    document.querySelector('#submitModal').style.display = '';
  } else {
    const options = assignments.map(a => `<option value="${a.id}">${escapeHtml(a.course)} — ${escapeHtml(a.title)}</option>`).join('');
    modalFields.innerHTML = `<label>Which assignment?<select id="correctionHomework">${options || '<option value="">No homework posted yet</option>'}</select></label><label>What needs to change?<textarea id="correctionText" placeholder="Describe the issue or update…"></textarea></label>`;
    document.querySelector('#submitModal').textContent = 'Send request';
    document.querySelector('#submitModal').style.display = '';
  }
  modal.classList.add('open');
}

document.querySelector('#requestEdit').addEventListener('click', ()=>openModal('Request a correction', "Tell the moderators what needs updating. They'll review it shortly."));
document.querySelector('#shareResource').addEventListener('click', ()=>openModal('Share a resource', 'Help your classmates by sharing a link, guide, or study material.', 'resource'));
const addDiscussion = document.querySelector('.dots');
addDiscussion.textContent = '+';
addDiscussion.classList.add('add-discussion');
addDiscussion.setAttribute('aria-label', 'Create discussion post');
addDiscussion.addEventListener('click', ()=>openModal('Create a discussion post', 'Share a question, idea, or study tip with your classmates.', 'discussion'));
document.querySelector('#closeModal').addEventListener('click', ()=>modal.classList.remove('open'));
modal.addEventListener('click', e=> { if(e.target === modal) modal.classList.remove('open'); });
document.querySelector('#submitModal').addEventListener('click', async () => {
  if (modalType === 'resource') {
    const title = document.querySelector('#resourceTitle').value.trim();
    const classId = document.querySelector('#resourceClass').value;
    const className = classes.find(c => c.id === classId)?.name || '';
    const category = document.querySelector('#resourceCategory').value;
    const collection = document.querySelector('#resourceCollection').value;
    const link = document.querySelector('#resourceLink').value.trim();
    const description = document.querySelector('#resourceDescription').value.trim();
    if (!title || !link || !description) return toast('Please complete all three resource fields.');
    resources.unshift({ title, type: category, classId: classId || null, className, collection, author: currentProfile.full_name, icon: '↗', color: 'green-paper', link, description });
    activeResourceCollection = collection;
    activeResourceSubject = 'all';
    document.querySelectorAll('.resource-tabs [data-resource-collection]').forEach(tab => tab.classList.toggle('active', tab.dataset.resourceCollection === collection));
    renderResources();
    modal.classList.remove('open');
    return toast('Resource shared with your study group.');
  }
if (modalType === 'discussion') {
    const title = document.querySelector('#discussionTitle').value.trim();
    const classId = document.querySelector('#discussionSubject').value || null;
    const description = document.querySelector('#discussionDescription').value.trim();

    if (!title || !description) return toast('Please add a title and description.');

    const { error } = await db.from('discussion_posts').insert({
      author_id: currentUser.id,
      class_id: classId,
      title,
      description
    });

    if (error) return toast('Could not save post: ' + error.message);

    const todayStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
    const className = classes.find(c => c.id === classId)?.name;
    const subjectHtml = className ? `<span class="course-tag blue" style="margin-bottom: 8px; display: inline-block;">${escapeHtml(className)}</span>` : '';

    const post = document.createElement('article');
    post.className = 'community-post';
    post.innerHTML = `<div class="post-head"><i class="mini-avatar green">${escapeHtml(initialsOf(currentProfile.full_name))}</i><div><b>${escapeHtml(currentProfile.full_name)}</b><p>${escapeHtml(todayStr)}</p></div></div><h3 class="discussion-title"></h3>${subjectHtml}<p class="discussion-description"></p><div class="post-actions"><button class="heart-button" aria-label="Like post">♡ <span>0</span></button><button class="replies-toggle" aria-expanded="false">◌ <span>0 replies</span></button></div><div class="replies" hidden></div>`;
    
    post.querySelector('.discussion-title').textContent = title;
    post.querySelector('.discussion-description').textContent = description;
    
    setupDiscussionPost(post);
    document.querySelector('.discussion-feed').prepend(post);
    modal.classList.remove('open');
    return toast('Discussion post created.');
  }
  const homeworkId = document.querySelector('#correctionHomework')?.value;
  const suggestedChange = document.querySelector('#correctionText').value.trim();
  if (!homeworkId || !suggestedChange) return toast('Please pick an assignment and describe the change.');
  const { error } = await db.from('corrections').insert({ homework_id: homeworkId, submitted_by: currentUser.id, suggested_change: suggestedChange });
  modal.classList.remove('open');
  if (error) return toast('Could not send your request. Try again.');
  toast('Sent to the StudyGroup moderators.');
  if (currentProfile.role === 'mod') await loadCorrections();
});
document.querySelector('#editSchedule').addEventListener('click', ()=>document.querySelector('[data-view="settings"]').click());
document.querySelector('#profileButton').addEventListener('click', ()=>toast(`Signed in as ${currentProfile.full_name} · ${currentProfile.role === 'mod' ? 'Moderator' : 'Student'}`));

function setupDiscussionPost(post) {
  post.querySelector('.post-actions button')?.classList.add('heart-button');
  post.querySelectorAll('.replies p').forEach(reply => {
    if (reply.querySelector('.reply-heart')) return;
    const heart = document.createElement('button');
    heart.className = 'heart-button reply-heart';
    heart.setAttribute('aria-label', 'Like reply');
    heart.innerHTML = '♡ <span>0</span>';
    reply.append(' ', heart);
  });
  const replies = post.querySelector('.replies');
  if (!replies.querySelector('.reply-composer')) {
    const composer = document.createElement('form');
    composer.className = 'reply-composer';
    composer.innerHTML = '<label>reply</label><div><input class="reply-input" type="text" placeholder="Write a reply…" aria-label="Write a reply"><button type="submit">Post</button></div>';
    replies.append(composer);
  }
  applyModDiscussionControls(post);
}
function applyModDiscussionControls(scope) {
  if (currentProfile?.role !== 'mod') return;
  const posts = scope ? [scope] : document.querySelectorAll('.community-post');
  posts.forEach(post => {
    const actions = post.querySelector('.post-actions');
    if (actions && !actions.querySelector('.mod-delete-post')) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'mod-delete mod-delete-post';
      deleteButton.setAttribute('aria-label', 'Delete post');
      deleteButton.textContent = '🗑 Delete post';
      actions.append(deleteButton);
    }
    post.querySelectorAll('.replies p').forEach(reply => {
      if (reply.querySelector('.reply-delete')) return;
      const deleteButton = document.createElement('button');
      deleteButton.className = 'mod-delete reply-delete';
      deleteButton.setAttribute('aria-label', 'Delete reply');
      deleteButton.textContent = '×';
      reply.append(deleteButton);
    });
  });
}
document.querySelectorAll('.community-post').forEach(setupDiscussionPost);
document.querySelector('.discussion-feed').addEventListener('click', async event => {
  const deletePost = event.target.closest('.mod-delete-post');
  if (deletePost) {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;
    const postArticle = deletePost.closest('.community-post');
    const postId = postArticle.dataset.id;

    if (postId) {
      const { error } = await db.from('discussion_posts').delete().eq('id', postId);
      if (error) return toast('Could not delete post: ' + error.message);
    }

    postArticle.remove();
    return toast('Post removed.');
  }
  const deleteReply = event.target.closest('.reply-delete');
  if (deleteReply) {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    const replyP = deleteReply.closest('p');
    const replyId = replyP.dataset.replyId;

    if (replyId) {
      const { error } = await db.from('discussion_replies').delete().eq('id', replyId);
      if (error) return toast('Could not delete reply: ' + error.message);
    }

    await loadDiscussionPosts();
    return toast('Reply removed.');
  }

  const heart = event.target.closest('.heart-button');
  if (heart && !heart.classList.contains('reply-heart')) {
    const postArticle = heart.closest('.community-post');
    const postId = postArticle.dataset.id;
    const isLiked = heart.classList.contains('liked');

    if (isLiked) {
      // Unlike: remove from database
      const { error } = await db.from('discussion_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      if (error) return toast('Could not update like.');
    } else {
      // Like: insert into database
      const { error } = await db.from('discussion_likes').insert({ post_id: postId, user_id: currentUser.id });
      if (error) return toast('Could not update like.');
    }

    await loadDiscussionPosts();
    return;
  }

  const button = event.target.closest('.replies-toggle');
  if (!button) return;
  const replies = button.closest('.community-post').querySelector('.replies');
  const isOpen = !replies.hidden;
  replies.hidden = isOpen;
  button.setAttribute('aria-expanded', String(!isOpen));
});
document.querySelector('.discussion-feed').addEventListener('submit', async event => {
  const composer = event.target.closest('.reply-composer');
  if (!composer) return;
  event.preventDefault();
  
  const input = composer.querySelector('.reply-input');
  const replyText = input.value.trim();
  if (!replyText) return;

  const postArticle = composer.closest('.community-post');
  const postId = postArticle.dataset.id;

  const { error } = await db.from('discussion_replies').insert({
    post_id: postId,
    author_id: currentUser.id,
    content: replyText
  });

  if (error) return toast('Could not post reply: ' + error.message);

  input.value = '';
  await loadDiscussionPosts();
  toast('Reply posted.');
});

function renderManageClasses() {
  const list = document.querySelector('#manageClassList');
  list.innerHTML = classes.length ? classes.map(c => {
    const visuals = getConsistentVisuals(c.id);
    return `
      <div class="class-setting">
        <span class="subject-dot ${visuals.color}">${visuals.icon}</span>
        <div><b>${escapeHtml(c.name)}</b><p>${escapeHtml(c.teacher)}</p></div>
        <button class="delete-class" data-id="${c.id}">Remove</button>
      </div>
    `;
  }).join('') : '<p class="empty-homework">No classes yet — add one below.</p>';
}

document.querySelector('#addClassButton').addEventListener('click', async () => {
  const name = document.querySelector('#newClassName').value.trim();
  const teacher = document.querySelector('#newClassTeacher').value.trim();
  if (!name || !teacher) return toast('Please enter a class name and teacher.');
  const { error } = await db.from('classes').insert({ name, teacher, subject_code: 'other', created_by: currentUser.id });
  if (error) return toast('Could not add class: ' + error.message);
  document.querySelector('#newClassName').value = '';
  document.querySelector('#newClassTeacher').value = '';
  await loadClassesAndHomework();
  renderManageClasses();
  populateHomeworkClassSelect();
  renderManageHomework();
  renderHomework();
  toast('Class added.');
});

document.querySelector('#manageClassList').addEventListener('click', async event => {
  const button = event.target.closest('.delete-class');
  if (!button) return;
  const { error } = await db.from('classes').delete().eq('id', button.dataset.id);
  if (error) return toast('Could not remove class — it may still have homework attached.');
  await loadClassesAndHomework();
  renderManageClasses();
  populateHomeworkClassSelect();
  renderManageHomework();
  renderHomework();
  toast('Class removed.');
});

function populateHomeworkClassSelect() {
  const select = document.querySelector('#homeworkClassSelect');

  select.innerHTML = classes.map(c => {
    const className = escapeHtml(c.name);
    const teacherName = escapeHtml(c.teacher || 'Teacher not specified');

    return `<option value="${c.id}">${className} (${teacherName})</option>`;
  }).join('') || '<option value="">Add a class first</option>';
}

document.querySelector('#postHomeworkButton').addEventListener('click', async () => {
  const class_id = document.querySelector('#homeworkClassSelect').value;
  const title = document.querySelector('#homeworkTitleInput').value.trim();
  const description = document.querySelector('#homeworkDescInput').value.trim();
  const due_date = document.querySelector('#homeworkDueInput').value || null;
  if (!class_id || !title) return toast('Please choose a class and enter a title.');
  const { error } = await db.from('homework').insert({ class_id, title, description, due_date, created_by: currentUser.id });
  if (error) return toast('Could not post homework: ' + error.message);
  document.querySelector('#homeworkTitleInput').value = '';
  document.querySelector('#homeworkDescInput').value = '';
  document.querySelector('#homeworkDueInput').value = '';
  await loadClassesAndHomework();
  renderHomework();
  renderManageHomework();
  toast('Homework posted.');
});

// ============================================
// Mod tools: view, edit, and delete any existing homework
// ============================================
let editingHomeworkId = null;

function renderManageHomework() {
  const container = document.querySelector('#manageHomeworkList');
  if (!container) return;
  if (!assignments.length) {
    container.innerHTML = '<p class="empty-homework">No homework posted yet.</p>';
    return;
  }
  container.innerHTML = assignments.map(a => {
    if (a.id === editingHomeworkId) {
      const classOptions = classes.map(c => `<option value="${c.id}" ${c.id === a.classId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
      return `<div class="manage-homework-row editing" data-id="${a.id}"><div class="manage-form">
        <label>Class<select class="edit-class">${classOptions}</select></label>
        <label>Title<input class="edit-title" type="text" value="${escapeHtml(a.title)}"></label>
        <label>Description<textarea class="edit-description">${escapeHtml(a.description || '')}</textarea></label>
        <label>Due date<input class="edit-due" type="date" value="${a.dueDate ? a.dueDate.toISOString().slice(0, 10) : ''}"></label>
        <div class="correction-actions"><button class="approve save-homework" data-id="${a.id}">Save</button><button class="reject cancel-homework" data-id="${a.id}">Cancel</button></div>
      </div></div>`;
    }
    return `<div class="manage-homework-row" data-id="${a.id}">
      <div><span class="course-tag ${assignmentTagColor(a.subject)}">${escapeHtml(a.course)}</span><b>${escapeHtml(a.title)}</b><p>${escapeHtml(a.description || 'No description')}</p><small>Due ${escapeHtml(a.due)} · Posted by ${escapeHtml(a.postedBy)}</small></div>
      <div class="correction-actions"><button class="approve edit-homework" data-id="${a.id}">Edit</button><button class="reject delete-homework" data-id="${a.id}">Delete</button></div>
    </div>`;
  }).join('');
}

document.querySelector('#manageHomeworkList').addEventListener('click', async event => {
  const editButton = event.target.closest('.edit-homework');
  if (editButton) {
    editingHomeworkId = editButton.dataset.id;
    renderManageHomework();
    return;
  }
  const cancelButton = event.target.closest('.cancel-homework');
  if (cancelButton) {
    editingHomeworkId = null;
    renderManageHomework();
    return;
  }
  const deleteButton = event.target.closest('.delete-homework');
  if (deleteButton) {
    if (!window.confirm('Delete this homework? This cannot be undone.')) return;
    const { error } = await db.from('homework').delete().eq('id', deleteButton.dataset.id);
    if (error) return toast('Could not delete homework: ' + error.message);
    await loadClassesAndHomework();
    renderHomework();
    renderManageHomework();
    toast('Homework deleted.');
    return;
  }
  const saveButton = event.target.closest('.save-homework');
  if (saveButton) {
    const row = saveButton.closest('.manage-homework-row');
    const class_id = row.querySelector('.edit-class').value;
    const title = row.querySelector('.edit-title').value.trim();
    const description = row.querySelector('.edit-description').value.trim();
    const due_date = row.querySelector('.edit-due').value || null;
    if (!class_id || !title) return toast('Please choose a class and enter a title.');
    const { error } = await db.from('homework').update({ class_id, title, description, due_date }).eq('id', saveButton.dataset.id);
    if (error) return toast('Could not update homework: ' + error.message);
    editingHomeworkId = null;
    await loadClassesAndHomework();
    renderHomework();
    renderManageHomework();
    toast('Homework updated.');
  }
});


// ============================================
// Moderator calendar events
// ============================================
async function loadCalendarEvents() {
  const { data, error } = await db
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    calendarEvents = [];
    return;
  }

  calendarEvents = data || [];
}

function renderAgendaList() {
  const container = document.querySelector('#agendaList');
  if (!container) return;

  const upcomingEvents = calendarEvents
    .filter(event => event.event_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);

  if (!upcomingEvents.length) {
    container.innerHTML = '<p class="empty-homework">No upcoming events right now.</p>';
    return;
  }

  const lineColors = ['blue-line', 'purple-line', 'orange-line'];
  container.innerHTML = upcomingEvents.map((event, index) => {
    const date = new Date(event.event_date + 'T00:00:00');
    const short = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(date);
    return `<div class="agenda-item"><time>${escapeHtml(short)}</time><span class="agenda-line ${lineColors[index % lineColors.length]}"></span><div><b>${escapeHtml(event.title)}</b><p>${escapeHtml(event.description || '')}</p></div></div>`;
  }).join('');
}

function renderManageEvents() {
  const container = document.querySelector('#manageEventList');

  if (!container) return;

  const upcomingEvents = calendarEvents
    .filter(event => event.event_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  if (!upcomingEvents.length) {
    container.innerHTML = '<p class="empty-homework">No upcoming events yet.</p>';
    return;
  }

  container.innerHTML = upcomingEvents.map(event => {
    const date = new Date(event.event_date + 'T00:00:00');

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);

    return `
      <div class="manage-homework-row" data-id="${event.id}">
        <div>
          <span class="course-tag gold">EVENT</span>
          <b>${escapeHtml(event.title)}</b>
          <p>${escapeHtml(event.description || 'No description')}</p>
          <small>${escapeHtml(formattedDate)}</small>
        </div>

        <div class="correction-actions">
          <button class="reject delete-calendar-event" data-id="${event.id}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

document.querySelector('#addEventButton')?.addEventListener('click', async () => {
  const title = document.querySelector('#newEventTitle').value.trim();
  const event_date = document.querySelector('#newEventDate').value;
  const description = document.querySelector('#newEventDescription').value.trim();

  if (!title || !event_date) {
    return toast('Please enter an event title and date.');
  }

  const { error } = await db
    .from('calendar_events')
    .insert({
      title,
      event_date,
      description: description || null,
      created_by: currentUser.id
    });

  if (error) {
    return toast('Could not add event: ' + error.message);
  }

  document.querySelector('#newEventTitle').value = '';
  document.querySelector('#newEventDate').value = '';
  document.querySelector('#newEventDescription').value = '';

  await loadCalendarEvents();

  renderManageEvents();
  renderAgendaList();
  renderCalendar();

  toast('Event added to the calendar.');
});

document.querySelector('#manageEventList')?.addEventListener('click', async event => {
  const button = event.target.closest('.delete-calendar-event');

  if (!button) return;

  if (!window.confirm('Delete this calendar event? This cannot be undone.')) {
    return;
  }

  const { error } = await db
    .from('calendar_events')
    .delete()
    .eq('id', button.dataset.id);

  if (error) {
    return toast('Could not delete event: ' + error.message);
  }

  await loadCalendarEvents();

  renderManageEvents();
  renderAgendaList();
  renderCalendar();

  toast('Event deleted.');
});

// ============================================
// Your schedule (enrollments) — controls which classes count toward "Your assignments"
// ============================================
function renderSchedule() {
  const enrolledClasses = classes.filter(c => enrolledClassIds.has(c.id));
  const list = document.querySelector('#scheduleList');

  list.innerHTML = enrolledClasses.length
    ? enrolledClasses.map(c => `<div class="class-setting"><span class="subject-dot ${c.subject_code}">${assignmentIcon(c.subject_code)}</span><div><b>${escapeHtml(c.name)}</b><p>${escapeHtml(c.teacher)}</p></div><button class="remove-schedule-class" data-id="${c.id}">Remove</button></div>`).join('')
    : '<p class="empty-homework">You haven\'t added any classes yet.</p>';

  const notEnrolled = classes.filter(c => !enrolledClassIds.has(c.id));
  const select = document.querySelector('#addScheduleClass');

  select.innerHTML = notEnrolled.length
    ? notEnrolled.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.teacher || 'Teacher not specified')})</option>`).join('')
    : '<option value="">No more classes to add</option>';
}

document.querySelector('#addScheduleButton').addEventListener('click', async () => {
  const classId = document.querySelector('#addScheduleClass').value;
  if (!classId) return toast('No class selected.');
  const { error } = await db.from('enrollments').insert({ student_id: currentUser.id, class_id: classId });
  if (error) return toast('Could not add that class.');
  await loadEnrollments();
  await loadClassesAndHomework();
  renderSchedule();
  renderHomework();
  toast('Class added to your schedule.');
});

document.querySelector('#scheduleList').addEventListener('click', async event => {
  const button = event.target.closest('.remove-schedule-class');
  if (!button) return;
  const { error } = await db.from('enrollments').delete().eq('student_id', currentUser.id).eq('class_id', button.dataset.id);
  if (error) return toast('Could not remove that class.');
  await loadEnrollments();
  await loadClassesAndHomework();
  renderSchedule();
  renderHomework();
  toast('Class removed from your schedule.');
});

// ============================================
// Moderator access requests
// ============================================
async function refreshModRequestUI() {
  if (currentProfile.role === 'mod') {
    document.querySelector('#modRequestCard').hidden = true; // mods don't need to request access
    return;
  }
  document.querySelector('#modRequestCard').hidden = false;
  const { data } = await db.from('mod_requests').select('status').eq('user_id', currentUser.id).order('requested_at', { ascending: false }).limit(1);
  const latest = data?.[0];
  const statusEl = document.querySelector('#modRequestStatus');
  const form = document.querySelector('#modRequestForm');
  if (latest?.status === 'pending') {
    statusEl.textContent = 'Your request is pending review by a moderator.';
    form.hidden = true;
  } else if (latest?.status === 'rejected') {
    statusEl.textContent = 'Your last request was not approved. You can send a new one below.';
    form.hidden = false;
  } else {
    statusEl.textContent = 'Moderators can post homework, manage classes, and review corrections.';
    form.hidden = false;
  }
}

document.querySelector('#requestModButton').addEventListener('click', async () => {
  const message = document.querySelector('#modRequestMessage').value.trim();
  const { error } = await db.from('mod_requests').insert({ user_id: currentUser.id, message: message || null });
  if (error) return toast(error.code === '23505' ? 'You already have a pending request.' : 'Could not send your request.');
  document.querySelector('#modRequestMessage').value = '';
  await refreshModRequestUI();
  toast('Mod access requested.');
});

async function loadModRequests() {
  const { data } = await db
    .from('mod_requests')
    .select('*, profiles!mod_requests_user_id_fkey(full_name)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  renderModRequests(data || []);
}

function renderModRequests(requests) {
  const container = document.querySelector('#modRequestsQueue');
  container.innerHTML = requests.length ? requests.map(r => `<div class="correction-row"><p><b>${escapeHtml(r.profiles?.full_name || 'A student')}</b> wants mod access</p>${r.message ? `<p>${escapeHtml(r.message)}</p>` : ''}<div class="correction-actions"><button class="approve" data-id="${r.id}" data-action="approve">Approve</button><button class="reject" data-id="${r.id}" data-action="reject">Reject</button></div></div>`).join('') : '<p class="empty-homework">No pending mod requests.</p>';
}

document.querySelector('#modRequestsQueue').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const requestId = button.dataset.id;
  if (button.dataset.action === 'approve') {
    const { error } = await db.rpc('approve_mod_request', { request_id: requestId });
    if (error) return toast('Could not approve: ' + error.message);
    toast('Approved — they are now a moderator.');
  } else {
    const { error } = await db.from('mod_requests').update({ status: 'rejected', reviewed_by: currentUser.id }).eq('id', requestId);
    if (error) return toast('Could not reject that request.');
    toast('Request rejected.');
  }
  await loadModRequests();
});

async function loadCorrections() {
  const { data, error } = await db
    .from('corrections')
    .select('*, homework(title), profiles!corrections_submitted_by_fkey(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  corrections = error ? [] : (data || []);
  renderCorrections();
}

async function loadDiscussionPosts() {
  const feed = document.querySelector('.discussion-feed');
  const { data: posts, error } = await db
    .from('discussion_posts')
    .select('*, profiles!discussion_posts_author_id_fkey(full_name, role), classes(name), discussion_replies(*, profiles(full_name, role)), discussion_likes(user_id)')
    .order('created_at', { ascending: false });

  if (error || !posts) return;

  feed.innerHTML = posts.map(post => {
    const authorName = post.profiles?.full_name || 'Student';
    const authorRole = post.profiles?.role;
    const isMod = authorRole === 'mod';
    
    // Create MOD badge HTML if user is a moderator
    const modBadgeHtml = isMod ? `<span style="background: var(--green, #22c55e); color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold; text-transform: uppercase; display: inline-block; vertical-align: middle;">MOD</span>` : '';

    const className = post.classes?.name;
    const subjectHtml = className ? `<span class="course-tag blue" style="margin-bottom: 8px; display: inline-block;">${escapeHtml(className)}</span>` : '';
    
    const postDate = new Date(post.created_at);
    const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(postDate);

    const likes = post.discussion_likes || [];
    const likeCount = likes.length;
    const hasLiked = currentUser ? likes.some(l => l.user_id === currentUser.id) : false;

    const repliesList = (post.discussion_replies || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const replyCount = repliesList.length;

    const repliesHtml = repliesList.map(r => {
      const replyAuthorRole = r.profiles?.role;
      const replyIsMod = replyAuthorRole === 'mod';
      const replyModBadge = replyIsMod ? `<span style="background: var(--green, #22c55e); color: white; font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 4px; font-weight: bold;">MOD</span>` : '';

      return `
        <p data-reply-id="${r.id}">
          <b>${escapeHtml(r.profiles?.full_name || 'Student')}</b>${replyModBadge} · ${escapeHtml(r.content)}
          <button class="heart-button reply-heart" aria-label="Like reply">♡ <span>0</span></button>
          ${(currentProfile?.role === 'mod' || r.author_id === currentUser.id) ? '<button class="mod-delete reply-delete" aria-label="Delete reply">×</button>' : ''}
        </p>
      `;
    }).join('');

    return `
      <article class="community-post" data-id="${post.id}">
        <div class="post-head">
          <i class="mini-avatar green">${escapeHtml(initialsOf(authorName))}</i>
          <div><div style="display: flex; align-items: center;"><b>${escapeHtml(authorName)}</b>${modBadgeHtml}</div><p>${escapeHtml(formattedDate)}</p></div>
        </div>
        <h3 class="discussion-title">${escapeHtml(post.title)}</h3>
        ${subjectHtml}
        <p class="discussion-description">${escapeHtml(post.description)}</p>
        <div class="post-actions">
          <button class="heart-button ${hasLiked ? 'liked' : ''}" aria-label="Like post">${hasLiked ? '♥' : '♡'} <span>${likeCount}</span></button>
          <button class="replies-toggle" aria-expanded="false">◌ <span>${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span></button>
        </div>
        <div class="replies" hidden>
          ${repliesHtml}
          <form class="reply-composer">
            <label>reply</label>
            <div><input class="reply-input" type="text" placeholder="Write a reply…" aria-label="Write a reply"><button type="submit">Post</button></div>
          </form>
        </div>
      </article>
    `;
  }).join('');
}

function renderCorrections() {
  const container = document.querySelector('#correctionsQueue');
  container.innerHTML = corrections.length ? corrections.map(c => `<div class="correction-row"><p><b>${escapeHtml(c.profiles?.full_name || 'A student')}</b> on <i>${escapeHtml(c.homework?.title || 'a deleted assignment')}</i></p><p>${escapeHtml(c.suggested_change)}</p><div class="correction-actions"><button class="approve" data-id="${c.id}" data-status="approved">Approve</button><button class="reject" data-id="${c.id}" data-status="rejected">Reject</button></div></div>`).join('') : '<p class="empty-homework">No pending corrections.</p>';
}

document.querySelector('#correctionsQueue').addEventListener('click', async event => {
  const button = event.target.closest('button[data-status]');
  if (!button) return;
  const { error } = await db.from('corrections').update({ status: button.dataset.status, reviewed_by: currentUser.id }).eq('id', button.dataset.id);
  if (error) return toast('Could not update that request.');
  await loadCorrections();
  toast(button.dataset.status === 'approved' ? 'Correction approved.' : 'Correction rejected.');
});