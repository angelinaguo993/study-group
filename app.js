const assignments = [
  { course: 'AP Calculus AB', title: 'Problem Set 3.4: Derivatives', teacher: 'Ms. Sharma', due: 'Tomorrow, 8:00 AM', subject: 'math', description: 'Finish problems 1–24. Show your work for free-response questions.', thisWeek: true },
  { course: 'English 10', title: 'Read chapters 9–11', teacher: 'Mr. Rios', due: 'Thu, Oct 17', subject: 'eng', description: 'Come prepared to discuss the turning point in the narrative.', thisWeek: true },
  { course: 'Chemistry', title: 'Lab report: calorimetry', teacher: 'Dr. Lee', due: 'Fri, Oct 18', subject: 'chem', description: 'Complete analysis questions and submit your draft.', thisWeek: true },
  { course: 'World History', title: 'Silk Roads source analysis', teacher: 'Ms. Khan', due: 'Mon, Oct 21', subject: 'history', description: 'Annotate the primary source and respond to prompts.', thisWeek: true },
  { course: 'Spanish 3', title: 'Vocabulario: La ciudad', teacher: 'Sra. Morales', due: 'Tue, Oct 22', subject: 'spanish', description: 'Study the Unit 3 vocabulary set before the quiz.' },
  { course: 'AP Calculus AB', title: 'Review for limits quiz', teacher: 'Ms. Sharma', due: 'Wed, Oct 23', subject: 'math', description: 'Use the review packet and try the optional challenge questions.' }
];
const scheduledClasses = new Set(['AP Calculus AB', 'Chemistry', 'English 10']);
let activeHomeworkFilter = 'yours';

const studentName = document.querySelector('#profileButton b').textContent.split(' ')[0];
const currentDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
}).format(new Date());
const dashboardAssignmentCount = document.querySelectorAll('.assignment-grid .assignment-card').length;

document.querySelector('#studentName').textContent = studentName;
document.querySelector('#topbarDate').textContent = currentDate;
document.querySelector('#dashboardDate').textContent = currentDate;
document.querySelector('#assignmentCount').textContent = `${dashboardAssignmentCount} assignment${dashboardAssignmentCount === 1 ? '' : 's'}`;

const homeworkList = document.querySelector('#homeworkList');
const courseFilter = document.querySelector('#courseFilter');
const courseNames = [...new Set(assignments.map(a => a.course))];
courseFilter.innerHTML = `<option>All classes</option>${courseNames.map(course => `<option>${course}</option>`).join('')}`;

function assignmentTagColor(subject) { return subject === 'chem' ? 'purple' : ['history', 'spanish'].includes(subject) ? 'gold' : 'blue'; }
function assignmentIcon(subject) { return subject === 'math' ? '∑' : subject === 'chem' ? '⚗' : subject === 'eng' ? 'A' : '◆'; }
function matchingAssignments() {
  const course = courseFilter.value;
  return assignments.filter(a => {
    const matchesTab = activeHomeworkFilter === 'all' ||
      (activeHomeworkFilter === 'yours' && scheduledClasses.has(a.course)) ||
      (activeHomeworkFilter === 'week' && a.thisWeek) ||
      (activeHomeworkFilter === 'completed' && a.completed);
    return matchesTab && (course === 'All classes' || a.course === course);
  });
}
function updateFilterCounts() {
  const counts = {
    yours: assignments.filter(a => scheduledClasses.has(a.course)).length,
    week: assignments.filter(a => a.thisWeek).length,
    completed: assignments.filter(a => a.completed).length,
    all: assignments.length
  };
  document.querySelectorAll('.filter').forEach(button => { button.querySelector('b').textContent = counts[button.dataset.filter]; });
}
function renderHomework() {
  const visibleAssignments = matchingAssignments();
  homeworkList.innerHTML = visibleAssignments.length ? visibleAssignments.map(a => {
    const index = assignments.indexOf(a);
    return `<article class="homework-row ${a.completed ? 'is-complete' : ''}"><span class="subject-dot ${a.subject}">${assignmentIcon(a.subject)}</span><div class="homework-main"><span class="course-tag ${assignmentTagColor(a.subject)}">${a.course}</span><h3>${a.title}</h3><p>${a.description}</p><small>${a.teacher} · Posted yesterday</small></div><div class="homework-due"><b>${a.due}</b><small>Due date</small></div><button class="circle-check homework-check ${a.completed ? 'done' : ''}" data-assignment="${index}" aria-label="${a.completed ? 'Mark incomplete' : 'Mark complete'}">✓</button></article>`;
  }).join('') : '<p class="empty-homework">No assignments found for this view.</p>';
  updateFilterCounts();
}
renderHomework();

const events = {1:['Calculus', 'blue-bg'], 3:['Chemistry lab', 'purple-bg'], 8:['English reading', 'orange-bg'], 10:['Problem Set 3.4', 'blue-bg'], 11:['Chem lab report', 'purple-bg'], 14:['History analysis', 'gold-bg'], 16:['Calculus quiz', 'blue-bg'], 18:['English seminar', 'orange-bg'], 21:['Silk Roads due', 'gold-bg']};
const grid = document.querySelector('#calendarGrid');
const calendarMonth = document.querySelector('#calendarMonth');
const currentMonthIndex = new Date().getMonth();
let displayedMonth = currentMonthIndex;
function renderCalendar() {
  const year = 2026;
  const firstDay = new Date(year, displayedMonth, 1).getDay();
  const mondayFirstOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, displayedMonth + 1, 0).getDate();
  const totalCells = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;
  calendarMonth.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, displayedMonth, 1));
  grid.innerHTML = Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayFirstOffset + 1;
    const isCurrentMonth = day > 0 && day <= daysInMonth;
    const event = isCurrentMonth ? events[day] : null;
    const isToday = isCurrentMonth && displayedMonth === currentMonthIndex && day === new Date().getDate();
    return `<div class="day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'empty-day' : ''}"><span>${isCurrentMonth ? day : ''}</span>${event ? `<div class="calendar-event ${event[1]}">${event[0]}</div>` : ''}</div>`;
  }).join('');
}
renderCalendar();
document.querySelector('#previousMonth').addEventListener('click', () => { displayedMonth = (displayedMonth + 11) % 12; renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { displayedMonth = (displayedMonth + 1) % 12; renderCalendar(); });
document.querySelector('#todayButton').addEventListener('click', () => { displayedMonth = currentMonthIndex; renderCalendar(); });

document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); const view = link.dataset.view; document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view')); document.querySelector('#' + view).classList.add('active-view'); document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.view === view)); document.querySelector('#crumb').innerHTML = `${view === 'dashboard' ? 'Dashboard' : view[0].toUpperCase() + view.slice(1)} <span>/</span> ${view === 'dashboard' ? currentDate : 'Interlake High School'}`; window.scrollTo(0,0); }));
function toast(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2600); }
homeworkList.addEventListener('click', event => {
  const button = event.target.closest('.homework-check');
  if (!button) return;
  const assignment = assignments[Number(button.dataset.assignment)];
  assignment.completed = !assignment.completed;
  renderHomework();
  toast(assignment.completed ? 'Marked as complete. Nice work!' : 'Marked as incomplete.');
});
document.querySelector('#completeFocus').addEventListener('click', e => {
  const assignment = assignments[0];
  assignment.completed = !assignment.completed;
  e.currentTarget.classList.toggle('completed', assignment.completed);
  e.currentTarget.innerHTML = assignment.completed ? '<span>✓</span> Completed' : '<span>✓</span> Mark complete';
  renderHomework();
  toast(assignment.completed ? 'Problem Set 3.4 marked complete.' : 'Problem Set 3.4 marked incomplete.');
});
document.querySelectorAll('.assignment-card .circle-check').forEach(button => button.addEventListener('click', () => {
  button.classList.toggle('done');
  toast(button.classList.contains('done') ? 'Marked as complete. Nice work!' : 'Marked as incomplete.');
}));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeHomeworkFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  renderHomework();
}));
courseFilter.addEventListener('change', renderHomework);
const modal = document.querySelector('#modal');
function openModal(title, text) { document.querySelector('#modalTitle').textContent = title; document.querySelector('#modalText').textContent = text; modal.classList.add('open'); }
document.querySelector('#requestEdit').addEventListener('click', ()=>openModal('Request a correction', "Tell the moderators what needs updating. They'll review it shortly."));
document.querySelector('#shareResource').addEventListener('click', ()=>openModal('Share a resource', 'Help your classmates by sharing a link, guide, or study material.'));
document.querySelector('#closeModal').addEventListener('click', ()=>modal.classList.remove('open'));
modal.addEventListener('click', e=> { if(e.target === modal) modal.classList.remove('open'); });
document.querySelector('#submitModal').addEventListener('click', ()=> { modal.classList.remove('open'); toast('Sent to the StudyGroup team.'); });
document.querySelector('#editSchedule').addEventListener('click', ()=>document.querySelector('[data-view="settings"]').click());
document.querySelector('#searchButton').addEventListener('click', ()=>toast('Search is coming soon. Try browsing your classes.'));
document.querySelector('#profileButton').addEventListener('click', ()=>toast('Signed in as Alex Green · Student'));
