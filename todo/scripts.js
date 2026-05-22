(function() {
    // ── DOM references ──
    const taskInput = document.getElementById('taskInput');
    const deadlineInput = document.getElementById('deadlineInput');
    const btnAdd = document.getElementById('btnAdd');
    const taskList = document.getElementById('taskList');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const dragClone = document.getElementById('dragClone');
    const body = document.body;

    // ── State ──
    const STORAGE_KEY = 'bw-todo-tasks-v3';
    let tasks = [];
    let taskToDelete = null;
    let isModalOpen = false;

    // Touch drag state
    let touchDragData = null;
    let touchDragActive = false;
    const TOUCH_DRAG_THRESHOLD = 8;

    // Device detection for drag strategy
    const isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches;

    // ── Load / Save ──
    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    tasks = parsed.filter(t => t && typeof t.text === 'string' && t.text.trim());
                    tasks.forEach(t => {
                        if (!t.id) t.id = generateId();
                        if (typeof t.completed !== 'boolean') t.completed = false;
                        if (t.deadline === undefined) t.deadline = null;
                    });
                    return;
                }
            }
        } catch (e) {}
        tasks = [];
    }

    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {}
    }

    function generateId() {
        return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    // ── Render ──
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
            // HTML5 drag only on non-touch primary devices
            if (!isTouchDevice) {
                card.setAttribute('draggable', 'true');
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

            // Copy button (icon: two overlapping squares)
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

            // HTML5 Drag & Drop (desktop only)
            if (!isTouchDevice) {
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);
                card.addEventListener('dragover', handleDragOver);
                card.addEventListener('dragleave', handleDragLeave);
                card.addEventListener('drop', handleDrop);
            }

            // Touch drag (mobile / touch devices)
            card.addEventListener('touchstart', handleTouchStart, { passive: false });
            card.addEventListener('touchmove', handleTouchMove, { passive: false });
            card.addEventListener('touchend', handleTouchEnd);
            card.addEventListener('touchcancel', handleTouchEnd);

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

        updateDragCloneBaseStyle();
    }

    function updateDragCloneBaseStyle() {
        dragClone.style.fontFamily = getComputedStyle(document.body).fontFamily;
        dragClone.style.fontSize = '16px';
        dragClone.style.letterSpacing = '-0.01em';
        dragClone.style.borderRadius = '12px';
        if (window.innerWidth <= 600) {
            dragClone.style.fontSize = '15px';
            dragClone.style.borderRadius = '8px';
        }
    }

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

    // ── Copy task text ──
    function copyTaskText(text, buttonElement) {
        if (!text) return;
        // Modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showCopiedFeedback(buttonElement);
            }).catch(() => {
                fallbackCopy(text, buttonElement);
            });
        } else {
            fallbackCopy(text, buttonElement);
        }
    }

    function fallbackCopy(text, buttonElement) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopiedFeedback(buttonElement);
        } catch (err) {
            // silent fail
        }
        document.body.removeChild(textarea);
    }

    function showCopiedFeedback(button) {
        button.classList.add('copied');
        // Change SVG to checkmark temporarily
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
        }, 1500);
    }

    // ── Task operations ──
    function addTask() {
        const text = taskInput.value.trim();
        if (!text) {
            taskInput.focus();
            taskInput.style.borderColor = 'rgba(255,255,255,0.5)';
            setTimeout(() => { taskInput.style.borderColor = ''; }, 400);
            return;
        }

        const deadlineVal = deadlineInput.value ? deadlineInput.value : null;
        const newTask = {
            id: generateId(),
            text: text,
            deadline: deadlineVal,
            completed: false,
        };

        tasks.unshift(newTask);
        saveTasks();
        renderTasks(newTask.id);

        taskInput.value = '';
        deadlineInput.value = '';
        taskInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function toggleTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        }
    }

    function deleteTask(taskId) {
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const card = taskList.querySelector(`[data-id="${taskId}"]`);
            if (card) {
                card.classList.add('task-exit');
                card.addEventListener('animationend', () => {
                    tasks = tasks.filter(t => t.id !== taskId);
                    saveTasks();
                    renderTasks();
                }, { once: true });
            } else {
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasks();
                renderTasks();
            }
        }
    }

    // ── Modal ──
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
            const idToDelete = taskToDelete;
            closeModal();
            deleteTask(idToDelete);
        }
    }

    modalConfirm.addEventListener('click', confirmDelete);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // ── Keyboard shortcuts ──
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

    // ── HTML5 Drag & Drop (desktop) ──
    let draggedTaskId = null;

    function handleDragStart(e) {
        if (isModalOpen) { e.preventDefault(); return; }
        const card = e.currentTarget;
        draggedTaskId = card.getAttribute('data-id');
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTaskId);
        try {
            const ghost = card.cloneNode(true);
            ghost.style.position = 'absolute';
            ghost.style.top = '-9999px';
            ghost.style.opacity = '0.7';
            ghost.style.width = card.offsetWidth + 'px';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
            requestAnimationFrame(() => ghost.remove());
        } catch (err) {}
        requestAnimationFrame(() => { card.style.opacity = '0.35'; });
    }

    function handleDragEnd(e) {
        const card = e.currentTarget;
        card.classList.remove('dragging');
        card.style.opacity = '';
        draggedTaskId = null;
        document.querySelectorAll('.task-card.drag-over, .task-card.drag-over-top, .task-card.drag-over-bottom')
            .forEach(el => el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));
    }

    function handleDragOver(e) {
        e.preventDefault();
        if (!draggedTaskId) return;
        const card = e.currentTarget;
        if (card.getAttribute('data-id') === draggedTaskId) return;
        e.dataTransfer.dropEffect = 'move';

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isTopHalf = e.clientY < midY;

        document.querySelectorAll('.task-card.drag-over, .task-card.drag-over-top, .task-card.drag-over-bottom')
            .forEach(el => {
                if (el !== card) el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
            });
        card.classList.add('drag-over');
        card.classList.remove('drag-over-top', 'drag-over-bottom');
        if (isTopHalf) card.classList.add('drag-over-top');
        else card.classList.add('drag-over-bottom');
    }

    function handleDragLeave(e) {
        const card = e.currentTarget;
        if (!card.contains(e.relatedTarget)) {
            card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const card = e.currentTarget;
        card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        if (!draggedTaskId) return;
        const targetId = card.getAttribute('data-id');
        if (targetId === draggedTaskId) return;

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        reorderTask(draggedTaskId, targetId, e.clientY < midY);
        draggedTaskId = null;
    }

    function reorderTask(draggedId, targetId, insertBefore) {
        const draggedIdx = tasks.findIndex(t => t.id === draggedId);
        const targetIdx = tasks.findIndex(t => t.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const [draggedTask] = tasks.splice(draggedIdx, 1);
        let newTargetIdx = tasks.findIndex(t => t.id === targetId);
        if (insertBefore) tasks.splice(newTargetIdx, 0, draggedTask);
        else tasks.splice(newTargetIdx + 1, 0, draggedTask);
        saveTasks();
        renderTasks();
    }

    // ── Touch drag (mobile) ──
    function handleTouchStart(e) {
        if (isModalOpen) return;
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const target = e.target;
        // Ignore if touching action buttons or checkbox
        if (target.closest('.btn-delete') || target.closest('.btn-copy') || target.closest('.checkbox-wrap')) return;

        const card = e.currentTarget;
        const taskId = card.getAttribute('data-id');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        touchDragData = {
            taskId: taskId,
            card: card,
            startX: touch.clientX,
            startY: touch.clientY,
            task: task,
        };
        touchDragActive = false;

        // Prevent default only after threshold; we'll add touch-action class later
    }

    function handleTouchMove(e) {
        if (!touchDragData) return;
        if (e.touches.length !== 1) { endTouchDrag(); return; }

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchDragData.startX);
        const deltaY = Math.abs(touch.clientY - touchDragData.startY);
        const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!touchDragActive && totalDelta < TOUCH_DRAG_THRESHOLD) return;

        if (!touchDragActive) {
            touchDragActive = true;
            // Now we commit to drag – prevent default and lock touch-action
            e.preventDefault();
            touchDragData.card.classList.add('no-touch-action');
            // Show clone
            const card = touchDragData.card;
            const rect = card.getBoundingClientRect();
            dragClone.textContent = touchDragData.task.text;
            dragClone.style.display = 'block';
            dragClone.style.width = rect.width + 'px';
            dragClone.style.left = rect.left + 'px';
            dragClone.style.top = rect.top + 'px';
            dragClone.style.zIndex = '200';
            dragClone.style.opacity = '0.9';
            dragClone.style.transform = 'scale(1.03)';
            card.classList.add('dragging');
            card.style.opacity = '0.35';
        } else {
            e.preventDefault();
        }

        // Move clone
        const offsetX = touch.clientX - touchDragData.startX;
        const offsetY = touch.clientY - touchDragData.startY;
        const cardRect = touchDragData.card.getBoundingClientRect();
        dragClone.style.left = (cardRect.left + offsetX) + 'px';
        dragClone.style.top = (cardRect.top + offsetY) + 'px';

        updateTouchDropTarget(touch.clientX, touch.clientY);
    }

    function handleTouchEnd(e) {
        if (!touchDragData) return;
        if (touchDragActive) {
            const targetCard = document.querySelector('.task-card.drag-over');
            if (targetCard && targetCard.getAttribute('data-id') !== touchDragData.taskId) {
                const targetId = targetCard.getAttribute('data-id');
                const isTopHalf = targetCard.classList.contains('drag-over-top');
                reorderTask(touchDragData.taskId, targetId, isTopHalf);
            } else {
                renderTasks(); // restore if no valid drop
            }
        }
        endTouchDrag();
    }

    function endTouchDrag() {
        dragClone.style.display = 'none';
        dragClone.style.opacity = '0';
        if (touchDragData && touchDragData.card) {
            touchDragData.card.classList.remove('dragging', 'no-touch-action');
            touchDragData.card.style.opacity = '';
        }
        document.querySelectorAll('.task-card.drag-over, .task-card.drag-over-top, .task-card.drag-over-bottom')
            .forEach(el => el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));
        touchDragData = null;
        touchDragActive = false;
    }

    function updateTouchDropTarget(clientX, clientY) {
        document.querySelectorAll('.task-card.drag-over, .task-card.drag-over-top, .task-card.drag-over-bottom')
            .forEach(el => el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));

        const cards = document.querySelectorAll('.task-card:not(.dragging)');
        let bestCard = null;
        let bestDistance = Infinity;
        let isTopHalf = false;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.sqrt((clientX - centerX) ** 2 + (clientY - centerY) ** 2);
            if (dist < bestDistance && dist < 80) {
                bestDistance = dist;
                bestCard = card;
                isTopHalf = clientY < rect.top + rect.height / 2;
            }
        });

        if (bestCard) {
            bestCard.classList.add('drag-over');
            if (isTopHalf) bestCard.classList.add('drag-over-top');
            else bestCard.classList.add('drag-over-bottom');
        }
    }

    // Global touch listeners to continue drag outside card
    document.addEventListener('touchmove', (e) => {
        if (touchDragActive && touchDragData) {
            const touch = e.touches[0];
            const offsetX = touch.clientX - touchDragData.startX;
            const offsetY = touch.clientY - touchDragData.startY;
            const cardRect = touchDragData.card.getBoundingClientRect();
            dragClone.style.left = (cardRect.left + offsetX) + 'px';
            dragClone.style.top = (cardRect.top + offsetY) + 'px';
            updateTouchDropTarget(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (touchDragActive) handleTouchEnd(e);
    });
    document.addEventListener('touchcancel', () => {
        if (touchDragActive) endTouchDrag();
    });

    // ── Event listeners ──
    btnAdd.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addTask(); }
    });
    deadlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addTask(); }
    });
    document.addEventListener('submit', (e) => e.preventDefault());
    window.addEventListener('resize', () => {
        updateDragCloneBaseStyle();
        if (touchDragActive) endTouchDrag();
    });

    // ── Init ──
    function init() {
        loadTasks();
        renderTasks();
        updateDragCloneBaseStyle();
        taskInput.focus();
        deadlineInput.value = '';
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveTasks();
    });
    window.addEventListener('beforeunload', () => saveTasks());

    init();

    console.log('%c Black & White %cTodo',
        'background:#000;color:#fff;padding:6px 10px;font-family:sans-serif;font-size:14px;',
        'background:#fff;color:#000;padding:6px 10px;font-family:sans-serif;font-size:14px;');
    console.log('%cГотово к работе · Задачи сохраняются локально',
        'color:rgba(255,255,255,0.5);font-family:sans-serif;font-size:12px;');
})();