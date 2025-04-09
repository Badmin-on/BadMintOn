document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');
    // Get all individual URL input fields
    const urlInputs = [
        document.getElementById('video-url-1'),
        document.getElementById('video-url-2'),
        document.getElementById('video-url-3'),
        document.getElementById('video-url-4'),
        document.getElementById('video-url-5'),
    ];
    const updateButton = document.getElementById('update-button');

    // --- Helper function to extract YouTube Video ID (Further Refined) ---
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

    // --- Update and Download JSON ---
    updateButton.addEventListener('click', () => {
        const newVideos = [];
        const processedIds = new Set(); // Keep track of added IDs to avoid duplicates
        console.log("--- Processing URLs from input fields ---"); // Log start

        // Iterate through the input fields
        for (let i = 0; i < urlInputs.length; i++) {
            const inputField = urlInputs[i];
            const url = inputField.value.trim();

            // Skip empty fields
            if (!url) {
                console.log(`Input field ${i + 1} is empty, skipping.`);
                continue;
            }

            console.log(`Attempting to process URL from input ${i + 1}: ${url}`); // Log each URL

            // We already limit by the number of input fields (5)
            // if (newVideos.length >= 5) break; // This check is implicitly handled

            const videoId = extractVideoId(url);
            console.log(`Extracted ID: ${videoId}`); // Log extracted ID (or null)

            if (videoId && !processedIds.has(videoId)) {
                console.log(`Valid ID found: ${videoId}. Adding to list.`);
                newVideos.push({
                    id: videoId,
                    title: `영상 ${videoId}`, // Default title, index.html uses this if needed
                    description: '', // Default description
                    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, // Used by index.html
                    url: `https://www.youtube.com/watch?v=${videoId}` // Canonical URL
                });
                processedIds.add(videoId);
            } else if (videoId && processedIds.has(videoId)) {
                 console.warn(`Duplicate video ID skipped: ${videoId} (URL: ${url})`);
            } else {
                 // Warning already logged inside extractVideoId if extraction failed
                 console.warn(`Skipping URL (Invalid ID or duplicate): ${url}`);
            }
        }
        console.log("--- Finished processing URLs ---"); // Log end

        if (newVideos.length === 0) {
            alert('입력된 URL 중에서 유효한 유튜브 영상 링크를 찾지 못했습니다.');
            return;
        }

        // Generate and trigger download
        const dataStr = JSON.stringify(newVideos, null, 2); // Pretty print JSON
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'videos.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        console.log('Generated videos.json for download:', newVideos);
        alert(`${newVideos.length}개의 영상 정보가 포함된 videos.json 파일 다운로드를 시작합니다.\n\n다운로드 완료 후, 이 파일을 badminton_hub 폴더에 덮어쓰기 해주세요.`);
        // Optionally clear the textarea after successful generation
        // videoUrlsTextarea.value = '';
    });

    // --- Load existing video URLs into input fields ---
    async function loadExistingUrls() {
        try {
            // Fetch videos.json with cache busting
            const response = await fetch('videos.json?t=' + Date.now());
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('videos.json not found. Input fields will be empty.');
                    // Clear inputs if file not found
                    urlInputs.forEach(input => input.value = '');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const existingVideos = await response.json();

            if (Array.isArray(existingVideos)) {
                console.log('Loaded existing videos:', existingVideos);
                // Populate input fields
                urlInputs.forEach((input, index) => {
                    if (existingVideos[index] && existingVideos[index].url) {
                        input.value = existingVideos[index].url;
                    } else {
                        input.value = ''; // Clear field if no corresponding video exists
                    }
                });
            } else {
                 console.warn('videos.json content is not an array. Clearing inputs.');
                 urlInputs.forEach(input => input.value = '');
            }
        } catch (error) {
            console.error('Error loading existing videos for admin inputs:', error);
            // Optionally clear inputs on error
            urlInputs.forEach(input => input.value = '');
        }
    }


    // --- Authentication ---
    function authenticate() {
        const password = prompt("관리자 비밀번호를 입력하세요:");
        const correctPassword = "admin123"; // Simple hardcoded password

        if (password === correctPassword) {
            console.log("Authentication successful.");
            authContainer.style.display = 'none'; // Hide auth message
            mainContent.style.display = 'block'; // Show main content
            loadExistingUrls(); // Load existing URLs after successful authentication
        } else {
            console.log("Authentication failed.");
            authContainer.innerHTML = '<p style="color: red;">인증 실패. 접근이 거부되었습니다.</p>';
            // Keep main content hidden
        }
    }

    // --- Initial Load ---
    authenticate(); // Start with authentication
});
