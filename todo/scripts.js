import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { getAuth, signInWithPopup, GithubAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCX9IqXD7GBLt0Zmw1znFknpIUOzGZSYh8",
    authDomain: "expo-tasks-todo.firebaseapp.com",
    databaseURL: "https://expo-tasks-todo-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "expo-tasks-todo",
    storageBucket: "expo-tasks-todo.firebasestorage.app",
    messagingSenderId: "1067819928796",
    appId: "1:1067819928796:web:1dc24f17a28fc195d53819"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const loginBtn = document.getElementById('loginBtn');
const appContainer = document.getElementById('app');
const taskInput = document.getElementById('taskInput');
const deadlineInput = document.getElementById('deadlineInput');
const btnAdd = document.getElementById('btnAdd');
const taskList = document.getElementById('taskList');
const modalOverlay = document.getElementById('modalOverlay');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');
const body = document.body;

let tasks = [];
let taskToDelete = null;
let isModalOpen = false;
let currentUser = null;
let tasksUnsubscribe = null;

let dragState = null;
const DRAG_THRESHOLD = 5;

// ── Аутентификация ──
loginBtn.style.display = 'block';

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('Твой GitHub UID:', user.uid);
        loginBtn.style.display = 'none';
        appContainer.style.display = '';
        initRealtimeSync();
    } else {
        currentUser = null;
        loginBtn.style.display = 'block';
        appContainer.style.display = 'none';
        if (tasksUnsubscribe) {
            tasksUnsubscribe();
            tasksUnsubscribe = null;
        }
        tasks = [];
        taskList.innerHTML = '';
    }
});

loginBtn.addEventListener('click', async () => {
    const provider = new GithubAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error('Ошибка входа:', err);
        if (err.code === 'auth/unauthorized-domain') {
            alert('Домен не добавлен в Firebase. Проверь разрешённые домены в Authentication → Settings.');
        } else if (err.code === 'auth/popup-blocked') {
            alert('Всплывающее окно заблокировано. Разреши всплывающие окна для этого сайта.');
        } else {
            alert('Не удалось войти. Подробности в консоли (F12).');
        }
    }
});

function initRealtimeSync() {
    if (tasksUnsubscribe) tasksUnsubscribe();
    const tasksRef = ref(db, 'tasks');
    tasksUnsubscribe = onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        tasks = data ? Object.keys(data).map(key => ({
            ...data[key],
            id: key
        })) : [];
        renderTasks();
    });
    taskInput.focus();
    deadlineInput.value = '';
}

// ── Работа с задачами ──
function addTask() {
    if (!currentUser) return;
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.focus();
        taskInput.style.borderColor = 'rgba(255,255,255,0.5)';
        setTimeout(() => { taskInput.style.borderColor = ''; }, 400);
        return;
    }
    const deadlineVal = deadlineInput.value || null;
    const newId = generateId();
    set(ref(db, 'tasks/' + newId), {
        text,
        deadline: deadlineVal,
        completed: false,
    }).then(() => {
        taskInput.value = '';
        deadlineInput.value = '';
        taskInput.focus();
    });
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    set(ref(db, 'tasks/' + taskId + '/completed'), !task.completed);
}

function deleteTask(taskId) {
    const card = taskList.querySelector(`[data-id="${taskId}"]`);
    const performDelete = () => set(ref(db, 'tasks/' + taskId), null);
    if (card) {
        card.classList.add('task-exit');
        card.addEventListener('animationend', performDelete, { once: true });
    } else {
        performDelete();
    }
}

function reorderTask(draggedId, targetId, insertBefore) {
    const draggedIdx = tasks.findIndex(t => t.id === draggedId);
    const targetIdx = tasks.findIndex(t => t.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIdx, 1);
    const newTargetIdx = newTasks.findIndex(t => t.id === targetId);
    if (insertBefore) newTasks.splice(newTargetIdx, 0, draggedTask);
    else newTasks.splice(newTargetIdx + 1, 0, draggedTask);
    const updates = {};
    newTasks.forEach(t => {
        updates['tasks/' + t.id] = { text: t.text, deadline: t.deadline, completed: t.completed };
    });
    update(ref(db), updates);
}

function generateId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

// ── Рендер ──
function renderTasks(animateNewId = null) {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'task-list-empty';
        emptyEl.textContent = '—';
        taskList.appendChild(emptyEl);
        return;
    }

    const now = new Date();

    tasks.forEach((task, index) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        if (task.completed) card.classList.add('completed');
        if (animateNewId && task.id === animateNewId) {
            card.classList.add('task-enter');
        }
        card.setAttribute('data-id', task.id);
        card.setAttribute('data-index', index);
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label',
            (task.completed ? 'Выполнено: ' : '') + task.text +
            (task.deadline ? ' · Дедлайн: ' + formatDeadline(task.deadline) : '')
        );

        // Grip
        const grip = document.createElement('div');
        grip.className = 'grip';
        grip.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'grip-dot';
            grip.appendChild(dot);
        }

        // Checkbox
        const cbWrap = document.createElement('label');
        cbWrap.className = 'checkbox-wrap';
        cbWrap.setAttribute('aria-label', 'Отметить выполнение');
        const cbInput = document.createElement('input');
        cbInput.type = 'checkbox';
        cbInput.checked = task.completed;
        cbInput.addEventListener('change', () => toggleTask(task.id));
        cbInput.addEventListener('pointerdown', (e) => e.stopPropagation());
        const cbVisual = document.createElement('div');
        cbVisual.className = 'checkbox-visual';
        cbWrap.appendChild(cbInput);
        cbWrap.appendChild(cbVisual);

        // Content
        const content = document.createElement('div');
        content.className = 'task-content';
        const textEl = document.createElement('span');
        textEl.className = 'task-text';
        textEl.textContent = task.text;
        content.appendChild(textEl);

        if (task.deadline) {
            const deadlineEl = document.createElement('span');
            deadlineEl.className = 'task-deadline';
            const deadlineDate = new Date(task.deadline);
            if (!task.completed && deadlineDate < now) {
                deadlineEl.classList.add('overdue');
            }
            deadlineEl.textContent = formatDeadline(task.deadline);
            content.appendChild(deadlineEl);
        }

        // Copy button
        const btnCopy = document.createElement('button');
        btnCopy.className = 'btn-copy';
        btnCopy.setAttribute('aria-label', 'Копировать текст задачи');
        btnCopy.setAttribute('title', 'Копировать');
        btnCopy.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
                <path d="M3 11V3C3 2.2 3.7 2 4 2H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
        `;
        btnCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            copyTaskText(task.text, btnCopy);
        });
        btnCopy.addEventListener('pointerdown', (e) => e.stopPropagation());

        // Delete button
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-delete';
        btnDel.innerHTML = '&times;';
        btnDel.setAttribute('aria-label', 'Удалить задачу');
        btnDel.setAttribute('title', 'Удалить');
        btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            openDeleteModal(task.id);
        });
        btnDel.addEventListener('pointerdown', (e) => e.stopPropagation());

        card.appendChild(grip);
        card.appendChild(cbWrap);
        card.appendChild(content);
        card.appendChild(btnCopy);
        card.appendChild(btnDel);

        // Pointer events для drag
        card.addEventListener('pointerdown', onPointerDown);

        // Keyboard
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTask(task.id);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                openDeleteModal(task.id);
            }
        });

        taskList.appendChild(card);
    });
}

// ── Вспомогательные функции ──
function formatDeadline(deadlineStr) {
    if (!deadlineStr) return '';
    try {
        const d = new Date(deadlineStr);
        if (isNaN(d.getTime())) return deadlineStr;
        const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
            'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const now = new Date();
        if (year === now.getFullYear()) {
            return `${day} ${month}, ${hours}:${minutes}`;
        }
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch (e) {
        return deadlineStr;
    }
}

function copyTaskText(text, btn) {
    if (!text) return;
    const doCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            showCopiedFeedback(btn);
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); showCopiedFeedback(btn); } catch (e) {}
            document.body.removeChild(textarea);
        });
    };
    doCopy();
}

function showCopiedFeedback(btn) {
    btn.classList.add('copied');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHTML;
    }, 1500);
}

function openDeleteModal(taskId) {
    taskToDelete = taskId;
    isModalOpen = true;
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    modalCancel.focus();
}

function closeModal() {
    taskToDelete = null;
    isModalOpen = false;
    modalOverlay.classList.remove('active');
    modalOverlay.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
}

function confirmDelete() {
    if (taskToDelete) {
        const id = taskToDelete;
        closeModal();
        deleteTask(id);
    }
}

// ── Drag & Drop (Pointer Events) ──
function onPointerDown(e) {
    if (isModalOpen) return;
    if (e.target.closest('.btn-delete, .btn-copy, .checkbox-wrap')) return;

    const card = e.currentTarget;
    const taskId = card.getAttribute('data-id');
    if (!tasks.find(t => t.id === taskId)) return;

    card.setPointerCapture(e.pointerId);
    dragState = {
        card,
        taskId,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        clone: null,
        moved: false,
        initialRect: card.getBoundingClientRect(),
        offsetX: 0,
        offsetY: 0
    };
    e.preventDefault();
    e.stopPropagation();
}

function onPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const distance = Math.hypot(dx, dy);
    if (!dragState.moved && distance < DRAG_THRESHOLD) return;

    if (!dragState.moved) {
        dragState.moved = true;
        body.classList.add('dragging-active');
        const card = dragState.card;
        card.classList.add('dragging');
        const task = tasks.find(t => t.id === dragState.taskId);
        const clone = document.createElement('div');
        clone.className = 'drag-clone';
        clone.textContent = task ? task.text : '';
        document.body.appendChild(clone);
        dragState.clone = clone;
        const rect = card.getBoundingClientRect();
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.display = 'block';
        dragState.offsetX = e.clientX - rect.left;
        dragState.offsetY = e.clientY - rect.top;
    }

    if (dragState.clone) {
        dragState.clone.style.left = (e.clientX - dragState.offsetX) + 'px';
        dragState.clone.style.top = (e.clientY - dragState.offsetY) + 'px';
    }
    updateDropTarget(e.clientX, e.clientY, dragState.card);
    e.preventDefault();
}

function onPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    if (dragState.moved) {
        const targetCard = getDropTargetCard(e.clientX, e.clientY, dragState.card);
        if (targetCard && targetCard !== dragState.card) {
            const targetId = targetCard.getAttribute('data-id');
            const rect = targetCard.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            reorderTask(dragState.taskId, targetId, e.clientY < midY);
        } else {
            renderTasks();
        }
        cleanupDrag();
    } else {
        cleanupDrag();
    }
}

function onPointerCancel(e) {
    if (dragState && dragState.pointerId === e.pointerId) {
        cleanupDrag();
    }
}

function cleanupDrag() {
    if (!dragState) return;
    if (dragState.clone) dragState.clone.remove();
    const card = dragState.card;
    if (card) {
        card.classList.remove('dragging');
        try { card.releasePointerCapture(dragState.pointerId); } catch (e) {}
    }
    removeDropIndicator();
    body.classList.remove('dragging-active');
    dragState = null;
}

let dropIndicator = null;

function updateDropTarget(clientX, clientY, draggedCard) {
    const target = getDropTargetCard(clientX, clientY, draggedCard);
    removeDropIndicator();
    if (!target || target === draggedCard) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = clientY < midY;

    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator active';
    if (insertBefore) {
        target.before(dropIndicator);
        target.classList.add('drop-before');
        target.classList.remove('drop-after');
    } else {
        target.after(dropIndicator);
        target.classList.add('drop-after');
        target.classList.remove('drop-before');
    }
}

function removeDropIndicator() {
    if (dropIndicator) {
        dropIndicator.remove();
        dropIndicator = null;
    }
    document.querySelectorAll('.task-card.drop-before, .task-card.drop-after').forEach(card => {
        card.classList.remove('drop-before', 'drop-after');
    });
}

function getDropTargetCard(clientX, clientY, draggedCard) {
    const cards = document.querySelectorAll('.task-card:not(.dragging)');
    let best = null;
    let bestDist = Infinity;
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        if (dist < bestDist && dist < 100) {
            bestDist = dist;
            best = card;
        }
    });
    return best;
}

// Глобальные слушатели для Pointer Events
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('pointercancel', onPointerCancel);
document.addEventListener('dragstart', (e) => e.preventDefault());

// ── Обработчики кнопок ──
btnAdd.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
});
deadlineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
});
modalConfirm.addEventListener('click', confirmDelete);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (isModalOpen) {
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        else if (e.key === 'Enter') { e.preventDefault(); confirmDelete(); }
        return;
    }
    if (
        e.key.length === 1 &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        document.activeElement !== taskInput &&
        document.activeElement !== deadlineInput &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.contentEditable !== 'true'
    ) {
        taskInput.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addTask();
    }
});

window.addEventListener('resize', () => {
    if (dragState) cleanupDrag();
});