(function() {
    // ── DOM references ──
    const taskInput = document.getElementById('taskInput');
    const deadlineInput = document.getElementById('deadlineInput');
    const btnAdd = document.getElementById('btnAdd');
    const taskList = document.getElementById('taskList');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const body = document.body;

    // ── State ──
    const STORAGE_KEY = 'bw-todo-tasks-v4';
    let tasks = [];
    let taskToDelete = null;
    let isModalOpen = false;

    // Drag state (pointer events)
    let dragState = null;
    const DRAG_THRESHOLD = 5; // пикселей, чтобы отличить клик от перетаскивания

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
        } catch (err) {}
        document.body.removeChild(textarea);
    }

    function showCopiedFeedback(button) {
        button.classList.add('copied');
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

    // ── Pointer‑based Drag & Drop ──
    function onPointerDown(e) {
        // Игнорируем, если открыто модальное окно
        if (isModalOpen) return;
        // Не начинаем перетаскивание на кнопках или чекбоксе
        if (e.target.closest('.btn-delete, .btn-copy, .checkbox-wrap')) return;

        const card = e.currentTarget;
        const taskId = card.getAttribute('data-id');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Захватываем указатель, чтобы получать события даже за пределами элемента
        card.setPointerCapture(e.pointerId);

        dragState = {
            card: card,
            taskId: taskId,
            task: task,
            startX: e.clientX,
            startY: e.clientY,
            pointerId: e.pointerId,
            clone: null,
            moved: false,
            initialRect: card.getBoundingClientRect(),
        };

        // Убираем стандартное поведение браузера (скролл, выделение)
        e.preventDefault();
        e.stopPropagation();
    }

    function onPointerMove(e) {
        if (!dragState) return;
        // Проверяем, что событие от того же указателя
        if (e.pointerId !== dragState.pointerId) return;

        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (!dragState.moved && distance < DRAG_THRESHOLD) return;

        if (!dragState.moved) {
            // Активируем перетаскивание
            dragState.moved = true;
            body.classList.add('dragging-active');
            const card = dragState.card;
            card.classList.add('dragging');

            // Создаём клон
            const clone = createDragClone(dragState.task.text);
            dragState.clone = clone;
            const rect = card.getBoundingClientRect();
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.display = 'block';
            // Фиксируем начальные смещения мыши относительно карточки
            dragState.offsetX = e.clientX - rect.left;
            dragState.offsetY = e.clientY - rect.top;
        }

        // Перемещаем клон
        const clone = dragState.clone;
        if (clone) {
            const x = e.clientX - dragState.offsetX;
            const y = e.clientY - dragState.offsetY;
            clone.style.left = x + 'px';
            clone.style.top = y + 'px';
        }

        // Обновляем индикатор вставки
        updateDropIndicator(e.clientX, e.clientY, dragState.card);
        e.preventDefault();
    }

    function onPointerUp(e) {
        if (!dragState) return;

        if (dragState.moved) {
            // Завершаем перетаскивание
            const targetCard = getDropTarget(e.clientX, e.clientY, dragState.card);
            if (targetCard && targetCard !== dragState.card) {
                const targetId = targetCard.getAttribute('data-id');
                const rect = targetCard.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const insertBefore = e.clientY < midY;
                reorderTask(dragState.taskId, targetId, insertBefore);
            } else {
                // Нет цели – просто перерисовываем без изменений
                renderTasks();
            }
            cleanupDrag();
        } else {
            // Это был клик, не перетаскивание – ничего не делаем
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
        // Удаляем клон
        if (dragState.clone) {
            dragState.clone.remove();
        }
        // Убираем классы с карточки
        const card = dragState.card;
        if (card) {
            card.classList.remove('dragging');
            card.releasePointerCapture(dragState.pointerId);
        }
        // Убираем индикатор вставки
        removeDropIndicator();
        body.classList.remove('dragging-active');
        dragState = null;
    }

    function createDragClone(text) {
        const clone = document.createElement('div');
        clone.className = 'drag-clone';
        clone.textContent = text;
        document.body.appendChild(clone);
        return clone;
    }

    // Индикатор вставки — временный элемент, показывающий, куда встанет задача
    let dropIndicator = null;

    function updateDropIndicator(clientX, clientY, draggedCard) {
        const target = getDropTarget(clientX, clientY, draggedCard);
        removeDropIndicator();

        if (!target || target === draggedCard) return;

        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = clientY < midY;

        // Создаём или переиспользуем индикатор
        if (!dropIndicator) {
            dropIndicator = document.createElement('div');
            dropIndicator.className = 'drop-indicator';
            taskList.appendChild(dropIndicator);
        }

        // Позиционируем индикатор
        if (insertBefore) {
            target.before(dropIndicator);
            target.classList.add('drop-before');
            target.classList.remove('drop-after');
        } else {
            target.after(dropIndicator);
            target.classList.add('drop-after');
            target.classList.remove('drop-before');
        }

        dropIndicator.classList.add('active');
    }

    function removeDropIndicator() {
        if (dropIndicator) {
            dropIndicator.remove();
            dropIndicator = null;
        }
        // Убираем временные классы у всех карточек
        document.querySelectorAll('.task-card.drop-before, .task-card.drop-after').forEach(card => {
            card.classList.remove('drop-before', 'drop-after');
        });
    }

    function getDropTarget(clientX, clientY, draggedCard) {
        const cards = document.querySelectorAll('.task-card:not(.dragging)');
        let bestCard = null;
        let bestDistance = Infinity;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // Считаем расстояние до центра карточки
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.hypot(clientX - centerX, clientY - centerY);
            if (dist < bestDistance && dist < 100) { // порог срабатывания
                bestDistance = dist;
                bestCard = card;
            }
        });

        return bestCard;
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

    // Глобальные слушатели для перемещения и отпускания
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    // Потеря захвата (если браузер отменил)
    document.addEventListener('lostpointercapture', (e) => {
        if (dragState && dragState.card === e.target) {
            cleanupDrag();
        }
    });

    // Предотвращаем стандартное поведение браузера при перетаскивании картинок и т.п.
    document.addEventListener('dragstart', (e) => e.preventDefault());

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
        if (dragState) cleanupDrag();
    });

    // ── Init ──
    function init() {
        loadTasks();
        renderTasks();
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
    console.log('%cПеретаскивание теперь на Pointer Events – работает везде одинаково надёжно',
        'color:rgba(255,255,255,0.5);font-family:sans-serif;font-size:12px;');
})();