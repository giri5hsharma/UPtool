// Random Background Selection
function setRandomBackground() {
    const backgrounds = [
        'images/background.jpg',
        'images/background2.jpg',
        'images/background3.jpg',
        'images/background4.jpg',
        'images/background5.jpg',
        'images/background6.jpg'
    ];
    
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];
    
    // Set the CSS variable for the background image
    document.documentElement.style.setProperty('--bg-image', `url("${selectedBackground}")`);
}

// Date and Time Update Function
function updateDateTime() {
    try {
        const now = new Date();
        
        // Format date (e.g., "July 25, 2025")
        const dateOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('en-US', dateOptions);
        
        // Format time (e.g., "2:30:45 PM")
        const timeOptions = {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        const timeString = now.toLocaleTimeString('en-US', timeOptions);
        
        // Format day (e.g., "Friday")
        const dayOptions = { weekday: 'long' };
        const dayString = now.toLocaleDateString('en-US', dayOptions);
        
        // Update the DOM elements
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');
        const dayElement = document.getElementById('currentDay');
        
        if (dateElement) {
            dateElement.textContent = dateString;
            dateElement.style.color = 'white';
            dateElement.style.visibility = 'visible';
        }
        
        if (timeElement) {
            timeElement.textContent = timeString;
            timeElement.style.color = 'white';
            timeElement.style.visibility = 'visible';
        }
        
        if (dayElement) {
            dayElement.textContent = dayString;
            dayElement.style.color = 'white';
            dayElement.style.visibility = 'visible';
        }
        
    } catch (error) {
        console.error('Error updating date/time:', error);
    }
}

// Set random background immediately when script loads
setRandomBackground();

// Start date/time updates immediately
updateDateTime();
setInterval(updateDateTime, 1000);

// Enhanced Todo List Functionality
document.addEventListener('DOMContentLoaded', function() {
    const todoInput = document.getElementById('todoInput');
    const todoContainer = document.getElementById('todoContainer');
    const todoDisplayContainer = document.getElementById('todoDisplayContainer');
    const completedTodosSection = document.getElementById('completedTodosSection');
    const completedContainer = document.getElementById('completedContainer');
    const completedToggleIcon = document.getElementById('completedToggleIcon');
    const ongoingToggleIcon = document.getElementById('ongoingToggleIcon');
    const notification = document.getElementById('notification');
    const searchInput = document.getElementById('searchInput');
    const resetTodosBtn = document.getElementById('resetTodosBtn');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationYes = document.getElementById('confirmationYes');
    const confirmationNo = document.getElementById('confirmationNo');
    const closeConfirmationModal = document.getElementById('closeConfirmationModal');
    
    // Mode Selection Elements
    const modeSelector = document.getElementById('modeSelector');
    const todoSection = document.getElementById('todoSection');
    const blockerSection = document.getElementById('blockerSection');
    
    // Website Blocker Elements
    const blockingToggle = document.getElementById('blockingToggle');
    const websiteInput = document.getElementById('websiteInput');
    const addWebsiteBtn = document.getElementById('addWebsiteBtn');
    const blockedSitesList = document.getElementById('blockedSitesList');
    const blockedCount = document.getElementById('blockedCount');
    const focusStats = document.getElementById('focusStatusMain');
    const quickBlockBtns = document.querySelectorAll('.quick-block-btn');
    
    let activeTodos = [];
    let completedTodos = [];
    let pendingRestoreIndex = -1; // Track which completed todo is being restored

    // Mode Selection Functionality
    function switchMode(mode) {
        if (mode === 'todo') {
            todoSection.classList.remove('hidden');
            blockerSection.classList.add('hidden');
        } else if (mode === 'blocker') {
            todoSection.classList.add('hidden');
            blockerSection.classList.remove('hidden');
        }
    }

    // Initialize with todo mode
    switchMode('todo');

    // Mode selector event listener
    modeSelector.addEventListener('change', function() {
        switchMode(this.value);
    });
    
    // Website Blocker Variables
    let isBlockingEnabled = false;
    let blockedSites = [];
    let dailyStats = { date: null, blockedAttempts: 0, timeSaved: 0 };
    
    // Chrome Storage Functions
    function saveTodosToStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({
                'activeTodos': activeTodos,
                'completedTodos': completedTodos,
                'isBlockingEnabled': isBlockingEnabled,
                'blockedSites': blockedSites,
                'dailyStats': dailyStats
            });
        } else {
            // Fallback to localStorage for development/testing
            localStorage.setItem('activeTodos', JSON.stringify(activeTodos));
            localStorage.setItem('completedTodos', JSON.stringify(completedTodos));
            localStorage.setItem('isBlockingEnabled', JSON.stringify(isBlockingEnabled));
            localStorage.setItem('blockedSites', JSON.stringify(blockedSites));
            localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
        }
    }
    
    function loadTodosFromStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['activeTodos', 'completedTodos', 'isBlockingEnabled', 'blockedSites', 'dailyStats'], function(result) {
                activeTodos = result.activeTodos || [];
                completedTodos = result.completedTodos || [];
                isBlockingEnabled = result.isBlockingEnabled || false;
                blockedSites = result.blockedSites || [];
                
                // Handle daily stats with proper date checking
                const today = new Date().toDateString();
                dailyStats = result.dailyStats || { date: today, blockedAttempts: 0, timeSaved: 0 };
                
                // Reset daily stats if it's a new day
                if (dailyStats.date !== today) {
                    dailyStats = { date: today, blockedAttempts: 0, timeSaved: 0 };
                    saveTodosToStorage(); // Save the reset stats
                }
                
                refreshTodoDisplay();
                updateCompletedTodos();
                updateContainerVisibility();
                updateProgressBar();
                updateBlockerUI();
            });
        } else {
            // Fallback to localStorage for development/testing
            const savedActiveTodos = localStorage.getItem('activeTodos');
            const savedCompletedTodos = localStorage.getItem('completedTodos');
            const savedBlockingEnabled = localStorage.getItem('isBlockingEnabled');
            const savedBlockedSites = localStorage.getItem('blockedSites');
            const savedDailyStats = localStorage.getItem('dailyStats');
            
            if (savedActiveTodos) {
                activeTodos = JSON.parse(savedActiveTodos);
            }
            if (savedCompletedTodos) {
                completedTodos = JSON.parse(savedCompletedTodos);
            }
            if (savedBlockingEnabled) {
                isBlockingEnabled = JSON.parse(savedBlockingEnabled);
            }
            if (savedBlockedSites) {
                blockedSites = JSON.parse(savedBlockedSites);
            }
            if (savedDailyStats) {
                const parsed = JSON.parse(savedDailyStats);
                const today = new Date().toDateString();
                if (parsed.date === today) {
                    dailyStats = parsed;
                } else {
                    dailyStats = { date: today, blockedAttempts: 0, timeSaved: 0 };
                }
            }
            
            refreshTodoDisplay();
            updateCompletedTodos();
            updateContainerVisibility();
            updateProgressBar();
            updateBlockerUI();
        }
    }
    
    // Load todos when page loads
    loadTodosFromStorage();
    
    // Event Listeners
    todoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    searchInput.addEventListener('input', filterTodos);
    resetTodosBtn.addEventListener('click', resetAllTodos);
    
    // Add event listeners for toggle sections
    document.getElementById('ongoingHeader').addEventListener('click', toggleOngoingSection);
    document.getElementById('completedHeader').addEventListener('click', toggleCompletedSection);
    
    // Website Blocker Event Listeners
    blockingToggle.addEventListener('change', toggleBlocking);
    addWebsiteBtn.addEventListener('click', addWebsiteToBlock);
    websiteInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addWebsiteToBlock();
        }
    });
    
    // Quick block buttons
    quickBlockBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const site = this.getAttribute('data-site');
            addSiteToBlockList(site);
        });
    });
    
    // Modal event listeners
    confirmationYes.addEventListener('click', confirmRestore);
    confirmationNo.addEventListener('click', closeModal);
    closeConfirmationModal.addEventListener('click', closeModal);
    confirmationModal.addEventListener('click', function(e) {
        if (e.target === confirmationModal) {
            closeModal();
        }
    });
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDateInput.value = tomorrow.toISOString().split('T')[0];

    // Modal Functions
    function showConfirmationModal(index) {
        pendingRestoreIndex = index;
        confirmationModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closeModal() {
        confirmationModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scrolling
        pendingRestoreIndex = -1;
    }
    
    function confirmRestore() {
        if (pendingRestoreIndex !== -1) {
            restoreCompletedTodo(pendingRestoreIndex);
        }
        closeModal();
    }
    
    // Confetti Animation Function
    function createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti confetti-fall';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000);
        }
    }
    
    // Update Progress Bar
    function updateProgressBar() {
        const total = activeTodos.length + completedTodos.length;
        const completed = completedTodos.length;
        const percentage = total === 0 ? 0 : (completed / total) * 100;
        
        progressBar.style.width = percentage + '%';
        progressText.textContent = `${completed}/${total}`;
        
        // Trigger confetti when 100% complete
        if (percentage === 100 && total > 0) {
            createConfetti();
            showNotification('🎉 Congratulations! All tasks completed!');
        }
    }
    
    // Get Priority Color
    function getPriorityColor(priority) {
        const colors = {
            high: { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' },
            medium: { bg: '#fef3c7', border: '#fcd34d', text: '#d97706' },
            low: { bg: '#d1fae5', border: '#86efac', text: '#059669' }
        };
        return colors[priority] || colors.medium;
    }
    
    // Check if task is overdue
    function isOverdue(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
    }
    
    // Get priority value for sorting (higher number = higher priority)
    function getPriorityValue(priority) {
        switch(priority) {
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 1;
        }
    }
    
    // Sort todos by due date and priority
    function sortActiveTodos() {
        activeTodos.sort((a, b) => {
            const aOverdue = a.dueDate ? isOverdue(a.dueDate) : false;
            const bOverdue = b.dueDate ? isOverdue(b.dueDate) : false;
            
            // First, prioritize overdue tasks
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            
            // If both are overdue or both are not overdue
            if (aOverdue === bOverdue) {
                // Sort by priority (higher priority first)
                const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
                if (priorityDiff !== 0) return priorityDiff;
                
                // If same priority, sort by due date
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                
                // Tasks without due dates go to the bottom
                if (!a.dueDate && b.dueDate) return 1;
                if (a.dueDate && !b.dueDate) return -1;
                
                // If both have no due date, maintain original order
                return 0;
            }
        });
    }
    
    // Function to refresh todo display with sorted order
    function refreshTodoDisplay() {
        // Sort the todos
        sortActiveTodos();
        
        // Clear the container
        todoContainer.innerHTML = '';
        
        // Re-create all todo elements in sorted order
        activeTodos.forEach(todoObj => {
            createTodoElement(todoObj);
        });
        
        // Apply current search filter if any
        if (searchInput.value.trim() !== '') {
            filterTodos();
        }
    }
    
    // Filter Todos Function
    function filterTodos() {
        const searchTerm = searchInput.value.toLowerCase();
        const todoItems = todoContainer.querySelectorAll('.todo-item');
        
        todoItems.forEach(item => {
            const text = item.querySelector('.todo-text').textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Reset All Todos Function
    function resetAllTodos() {
        if (activeTodos.length === 0 && completedTodos.length === 0) {
            showNotification('No todos to reset!');
            return;
        }
        
        // Confirm before resetting
        if (confirm('Are you sure you want to delete all todos? This action cannot be undone.')) {
            activeTodos = [];
            completedTodos = [];
            
            // Clear the displays
            todoContainer.innerHTML = '';
            completedContainer.innerHTML = '';
            
            // Hide containers
            todoDisplayContainer.classList.add('hidden');
            completedTodosSection.classList.add('hidden');
            
            // Update progress
            updateProgressBar();
            
            // Save to storage
            saveTodosToStorage();
            
            // Show confirmation
            showNotification('All todos have been cleared! 🗑️');
        }
    }
    
    // Track if container has been shown before
    let hasAnimated = false;
    let hasCompletedAnimated = false;
    
    // Function to show notification
    function showNotification(message = 'New todo item added! Let\'s get going and get the bag!') {
        // Clear any existing timeout to prevent conflicts
        if (window.notificationTimeout) {
            clearTimeout(window.notificationTimeout);
        }
        
        // Update notification message
        const notificationText = notification.querySelector('span');
        notificationText.textContent = message;
        
        // Slide in from top (move from -60px to 10px from top)
        notification.style.top = '10px';
        
        // Hide after 2 seconds with slide out animation
        window.notificationTimeout = setTimeout(() => {
            notification.style.top = '-60px';
            window.notificationTimeout = null;
        }, 2000);
    }
    
    // Function to check if container should be visible
    function updateContainerVisibility() {
        // Only show todo container if it has items AND is not manually hidden
        if (activeTodos.length > 0) {
            const wasHidden = todoDisplayContainer.classList.contains('hidden');
            todoDisplayContainer.classList.remove('hidden');
            
            // Ensure the todo container content is visible when there are todos
            todoContainer.classList.remove('hidden');
            todoContainer.style.maxHeight = 'none';
            ongoingToggleIcon.style.transform = 'rotate(180deg)';
            
            // Only animate on first appearance
            if (wasHidden && !hasAnimated) {
                todoDisplayContainer.classList.add('animate-popup');
                hasAnimated = true;
            }
        } else {
            todoDisplayContainer.classList.add('hidden');
            // Reset animation flag when container is hidden
            hasAnimated = false;
            todoDisplayContainer.classList.remove('animate-popup');
            // Reset ongoing toggle when no todos (but don't force hide the container)
            ongoingToggleIcon.style.transform = 'rotate(0deg)';
        }
        
        // Show completed section if it has items - BOTH section AND container
        if (completedTodos.length > 0) {
            const wasCompletedHidden = completedTodosSection.classList.contains('hidden');
            
            // Show the outer section
            completedTodosSection.classList.remove('hidden');
            
            // Show the inner container
            completedContainer.classList.remove('hidden');
            completedContainer.style.maxHeight = 'none';
            completedContainer.style.display = 'block';
            completedContainer.style.visibility = 'visible';
            completedToggleIcon.style.transform = 'rotate(180deg)';
            
            // Only animate on first appearance
            if (wasCompletedHidden && !hasCompletedAnimated) {
                completedTodosSection.classList.add('animate-popup');
                hasCompletedAnimated = true;
            }
        } else {
            completedTodosSection.classList.add('hidden');
            completedContainer.classList.add('hidden');
            // Reset animation flag when container is hidden
            hasCompletedAnimated = false;
            completedTodosSection.classList.remove('animate-popup');
            // Reset completed toggle when no completed todos
            completedToggleIcon.style.transform = 'rotate(0deg)';
        }
        
        // Update progress bar
        updateProgressBar();
    }
    
    // Function to add a new todo
    function addTodo() {
        const todoText = todoInput.value.trim();
        const priority = prioritySelect.value;
        const dueDate = dueDateInput.value;
        
        if (todoText === '') {
            return;
        }
        
        // Create todo object with enhanced data
        const todoObj = {
            id: Date.now(),
            text: todoText,
            priority: priority,
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        activeTodos.push(todoObj);
        
        // Save to storage
        saveTodosToStorage();
        
        // Refresh display with proper sorting
        refreshTodoDisplay();
        
        // Update container visibility
        updateContainerVisibility();
        
        // Show notification
        showNotification();

        // Clear inputs
        todoInput.value = '';
        // Reset due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Function to create todo element with enhanced features
    function createTodoElement(todoObj) {
        const priorityColors = getPriorityColor(todoObj.priority);
        const isTaskOverdue = todoObj.dueDate && isOverdue(todoObj.dueDate);
        
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item bg-gray-100 bg-opacity-60 px-4 py-3 rounded-lg border-2 hover:bg-opacity-80 transition-all duration-200 cursor-pointer ${isTaskOverdue ? 'ring-2 ring-red-400' : ''}`;
        todoItem.style.borderColor = priorityColors.border;
        todoItem.style.backgroundColor = priorityColors.bg;
        todoItem.setAttribute('data-id', todoObj.id);
        
        const dueDateFormatted = todoObj.dueDate ? new Date(todoObj.dueDate).toLocaleDateString() : 'No due date';
        const priorityIcon = todoObj.priority === 'high' ? '🔴' : todoObj.priority === 'medium' ? '🟡' : '🟢';
        
        todoItem.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                        data-todo-id="${todoObj.id}"
                    />
                    <div class="flex-1">
                        <span class="todo-text text-gray-700 font-medium">${todoObj.text}</span>
                        <div class="flex items-center gap-3 mt-1 text-xs">
                            <span class="flex items-center gap-1">
                                ${priorityIcon} ${todoObj.priority.charAt(0).toUpperCase() + todoObj.priority.slice(1)}
                            </span>
                            <span class="flex items-center gap-1 ${isTaskOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}">
                                📅 ${dueDateFormatted} ${isTaskOverdue ? '(OVERDUE!)' : ''}
                            </span>
                        </div>
                    </div>
                </div>
                <button class="remove-todo-btn text-red-500 hover:text-red-700 ml-2" data-todo-id="${todoObj.id}">
                    ×
                </button>
            </div>
        `;
        
        // Add event listeners using proper DOM event handling
        const checkbox = todoItem.querySelector('.todo-checkbox');
        const removeBtn = todoItem.querySelector('.remove-todo-btn');
        
        checkbox.addEventListener('change', function() {
            toggleComplete(todoObj.id);
        });
        
        removeBtn.addEventListener('click', function() {
            removeTodo(todoObj.id);
        });
        
        // Add to container
        todoContainer.appendChild(todoItem);
        
        return todoItem;
    }
    
    // Function to toggle completion
    function toggleComplete(todoId) {
        const todoObj = activeTodos.find(todo => todo.id === todoId);
        const todoElement = document.querySelector(`[data-id="${todoId}"]`);
        
        if (!todoObj || !todoElement) return;
        
        const checkbox = todoElement.querySelector('.todo-checkbox');
        const span = todoElement.querySelector('.todo-text');
        const isChecked = checkbox.checked;
        
        if (!isChecked) {
            // Unchecking - remove completion styling
            span.classList.remove('line-through', 'text-gray-400');
            span.classList.add('text-gray-700');
            todoElement.classList.remove('bg-opacity-40');
            todoElement.classList.add('bg-opacity-60');
            
            // Clear any pending removal timeout
            if (todoElement.removalTimeout) {
                clearTimeout(todoElement.removalTimeout);
                delete todoElement.removalTimeout;
            }
        } else {
            // Checking off - add completion styling
            span.classList.add('line-through', 'text-gray-400');
            span.classList.remove('text-gray-700');
            todoElement.classList.remove('bg-opacity-60');
            todoElement.classList.add('bg-opacity-40');
            
            // Show completion notification
            showNotification('🎊 One step closer to chasing your goal!');
            
            // Set timeout to remove after 3 seconds and move to completed
            todoElement.removalTimeout = setTimeout(() => {
                // Move from active to completed
                const activeIndex = activeTodos.findIndex(todo => todo.id === todoId);
                if (activeIndex > -1) {
                    const completedTodo = activeTodos.splice(activeIndex, 1)[0];
                    completedTodo.completedAt = new Date().toISOString();
                    completedTodos.push(completedTodo);
                    
                    // Save to storage
                    saveTodosToStorage();
                    
                    // Update displays
                    updateCompletedTodos();
                    updateContainerVisibility();
                }
                
                // Add fade-out animation
                todoElement.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                todoElement.style.opacity = '0';
                todoElement.style.transform = 'translateX(-20px)';
                
                // Remove element after animation
                setTimeout(() => {
                    if (todoElement.parentNode) {
                        todoElement.remove();
                    }
                }, 500);
            }, 3000); // 3 seconds delay
        }
    }
    
    // Function to remove todo
    function removeTodo(todoId) {
        const todoElement = document.querySelector(`[data-id="${todoId}"]`);
        const activeIndex = activeTodos.findIndex(todo => todo.id === todoId);
        
        if (activeIndex > -1) {
            activeTodos.splice(activeIndex, 1);
            
            // Save to storage
            saveTodosToStorage();
            
            // Refresh display to maintain proper sorting
            refreshTodoDisplay();
        }
        
        // Update container visibility after removal
        updateContainerVisibility();
    }
    
    // Function to update completed todos display
    function updateCompletedTodos() {
        // Clear the container
        completedContainer.innerHTML = '';
        
        completedTodos.forEach((todo, index) => {
            const completedItem = document.createElement('div');
            completedItem.className = 'bg-gray-100 bg-opacity-40 px-3 py-2 rounded-lg border border-gray-300';
            
            const completedDate = new Date(todo.completedAt).toLocaleString();
            const dueDateFormatted = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
            const priorityIcon = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢';
            
            completedItem.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 flex-1">
                        <input 
                            type="checkbox" 
                            class="todo-checkbox w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                            checked
                            disabled
                        />
                        <div>
                            <span class="text-gray-600 text-xs line-through">${todo.text}</span>
                            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>${priorityIcon} ${todo.priority}</span>
                                <span>📅 ${dueDateFormatted}</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-1">Completed: ${completedDate}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button 
                            class="restore-btn text-green-500 hover:text-green-700 text-lg font-bold transition-colors duration-200" 
                            data-index="${index}"
                            title="Restore to active tasks"
                        >
                            +
                        </button>
                        <button 
                            class="delete-completed-btn text-red-400 hover:text-red-600 ml-1 text-xs" 
                            data-index="${index}"
                            title="Delete permanently"
                        >
                            ×
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners using proper DOM event handling
            const restoreBtn = completedItem.querySelector('.restore-btn');
            const deleteBtn = completedItem.querySelector('.delete-completed-btn');
            
            restoreBtn.addEventListener('click', function() {
                showConfirmationModal(index);
            });
            
            deleteBtn.addEventListener('click', function() {
                removeCompleted(index);
            });
            
            completedContainer.appendChild(completedItem);
        });
    }
    
    // Function to toggle completed section
    function toggleCompletedSection() {
        const isHidden = completedContainer.classList.contains('hidden');
        
        if (isHidden) {
            completedContainer.classList.remove('hidden');
            completedContainer.style.maxHeight = 'none';
            completedToggleIcon.style.transform = 'rotate(180deg)';
        } else {
            completedContainer.classList.add('hidden');
            completedContainer.style.maxHeight = '0';
            completedToggleIcon.style.transform = 'rotate(0deg)';
        }
    }
    
    // Function to toggle ongoing section
    function toggleOngoingSection() {
        const isHidden = todoContainer.classList.contains('hidden');
        
        if (isHidden) {
            todoContainer.classList.remove('hidden');
            todoContainer.style.maxHeight = 'none';
            ongoingToggleIcon.style.transform = 'rotate(180deg)';
        } else {
            todoContainer.classList.add('hidden');
            todoContainer.style.maxHeight = '0';
            ongoingToggleIcon.style.transform = 'rotate(0deg)';
        }
    }
    
    // Function to restore completed todo back to active
    function restoreCompletedTodo(index) {
        if (index >= 0 && index < completedTodos.length) {
            const restoredTodo = completedTodos.splice(index, 1)[0];
            
            // Remove completion data and restore as active
            delete restoredTodo.completedAt;
            restoredTodo.completed = false;
            
            // Add back to active todos
            activeTodos.push(restoredTodo);
            
            // Save to storage
            saveTodosToStorage();
            
            // Refresh display with proper sorting
            refreshTodoDisplay();
            
            // Update displays
            updateCompletedTodos();
            updateContainerVisibility();
            
            // Show notification
            showNotification('🔄 Task restored to active list!');
        }
    }
    
    // Function to remove completed todo
    function removeCompleted(index) {
        completedTodos.splice(index, 1);
        
        // Save to storage
        saveTodosToStorage();
        
        updateCompletedTodos();
        updateContainerVisibility();
    }
    
    // Website Blocker Functions
    function toggleBlocking() {
        isBlockingEnabled = blockingToggle.checked;
        console.log('Blocking toggled:', isBlockingEnabled);
        
        saveTodosToStorage();
        updateBlockerUI();
        
        // Notify background script immediately
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'updateBlockingStatus',
                isBlockingEnabled: isBlockingEnabled,
                blockedSites: blockedSites
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error updating blocking status:', chrome.runtime.lastError.message);
                }
            });
        }
        
        if (isBlockingEnabled) {
            showNotification('🚫 Focus mode activated! Distracting sites are now blocked.');
        } else {
            showNotification('✅ Focus mode deactivated. All sites are accessible.');
        }
    }
    
    function addWebsiteToBlock() {
        const website = websiteInput.value.trim();
        if (website === '') {
            return;
        }
        
        addSiteToBlockList(website);
        websiteInput.value = '';
    }
    
    function addSiteToBlockList(site) {
        // Clean the URL - remove protocol and www
        const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase().trim();
        
        // Validate the site format
        if (!cleanSite || cleanSite.length < 3) {
            showNotification('⚠️ Please enter a valid website URL!');
            return;
        }
        
        // Check if already blocked
        if (blockedSites.includes(cleanSite)) {
            showNotification('⚠️ This site is already blocked!');
            return;
        }
        
        // Add to blocked sites
        blockedSites.push(cleanSite);
        console.log('Added site to block list:', cleanSite);
        console.log('Current blocked sites:', blockedSites);
        console.log('Blocking enabled:', isBlockingEnabled);
        
        saveTodosToStorage();
        updateBlockerUI();
        
        // Notify background script immediately
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'updateBlockedSites',
                blockedSites: blockedSites,
                isBlockingEnabled: isBlockingEnabled
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error updating blocked sites:', chrome.runtime.lastError.message);
                }
            });
        }
        
        showNotification(`🚫 ${cleanSite} has been added to your block list!`);
    }
    
    function removeSiteFromBlockList(site) {
        const index = blockedSites.indexOf(site);
        if (index > -1) {
            blockedSites.splice(index, 1);
            saveTodosToStorage();
            updateBlockerUI();
            showNotification(`✅ ${site} has been removed from your block list.`);
        }
    }
    
    // Function to get website favicon
    function getWebsiteIcon(domain) {
        // Try multiple favicon services for better reliability
        const faviconUrls = [
            `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
            `https://favicons.githubusercontent.com/${domain}`,
            `https://icon.horse/icon/${domain}`,
            `https://${domain}/favicon.ico`
        ];
        
        return new Promise((resolve) => {
            let currentIndex = 0;
            
            function tryNextUrl() {
                if (currentIndex >= faviconUrls.length) {
                    // If all fail, resolve with a default icon
                    resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04IDRMMTIgOEw4IDEyTDQgOEw4IDRaIiBmaWxsPSIjOUIzOTRCIi8+Cjwvc3ZnPgo=');
                    return;
                }
                
                const img = new Image();
                const url = faviconUrls[currentIndex];
                
                img.onload = function() {
                    // Check if the image actually loaded (not a broken icon)
                    if (this.naturalWidth > 0 && this.naturalHeight > 0) {
                        resolve(url);
                    } else {
                        currentIndex++;
                        tryNextUrl();
                    }
                };
                
                img.onerror = function() {
                    currentIndex++;
                    tryNextUrl();
                };
                
                // Set a timeout for each attempt
                setTimeout(() => {
                    if (!img.complete) {
                        img.onload = img.onerror = null;
                        currentIndex++;
                        tryNextUrl();
                    }
                }, 2000);
                
                img.src = url;
            }
            
            tryNextUrl();
        });
    }
    
    function updateBlockerUI() {
        // Update toggle state
        blockingToggle.checked = isBlockingEnabled;
        
        // Update blocked sites count
        blockedCount.textContent = `${blockedSites.length} sites`;
        
        // Update focus status with conditional message
        if (isBlockingEnabled) {
            focusStats.textContent = 'Active';
            focusStats.style.color = '#059669'; // Green
            focusStats.style.fontWeight = '600';
        } else {
            focusStats.textContent = 'Not Focused Enough';
            focusStats.style.color = '#dc2626'; // Red
            focusStats.style.fontWeight = '600';
        }
        
        // Update blocked sites list
        blockedSitesList.innerHTML = '';
        
        if (blockedSites.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'text-sm text-gray-500 italic text-center py-2';
            emptyState.textContent = 'No sites blocked yet. Add some to stay focused!';
            blockedSitesList.appendChild(emptyState);
        } else {
            blockedSites.forEach(async (site, index) => {
                const siteItem = document.createElement('div');
                siteItem.className = 'website-item flex items-center justify-between bg-white bg-opacity-50 px-3 py-2 text-sm';
                siteItem.setAttribute('data-index', index);
                
                // Create icon element with loading state
                const iconElement = document.createElement('img');
                iconElement.className = 'website-icon loading';
                iconElement.alt = `${site} icon`;
                
                siteItem.innerHTML = `
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="icon-container"></div>
                        <span class="flex-1 truncate" style="color: #333446" title="${site}">${site}</span>
                    </div>
                    <button class="remove-site-btn text-red-500 hover:text-red-700 ml-2 font-bold transition-colors duration-200" data-site="${site}" title="Remove ${site}">×</button>
                `;
                
                // Insert the icon
                const iconContainer = siteItem.querySelector('.icon-container');
                iconContainer.appendChild(iconElement);
                
                // Add remove functionality
                const removeBtn = siteItem.querySelector('.remove-site-btn');
                removeBtn.addEventListener('click', function() {
                    removeSiteFromBlockList(site);
                });
                
                blockedSitesList.appendChild(siteItem);
                
                // Load the actual icon asynchronously
                try {
                    const iconUrl = await getWebsiteIcon(site);
                    iconElement.src = iconUrl;
                    iconElement.classList.remove('loading');
                    
                    // Handle icon load error
                    iconElement.onerror = function() {
                        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04IDRMMTIgOEw4IDEyTDQgOEw4IDRaIiBmaWxsPSIjOUIzOTRCIi8+Cjwvc3ZnPgo=';
                        this.classList.remove('loading');
                    };
                } catch (error) {
                    console.error(`Failed to load icon for ${site}:`, error);
                    iconElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04IDRMMTIgOEw4IDEyTDQgOEw4IDRaIiBmaWxsPSIjOUIzOTRCIi8+Cjwvc3ZnPgo=';
                    iconElement.classList.remove('loading');
                }
            });
        }
        
        // Update section visibility based on blocking state
        const blockerSection = document.getElementById('blockerSection');
        if (isBlockingEnabled) {
            blockerSection.style.borderLeft = '4px solid #ef4444';
        } else {
            blockerSection.style.borderLeft = '4px solid #6b7280';
        }
    }
    
    // Load daily stats on page load
    async function loadDailyStats() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // Request daily stats from background script
                chrome.runtime.sendMessage({ action: 'getDailyStats' }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error getting daily stats:', chrome.runtime.lastError.message);
                        return;
                    }
                    
                    if (response && response.dailyStats) {
                        dailyStats = response.dailyStats;
                        updateBlockerUI();
                    } else {
                        console.warn('No daily stats received from background script');
                    }
                });
            } else {
                console.warn('Chrome runtime not available for daily stats');
            }
        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    }
    
    // Load daily stats when the page loads
    loadDailyStats();
    
    // Refresh daily stats every 30 seconds to stay updated
    setInterval(loadDailyStats, 30000);
    
    // Make modal function globally available for test function
    window.showConfirmationModal = showConfirmationModal;
});

console.log("UPtool initialized with Focus Mode!");
console.log("🚀 Your productivity companion with website blocking");
