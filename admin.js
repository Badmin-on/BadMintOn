document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_ITEMS = 5; // Max videos and apps
    const VIDEOS_FILENAME = 'videos.json';
    const APPS_FILENAME = 'apps.json';
    const SCHEDULE_FILENAME = 'schedule.json';

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

    // --- Helper Function to Trigger Download ---
    function triggerDownload(filename, data) {
        const dataStr = JSON.stringify(data, null, 2); // Pretty print JSON
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        console.log(`Triggered download for ${filename}`);
    }

    // --- Load Data from JSON Files ---
    async function loadData() {
        console.log('Loading data from JSON files...');
        let loadedApps = []; // Need apps data for schedule dropdown

        // --- Load Apps ---
        try {
            const response = await fetch(`${APPS_FILENAME}?t=${Date.now()}`); // Cache bust
            if (!response.ok) {
                if (response.status === 404) console.log(`${APPS_FILENAME} not found. Inputs will be empty.`);
                else throw new Error(`HTTP error loading ${APPS_FILENAME}! status: ${response.status}`);
                loadedApps = []; // Ensure it's an empty array on error/404
            } else {
                loadedApps = await response.json();
                if (!Array.isArray(loadedApps)) {
                    console.warn(`${APPS_FILENAME} content is not an array. Treating as empty.`);
                    loadedApps = [];
                }
            }
            // Populate App inputs
            appNameInputs.forEach((input, index) => input.value = loadedApps[index]?.name || '');
            appLinkInputs.forEach((input, index) => input.value = loadedApps[index]?.link || '');
            appIconUrlInputs.forEach((input, index) => input.value = loadedApps[index]?.iconUrl || '');
            console.log('Loaded apps:', loadedApps);
        } catch (error) {
            console.error(`Error loading ${APPS_FILENAME}:`, error);
            // Clear inputs on error
            appNameInputs.forEach(input => input.value = '');
            appLinkInputs.forEach(input => input.value = '');
            appIconUrlInputs.forEach(input => input.value = '');
            loadedApps = []; // Reset on error
        }

        // --- Load Videos ---
        try {
            const response = await fetch(`${VIDEOS_FILENAME}?t=${Date.now()}`); // Cache bust
            let loadedVideos = [];
            if (!response.ok) {
                 if (response.status === 404) console.log(`${VIDEOS_FILENAME} not found. Inputs will be empty.`);
                 else throw new Error(`HTTP error loading ${VIDEOS_FILENAME}! status: ${response.status}`);
            } else {
                loadedVideos = await response.json();
                 if (!Array.isArray(loadedVideos)) {
                    console.warn(`${VIDEOS_FILENAME} content is not an array. Treating as empty.`);
                    loadedVideos = [];
                }
            }
            // Populate Video inputs
            videoUrlInputs.forEach((input, index) => input.value = loadedVideos[index]?.url || '');
            console.log('Loaded videos:', loadedVideos);
        } catch (error) {
            console.error(`Error loading ${VIDEOS_FILENAME}:`, error);
            videoUrlInputs.forEach(input => input.value = ''); // Clear inputs on error
        }

        // --- Load Schedule ---
        try {
            const response = await fetch(`${SCHEDULE_FILENAME}?t=${Date.now()}`); // Cache bust
            let loadedSchedule = [];
             if (!response.ok) {
                 if (response.status === 404) console.log(`${SCHEDULE_FILENAME} not found. Inputs will be empty.`);
                 else throw new Error(`HTTP error loading ${SCHEDULE_FILENAME}! status: ${response.status}`);
            } else {
                loadedSchedule = await response.json();
                 if (!Array.isArray(loadedSchedule)) {
                    console.warn(`${SCHEDULE_FILENAME} content is not an array. Treating as empty.`);
                    loadedSchedule = [];
                }
            }
            // Populate Schedule inputs (using the apps loaded earlier)
            scheduleListContainer.innerHTML = ''; // Clear existing schedule items
            loadedSchedule.forEach(item => addScheduleItem(item, loadedApps));
            console.log('Loaded schedule:', loadedSchedule);
        } catch (error) {
            console.error(`Error loading ${SCHEDULE_FILENAME}:`, error);
            scheduleListContainer.innerHTML = ''; // Clear schedule on error
        }
    }

    // --- Save Data to JSON Files (Trigger Download) ---
    function saveData() {
        console.log('Gathering data to generate JSON files...');

        // --- Prepare Video Data ---
        const videoData = [];
        const processedVideoIds = new Set();
        videoUrlInputs.forEach(input => {
            const url = input.value.trim();
            if (url) {
                const videoId = extractVideoId(url);
                if (videoId && !processedVideoIds.has(videoId)) {
                    videoData.push({
                        id: videoId,
                        title: `영상 ${videoId}`, // Default title
                        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                        url: `https://www.youtube.com/watch?v=${videoId}`
                    });
                    processedVideoIds.add(videoId);
                } else if (videoId) {
                    console.warn(`Duplicate video ID skipped for ${VIDEOS_FILENAME}: ${videoId}`);
                } else {
                    console.warn(`Invalid video URL skipped for ${VIDEOS_FILENAME}: ${url}`);
                }
            }
        });
        console.log('Video data prepared:', videoData);

        // --- Prepare App Data ---
        const appData = [];
        for (let i = 0; i < MAX_ITEMS; i++) {
            const name = appNameInputs[i].value.trim();
            const link = appLinkInputs[i].value.trim();
            const iconUrl = appIconUrlInputs[i].value.trim();
            // Only save if at least name or iconUrl is provided
            if (name || iconUrl) {
                appData.push({ name, link, iconUrl });
            }
            // No need for placeholders, just skip empty entries
        }
        console.log('App data prepared:', appData);

        // --- Prepare Schedule Data ---
        const scheduleData = [];
        const scheduleItems = scheduleListContainer.querySelectorAll('.schedule-item');
        scheduleItems.forEach(item => {
            const date = item.querySelector('.schedule-date').value;
            const name = item.querySelector('.schedule-name').value.trim();
            const appName = item.querySelector('.schedule-app').value;
            if (date && name) { // Only save if date and name are present
                scheduleData.push({ date, name, appName });
            }
        });
        console.log('Schedule data prepared:', scheduleData);

        // --- Trigger Downloads ---
        if (videoData.length > 0) {
            triggerDownload(VIDEOS_FILENAME, videoData);
        } else {
            console.log(`No valid video data to save to ${VIDEOS_FILENAME}.`);
        }

        if (appData.length > 0) {
             triggerDownload(APPS_FILENAME, appData);
        } else {
             console.log(`No valid app data to save to ${APPS_FILENAME}.`);
        }

         if (scheduleData.length > 0) {
             triggerDownload(SCHEDULE_FILENAME, scheduleData);
        } else {
             console.log(`No valid schedule data to save to ${SCHEDULE_FILENAME}.`);
        }

        alert('JSON 파일 다운로드가 시작됩니다.\n다운로드된 파일을 badminton_hub 폴더에 덮어쓰고 Git에 커밋/푸시해주세요.');
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
