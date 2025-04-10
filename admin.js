document.addEventListener('DOMContentLoaded', () => {
    // --- Constants for localStorage keys ---
    const LS_VIDEOS_KEY = 'badmintonHubVideos';
    const LS_APPS_KEY = 'badmintonHubApps';
    const LS_SCHEDULE_KEY = 'badmintonHubSchedule';
    const MAX_ITEMS = 5; // Max videos and apps

    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');

    // Video Inputs
    const videoUrlInputs = Array.from(document.querySelectorAll('.video-url-input')); // Use querySelectorAll

    // App Inputs (Grouped)
    const appInputsContainer = document.getElementById('app-inputs-container');
    const appNameInputs = Array.from(appInputsContainer.querySelectorAll('.app-name-input'));
    const appLinkInputs = Array.from(appInputsContainer.querySelectorAll('.app-link-input'));
    const appIconUrlInputs = Array.from(appInputsContainer.querySelectorAll('.app-icon-url-input')); // Changed class selector

    // Schedule Elements
    const scheduleListContainer = document.getElementById('schedule-list-container');
    const addScheduleButton = document.getElementById('add-schedule-button');

    // Save Button
    const saveAllButton = document.getElementById('save-all-button'); // Renamed button ID

    // --- Helper function to extract YouTube Video ID (Keep this) ---
    function extractVideoId(url) {
        if (!url) return null;
        let videoId = null;

        // Regex priority: Covers standard, shorts, embed, youtu.be (including with params like ?si=)
        // It specifically looks for the 11 character ID after known path segments or query params.
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})(?:\S+)?/;
        const match = url.match(regex);

        if (match && match[1]) {
            videoId = match[1];
            // Validate the extracted ID format again just in case
            if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                 console.log(`Regex matched ID: ${videoId} from URL: ${url}`);
                 return videoId;
            } else {
                 console.warn(`Regex matched potential ID "${videoId}" but it's invalid. URL: ${url}`);
                 videoId = null; // Reset if invalid
            }
        }

        // Fallback (less likely needed now, but kept for edge cases)
        if (!videoId) {
             try {
                 const parsedUrl = new URL(url);
                 if (parsedUrl.hostname === 'youtu.be') {
                     // Get the first part of the path after '/'
                     videoId = parsedUrl.pathname.substring(1).split('/')[0];
                 } else if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.searchParams.has('v')) {
                     videoId = parsedUrl.searchParams.get('v');
                 }

                 // Final validation for fallback
                 if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                     console.log(`Fallback URL parsing matched ID: ${videoId} from URL: ${url}`);
                     return videoId;
                 } else {
                     videoId = null; // Reset if invalid
                 }
             } catch (e) {
                 console.warn(`URL parsing failed for: ${url}`, e);
             }
        }

        // If still no valid ID
        if (!videoId) {
            console.warn(`Could not extract valid video ID from: ${url}`);
        }
        return videoId; // Return null if no valid ID found
    }

    // --- Schedule Management Functions ---
    function createScheduleItemElement(item = { date: '', name: '', appName: '' }, apps = []) {
        const div = document.createElement('div');
        div.classList.add('schedule-item');

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = item.date;
        dateInput.classList.add('schedule-date');

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '대회명';
        nameInput.value = item.name;
        nameInput.classList.add('schedule-name');

        const appSelect = document.createElement('select');
        appSelect.classList.add('schedule-app');
        appSelect.innerHTML = '<option value="">연결된 어플 없음</option>'; // Default option
        apps.forEach(app => {
            if (app.name) { // Only add apps with names
                const option = document.createElement('option');
                option.value = app.name;
                option.textContent = app.name;
                if (item.appName === app.name) {
                    option.selected = true;
                }
                appSelect.appendChild(option);
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.classList.add('delete');
        deleteButton.type = 'button'; // Prevent form submission if wrapped in form later
        deleteButton.onclick = () => {
            div.remove();
            console.log('Schedule item removed.');
        };

        div.appendChild(dateInput);
        div.appendChild(nameInput);
        div.appendChild(appSelect);
        div.appendChild(deleteButton);
        return div;
    }

    function addScheduleItem(item, apps) {
        if (!scheduleListContainer) return;
        const scheduleElement = createScheduleItemElement(item, apps);
        scheduleListContainer.appendChild(scheduleElement);
    }

    // --- Load Data from localStorage ---
    function loadData() {
        console.log('Loading data from localStorage...');
        // Load Videos
        const storedVideos = JSON.parse(localStorage.getItem(LS_VIDEOS_KEY) || '[]');
        videoUrlInputs.forEach((input, index) => {
            input.value = storedVideos[index]?.url || '';
        });
        console.log('Loaded videos:', storedVideos);

        // Load Apps
        const storedApps = JSON.parse(localStorage.getItem(LS_APPS_KEY) || '[]');
        appNameInputs.forEach((input, index) => {
            input.value = storedApps[index]?.name || '';
        });
        appLinkInputs.forEach((input, index) => {
            input.value = storedApps[index]?.link || '';
        });
        appIconUrlInputs.forEach((input, index) => { // Changed variable name
            input.value = storedApps[index]?.iconUrl || ''; // Changed property name
        });
        console.log('Loaded apps:', storedApps);

        // Load Schedule
        const storedSchedule = JSON.parse(localStorage.getItem(LS_SCHEDULE_KEY) || '[]');
        scheduleListContainer.innerHTML = ''; // Clear existing schedule items
        storedSchedule.forEach(item => addScheduleItem(item, storedApps)); // Pass loaded apps for dropdown
        console.log('Loaded schedule:', storedSchedule);
    }

    // --- Save Data to localStorage ---
    function saveData() {
        console.log('Saving data to localStorage...');
        // Save Videos
        const videosToSave = [];
        const processedVideoIds = new Set();
        videoUrlInputs.forEach(input => {
            const url = input.value.trim();
            if (url) {
                const videoId = extractVideoId(url);
                if (videoId && !processedVideoIds.has(videoId)) {
                    videosToSave.push({
                        id: videoId,
                        title: `영상 ${videoId}`, // Default title
                        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                        url: `https://www.youtube.com/watch?v=${videoId}`
                    });
                    processedVideoIds.add(videoId);
                } else if (videoId) {
                    console.warn(`Duplicate video ID skipped during save: ${videoId}`);
                } else {
                    console.warn(`Invalid video URL skipped during save: ${url}`);
                }
            }
        });
        localStorage.setItem(LS_VIDEOS_KEY, JSON.stringify(videosToSave));
        console.log('Saved videos:', videosToSave);

        // Save Apps
        const appsToSave = [];
        for (let i = 0; i < MAX_ITEMS; i++) {
            const name = appNameInputs[i].value.trim();
            const link = appLinkInputs[i].value.trim();
            const iconUrl = appIconUrlInputs[i].value.trim(); // Changed variable and input source
            // Only save if at least name or iconUrl is provided
            if (name || iconUrl) {
                appsToSave.push({ name, link, iconUrl }); // Changed property name
            } else {
                 appsToSave.push({}); // Keep placeholder for indexing if needed, or filter later
            }
        }
        // Filter out completely empty entries before saving
        const filteredApps = appsToSave.filter(app => app.name || app.link || app.iconUrl); // Changed property name
        localStorage.setItem(LS_APPS_KEY, JSON.stringify(filteredApps));
        console.log('Saved apps:', filteredApps);

        // Save Schedule
        const scheduleToSave = [];
        const scheduleItems = scheduleListContainer.querySelectorAll('.schedule-item');
        scheduleItems.forEach(item => {
            const date = item.querySelector('.schedule-date').value;
            const name = item.querySelector('.schedule-name').value.trim();
            const appName = item.querySelector('.schedule-app').value;
            if (date && name) { // Only save if date and name are present
                scheduleToSave.push({ date, name, appName });
            }
        });
        localStorage.setItem(LS_SCHEDULE_KEY, JSON.stringify(scheduleToSave));
        console.log('Saved schedule:', scheduleToSave);

        alert('모든 변경사항이 브라우저에 저장되었습니다.');
    }

    // --- Event Listeners ---
    if (saveAllButton) {
        saveAllButton.addEventListener('click', saveData);
    } else {
        console.error('Save button not found!');
    }

    if (addScheduleButton) {
        addScheduleButton.addEventListener('click', () => {
            // Get current apps to populate the dropdown in the new item
            const currentApps = [];
             for (let i = 0; i < MAX_ITEMS; i++) {
                const name = appNameInputs[i].value.trim();
                if (name) {
                    currentApps.push({ name }); // Only need name for dropdown
                }
            }
            addScheduleItem(undefined, currentApps); // Add empty item with current apps
        });
    } else {
        console.error('Add schedule button not found!');
    }

    // --- Authentication ---
    function authenticate() {
        const password = prompt("관리자 비밀번호를 입력하세요:");
        // !! Use a more secure method in a real application !!
        const correctPassword = "admin123"; // Simple hardcoded password

        if (password === correctPassword) {
            console.log("Authentication successful.");
            authContainer.style.display = 'none'; // Hide auth message
            mainContent.style.display = 'block'; // Show main content
            loadData(); // Load all data from localStorage after successful authentication
        } else {
            console.log("Authentication failed.");
            authContainer.innerHTML = '<p style="color: red;">인증 실패. 접근이 거부되었습니다.</p>';
            // Keep main content hidden
        }
    }

    // --- Initial Load ---
    authenticate(); // Start with authentication
});
