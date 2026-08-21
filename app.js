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
const dashboardAssignments = document.querySelector('#dashboardAssignments');
const focusAssignment = document.querySelector('#focusAssignment');

document.querySelector('#studentName').textContent = studentName;
document.querySelector('#topbarDate').textContent = currentDate;
document.querySelector('#dashboardDate').textContent = currentDate;
function updateDashboardAssignments() {
  const overviewAssignments = assignments.slice(1, 4).filter(assignment => !assignment.completed);
  dashboardAssignments.innerHTML = overviewAssignments.map(assignment => {
    const index = assignments.indexOf(assignment);
    const initials = assignment.teacher.split(' ').map(part => part[0]).join('').slice(0, 2);
    return `<article class="assignment-card" data-assignment="${index}"><div class="card-meta"><span class="course-tag ${assignmentTagColor(assignment.subject)}">${assignment.course}</span><span>Due ${assignment.due}</span></div><h3>${assignment.title}</h3><p>${assignment.description}</p><div class="card-bottom"><span class="teacher"><i class="mini-avatar">${initials}</i> ${assignment.teacher}</span><button class="circle-check dashboard-check" aria-label="Complete assignment">✓</button></div></article>`;
  }).join('');
  const focusComplete = assignments[0].completed;
  focusAssignment.hidden = focusComplete;
  const focusButton = document.querySelector('#completeFocus');
  focusButton.classList.toggle('completed', focusComplete);
  focusButton.innerHTML = focusComplete ? '<span>✓</span> Completed' : '<span>✓</span> Mark complete';
  const remaining = overviewAssignments.length;
  document.querySelector('#assignmentCount').textContent = `${remaining} assignment${remaining === 1 ? '' : 's'}`;
}
updateDashboardAssignments();

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
      (activeHomeworkFilter === 'yours' && scheduledClasses.has(a.course) && !a.completed) ||
      (activeHomeworkFilter === 'week' && a.thisWeek) ||
      (activeHomeworkFilter === 'completed' && a.completed);
    return matchesTab && (course === 'All classes' || a.course === course);
  });
}
function updateFilterCounts() {
  const counts = {
    yours: assignments.filter(a => scheduledClasses.has(a.course) && !a.completed).length,
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
  updateDashboardAssignments();
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
dashboardAssignments.addEventListener('click', event => {
  const button = event.target.closest('.dashboard-check');
  if (!button) return;
  const card = button.closest('.assignment-card');
  const assignment = assignments[Number(card.dataset.assignment)];
  assignment.completed = true;
  renderHomework();
  toast('Marked as complete. Nice work!');
});
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeHomeworkFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  renderHomework();
}));
courseFilter.addEventListener('change', renderHomework);
const modal = document.querySelector('#modal');
const modalEyebrow = document.querySelector('#modalEyebrow');
const modalFields = document.querySelector('#modalFields');
let modalType = 'correction';
function openModal(title, text, type = 'correction') {
  modalType = type;
  document.querySelector('#modalTitle').textContent = title;
  document.querySelector('#modalText').textContent = text;
  modalEyebrow.hidden = type === 'correction';
  modalFields.innerHTML = type === 'resource'
    ? '<label>Title<input id="resourceTitle" type="text" placeholder="e.g., Unit 3 study guide" required></label><label>Link<input id="resourceLink" type="url" placeholder="https://" required></label><label>Description<textarea id="resourceDescription" placeholder="What is this material good for?" required></textarea></label>'
    : type === 'discussion'
    ? '<label>Title of post<input id="discussionTitle" type="text" placeholder="What do you want to discuss?" required></label><label>Description of post<textarea id="discussionDescription" placeholder="Add context or a question for your classmates." required></textarea></label>'
    : '<textarea placeholder="Describe the issue or update…"></textarea>';
  document.querySelector('#submitModal').textContent = type === 'resource' ? 'Share resource' : type === 'discussion' ? 'Create post' : 'Send request';
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
document.querySelector('#submitModal').addEventListener('click', ()=> {
  if (modalType === 'resource') {
    const title = document.querySelector('#resourceTitle').value.trim();
    const link = document.querySelector('#resourceLink').value.trim();
    const description = document.querySelector('#resourceDescription').value.trim();
    if (!title || !link || !description) return toast('Please complete all three resource fields.');
    const resource = document.createElement('article');
    resource.className = 'resource-card';
    resource.innerHTML = '<div class="resource-icon green-paper">↗</div><div><span class="resource-type">SHARED RESOURCE</span><h3></h3><p></p><a class="resource-link" target="_blank" rel="noopener">Open resource →</a></div><button>⌑</button>';
    resource.querySelector('h3').textContent = title;
    resource.querySelector('p').textContent = description;
    resource.querySelector('.resource-link').href = link;
    document.querySelector('.resource-grid').prepend(resource);
    modal.classList.remove('open');
    return toast('Resource shared with your study group.');
  }
  if (modalType === 'discussion') {
    const title = document.querySelector('#discussionTitle').value.trim();
    const description = document.querySelector('#discussionDescription').value.trim();
    if (!title || !description) return toast('Please add a title and description.');
    const post = document.createElement('article');
    post.className = 'community-post';
    post.innerHTML = '<div class="post-head"><i class="mini-avatar green">AG</i><div><b>Alex Green</b><p>Just now</p></div></div><h3 class="discussion-title"></h3><p class="discussion-description"></p><div class="post-actions"><button class="heart-button" aria-label="Like post">♡ <span>0</span></button><button class="replies-toggle" aria-expanded="false">◌ <span>0 replies</span></button></div><div class="replies" hidden></div>';
    post.querySelector('.discussion-title').textContent = title;
    post.querySelector('.discussion-description').textContent = description;
    document.querySelector('.discussion-feed').prepend(post);
    modal.classList.remove('open');
    return toast('Discussion post created.');
  }
  modal.classList.remove('open');
  toast('Sent to the StudyGroup team.');
});
document.querySelector('#editSchedule').addEventListener('click', ()=>document.querySelector('[data-view="settings"]').click());
document.querySelector('#searchButton').addEventListener('click', ()=>toast('Search is coming soon. Try browsing your classes.'));
document.querySelector('#profileButton').addEventListener('click', ()=>toast('Signed in as Alex Green · Student'));
document.querySelectorAll('.community-post').forEach(post => {
  post.querySelector('.post-actions button')?.classList.add('heart-button');
  post.querySelectorAll('.replies p').forEach(reply => {
    const heart = document.createElement('button');
    heart.className = 'heart-button reply-heart';
    heart.setAttribute('aria-label', 'Like reply');
    heart.innerHTML = '♡ <span>0</span>';
    reply.append(' ', heart);
  });
});
document.querySelector('.discussion-feed').addEventListener('click', event => {
  const heart = event.target.closest('.heart-button');
  if (heart) {
    const count = heart.querySelector('span');
    const liked = heart.classList.toggle('liked');
    count.textContent = Math.max(0, Number(count.textContent) + (liked ? 1 : -1));
    heart.firstChild.textContent = liked ? '♥ ' : '♡ ';
    return;
  }
  const button = event.target.closest('.replies-toggle');
  if (!button) return;
  const replies = button.closest('.community-post').querySelector('.replies');
  const isOpen = !replies.hidden;
  replies.hidden = isOpen;
  button.setAttribute('aria-expanded', String(!isOpen));
});
