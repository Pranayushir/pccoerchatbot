document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const chatButton = document.getElementById('chatButton');
    const chatModal = document.getElementById('chatModal');
    const closeChat = document.getElementById('closeChat');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessage');
    const themeToggle = document.getElementById('themeToggle');
    const voiceButton = document.getElementById('voiceButton');
    const voiceStatus = document.getElementById('voiceStatus');

    // In-memory storage (no localStorage dependency)
    let currentTheme = 'light';
    let chatVisited = false;
    let isListening = false;
    let recognition = null;

    // Dark Mode Functionality
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', function() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        // Add smooth transition effect
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    });

    // Voice Recognition Setup - Fixed Implementation
    function initializeVoiceRecognition() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported in this browser');
            voiceButton.style.display = 'none';
            showNotification('Voice input not supported in this browser', 'warning');
            return false;
        }

        try {
            // Use the correct API
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            
            // Configure recognition settings
            recognition.continuous = false;
            recognition.interimResults = false; // Changed to false for better stability
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            // Event handlers
            recognition.onstart = function() {
                console.log('Voice recognition started');
                isListening = true;
                voiceButton.classList.add('listening');
                
                // Update voice button appearance
                const micIcon = voiceButton.querySelector('.mic-icon');
                if (micIcon) {
                    micIcon.style.color = '#f44336';
                }
                
                // Show status indicator
                voiceStatus.style.display = 'flex';
                voiceStatus.innerHTML = '<div class="voice-animation"></div><span>Listening...</span>';
            };

            recognition.onresult = function(event) {
                console.log('Voice recognition result received');
                let transcript = '';
                
                // Get the transcript
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript;
                    }
                }

                // Clean up transcript
                transcript = transcript.trim();
                console.log('Voice transcript:', transcript);

                if (transcript) {
                    // Set the input value
                    chatInput.value = transcript;
                    
                    // Focus on input
                    chatInput.focus();
                    
                    // Show success notification
                    showNotification('Voice input captured: "' + transcript + '"', 'success');
                    
                    // Auto-send if it looks like a complete sentence
                    if (transcript.length > 3 && 
                        (transcript.endsWith('.') || 
                         transcript.endsWith('?') || 
                         transcript.endsWith('!') ||
                         transcript.split(' ').length > 2)) {
                        
                        setTimeout(() => {
                            sendMessage();
                        }, 1000);
                    }
                }
            };

            recognition.onend = function() {
                console.log('Voice recognition ended');
                isListening = false;
                voiceButton.classList.remove('listening');
                
                // Reset voice button appearance
                const micIcon = voiceButton.querySelector('.mic-icon');
                if (micIcon) {
                    micIcon.style.color = '';
                }
                
                // Hide status indicator
                voiceStatus.style.display = 'none';
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                isListening = false;
                voiceButton.classList.remove('listening');
                
                // Reset voice button appearance
                const micIcon = voiceButton.querySelector('.mic-icon');
                if (micIcon) {
                    micIcon.style.color = '';
                }
                
                voiceStatus.style.display = 'none';
                
                let errorMessage = 'Voice recognition error. Please try again.';
                switch(event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please speak clearly and try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not found. Please check your microphone.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Microphone permission denied. Please allow microphone access.';
                        break;
                    case 'network':
                        errorMessage = 'Network error. Please check your internet connection.';
                        break;
                    case 'aborted':
                        errorMessage = 'Voice recognition was stopped.';
                        break;
                }
                
                showNotification(errorMessage, 'error');
            };

            console.log('Voice recognition initialized successfully');
            return true;

        } catch (error) {
            console.error('Error initializing voice recognition:', error);
            voiceButton.style.display = 'none';
            showNotification('Voice input initialization failed', 'error');
            return false;
        }
    }

    // Voice Button Click Handler - Fixed
    voiceButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (!recognition) {
            if (!initializeVoiceRecognition()) {
                return;
            }
        }

        if (isListening) {
            // Stop listening
            try {
                recognition.stop();
                showNotification('Voice input stopped', 'info');
            } catch (error) {
                console.error('Error stopping voice recognition:', error);
            }
        } else {
            // Start listening
            try {
                recognition.start();
                showNotification('Voice input started. Please speak clearly.', 'info');
            } catch (error) {
                console.error('Error starting voice recognition:', error);
                showNotification('Failed to start voice input. Please try again.', 'error');
            }
        }
    });

    // Enhanced notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            error: '#f44336',
            success: '#4caf50',
            info: '#2196f3',
            warning: '#ff9800'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Add animation styles if not present
        if (!document.querySelector('style[data-notifications]')) {
            const style = document.createElement('style');
            style.setAttribute('data-notifications', 'true');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove notification
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
    }

    // Chat functionality
    chatButton.addEventListener('click', function() {
        chatModal.style.display = chatModal.style.display === 'flex' ? 'none' : 'flex';
        if (chatModal.style.display === 'flex') {
            setTimeout(() => chatInput.focus(), 100);
        }
    });

    closeChat.addEventListener('click', function() {
        chatModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === chatModal) {
            chatModal.style.display = 'none';
        }
    });

    // Enhanced text formatting
    function formatBotResponse(text) {
        text = text.replace(/\n/g, '<br>');
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/^\* (.+)$/gm, '• $1');
        text = text.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px;">$1</code>');
        return text;
    }

    // Enhanced send message function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'message user-message';
        userMessageDiv.textContent = message;
        chatBody.appendChild(userMessageDiv);

        // Clear input
        chatInput.value = '';

        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.innerHTML = '<div class="loader"></div> Thinking...';
        chatBody.appendChild(typingDiv);

        // Auto-scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            // Send message to backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove typing indicator
            if (typingDiv.parentNode) {
                chatBody.removeChild(typingDiv);
            }

            // Add bot response
            const botResponseDiv = document.createElement('div');
            botResponseDiv.className = 'message bot-message';
            botResponseDiv.innerHTML = formatBotResponse(data.response);
            chatBody.appendChild(botResponseDiv);

        } catch (error) {
            // Remove typing indicator
            if (typingDiv.parentNode) {
                chatBody.removeChild(typingDiv);
            }

            // Display error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message bot-message';
            errorDiv.innerHTML = '<strong>Sorry, I\'m having trouble connecting to the server.</strong><br>Please try again later or check your internet connection.';
            chatBody.appendChild(errorDiv);
            console.error('Error:', error);
            
            showNotification('Connection error. Please try again.', 'error');
        }

        // Auto-scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);

    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle quick option buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('chat-option-button')) {
            const option = e.target.textContent;
            chatInput.value = option;
            sendMessage();
        }
    });

    // Initialize voice recognition on page load
    setTimeout(() => {
        initializeVoiceRecognition();
    }, 1000);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to open chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            chatModal.style.display = chatModal.style.display === 'flex' ? 'none' : 'flex';
            if (chatModal.style.display === 'flex') {
                setTimeout(() => chatInput.focus(), 100);
            }
        }

        // Escape to close chat
        if (e.key === 'Escape' && chatModal.style.display === 'flex') {
            chatModal.style.display = 'none';
        }

        // Ctrl/Cmd + D to toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            themeToggle.click();
        }

        // Ctrl/Cmd + M to toggle voice input (when chat is open)
        if ((e.ctrlKey || e.metaKey) && e.key === 'm' && chatModal.style.display === 'flex') {
            e.preventDefault();
            voiceButton.click();
        }
    });

    // Auto-focus chat input when modal opens
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (chatModal.style.display === 'flex') {
                    setTimeout(() => {
                        chatInput.focus();
                    }, 100);
                }
            }
        });
    });

    observer.observe(chatModal, {
        attributes: true,
        attributeFilter: ['style']
    });

    // Welcome notification
    setTimeout(() => {
        if (!chatVisited) {
            showNotification('Welcome! Click the chat button to get started. Voice input available!', 'info');
            chatVisited = true;
        }
    }, 2000);

    // Dynamic placeholder text
    const placeholderTexts = [
        'Type a message or click the mic for voice input...',
        'Ask about admissions...',
        'Need help with fees?',
        'Questions about courses?',
        'Try voice input!'
    ];
    let currentPlaceholder = 0;

    setInterval(() => {
        if (chatInput && document.activeElement !== chatInput && !isListening) {
            chatInput.placeholder = placeholderTexts[currentPlaceholder];
            currentPlaceholder = (currentPlaceholder + 1) % placeholderTexts.length;
        }
    }, 3000);

    // Check microphone permissions on load
    setTimeout(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    console.log('Microphone access granted');
                })
                .catch((error) => {
                    console.warn('Microphone access not granted:', error);
                    showNotification('For voice input, please allow microphone access when prompted.', 'warning');
                });
        }
    }, 3000);

    console.log('Voice-enabled chatbot initialized successfully!');
});