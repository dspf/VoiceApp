import { auth, onAuthStateChange } from './lib/supabase.js'

// Global user data
let currentUser = null;
let userProfile = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthAndLoadProfile();
    initializeDashboard();
});

// Check authentication and load user profile
async function checkAuthAndLoadProfile() {
    try {
        const { user, error } = await auth.getCurrentUser();
        
        if (error || !user) {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Load user profile
        const { data: profile, error: profileError } = await auth.getUserProfile(user.id);
        
        if (profileError) {
            console.error('Error loading profile:', profileError);
            // Use default profile data
            userProfile = {
                full_name: user.email.split('@')[0],
                company: 'Not specified',
                use_case: 'general'
            };
        } else {
            userProfile = profile;
        }
        
        // Update UI with user data
        updateUserInterface();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    }
}

// Update UI with user data
function updateUserInterface() {
    if (!userProfile) return;
    
    // Update profile section in sidebar
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const companyName = document.getElementById('companyName');
    const profileInitials = document.getElementById('profileInitials');
    
    if (profileName) profileName.textContent = userProfile.full_name || 'User';
    if (profileRole) profileRole.textContent = 'Professional Plan';
    if (companyName) companyName.textContent = userProfile.company || 'No Company';
    
    // Update profile initials
    if (profileInitials) {
        const initials = getInitials(userProfile.full_name || 'User');
        profileInitials.textContent = initials;
        document.getElementById('profileInitialsLarge').textContent = initials;
    }
    
    // Update profile form
    updateProfileForm();
}

// Get initials from full name
function getInitials(fullName) {
    return fullName
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

// Update profile form with current data
function updateProfileForm() {
    if (!userProfile || !currentUser) return;
    
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    // Fill form fields
    const fullNameInput = form.querySelector('#fullName');
    const emailInput = form.querySelector('#email');
    const companyInput = form.querySelector('#company');
    const useCaseSelect = form.querySelector('#useCase');
    
    if (fullNameInput) fullNameInput.value = userProfile.full_name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (companyInput) companyInput.value = userProfile.company || '';
    if (useCaseSelect) useCaseSelect.value = userProfile.use_case || '';
}

// Handle profile form submission
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const saveText = submitBtn.querySelector('.save-text');
    const saveLoading = submitBtn.querySelector('.save-loading');
    
    // Show loading state
    saveText.style.display = 'none';
    saveLoading.style.display = 'inline-flex';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        const updatedProfile = {
            full_name: formData.get('fullName'),
            company: formData.get('company'),
            use_case: formData.get('useCase')
        };
        
        // Update profile in database
        const { error } = await updateUserProfile(updatedProfile);
        
        if (error) {
            throw error;
        }
        
        // Update local profile data
        userProfile = { ...userProfile, ...updatedProfile };
        
        // Update UI
        updateUserInterface();
        
        // Show success message
        showNotification('Profile updated successfully!', 'success');
        
        // Close modal
        closeProfileModal();
        
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Failed to update profile. Please try again.', 'error');
    } finally {
        // Hide loading state
        saveText.style.display = 'inline';
        saveLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Update user profile in database
async function updateUserProfile(profileData) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .update(profileData)
            .eq('id', currentUser.id);
        
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
}

// Handle profile picture change
function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        // Update profile pictures
        const profileImage = document.getElementById('profileImage');
        const profileImageLarge = document.getElementById('profileImageLarge');
        const profileInitials = document.getElementById('profileInitials');
        const profileInitialsLarge = document.getElementById('profileInitialsLarge');
        
        if (profileImage && profileImageLarge) {
            profileImage.src = imageUrl;
            profileImageLarge.src = imageUrl;
            profileImage.style.display = 'block';
            profileImageLarge.style.display = 'block';
            profileInitials.style.display = 'none';
            profileInitialsLarge.style.display = 'none';
        }
    };
    
    reader.readAsDataURL(file);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#667eea'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Modal functions
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        updateProfileForm();
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Handle logout
async function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            const { error } = await auth.signOut();
            if (error) {
                console.error('Logout error:', error);
                showNotification('Failed to sign out. Please try again.', 'error');
            } else {
                showNotification('Signed out successfully!', 'success');
                // Redirect will be handled by auth state change listener
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Failed to sign out. Please try again.', 'error');
        }
    }
}

// Listen for auth state changes
onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'index.html';
    }
});

// Navigation functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'translate': 'Live Translation',
        'transcripts': 'Transcripts',
        'sessions': 'Sessions',
        'analytics': 'Analytics',
        'billing': 'Billing & Usage',
        'settings': 'Settings',
        'support': 'Support'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[pageId] || 'Dashboard';
    }
}

// Initialize dashboard functionality
function initializeDashboard() {
    // Add click handlers to nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
        });
    });
    
    // Add profile form handler
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('profileModal');
        if (event.target === modal) {
            closeProfileModal();
        }
    });
    
    // Add interactive elements
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        });
    });
    
    // Form focus effects
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('focus', function() {
            this.style.borderColor = '#667eea';
            this.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        });
        
        element.addEventListener('blur', function() {
            this.style.borderColor = '#e9ecef';
            this.style.boxShadow = 'none';
        });
    });
    
    // Button ripple effects
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255,255,255,0.5);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Translation functionality
let isRecording = false;
let recordingInterval;

function toggleRecording() {
    const micButton = document.getElementById('micButton');
    const sourceTranscript = document.getElementById('sourceTranscript');
    const targetTranscript = document.getElementById('targetTranscript');
    
    if (!micButton || !sourceTranscript || !targetTranscript) return;
    
    if (!isRecording) {
        // Start recording
        isRecording = true;
        micButton.classList.add('recording');
        sourceTranscript.innerHTML = '<p style="color: #dc3545;">🔴 Recording... Speak now</p>';
        
        // Simulate real-time transcription
        let transcriptText = '';
        const samplePhrases = [
            "Hello, how are you today?",
            "I hope you're having a great day.",
            "Let's discuss the project requirements.",
            "Thank you for your time."
        ];
        
        let phraseIndex = 0;
        recordingInterval = setInterval(() => {
            if (phraseIndex < samplePhrases.length) {
                transcriptText += samplePhrases[phraseIndex] + ' ';
                sourceTranscript.innerHTML = `<p>${transcriptText}</p>`;
                
                // Simulate translation
                const translations = [
                    "Hola, ¿cómo estás hoy?",
                    "Espero que tengas un gran día.",
                    "Discutamos los requisitos del proyecto.",
                    "Gracias por tu tiempo."
                ];
                
                setTimeout(() => {
                    let translatedText = '';
                    for (let i = 0; i <= phraseIndex; i++) {
                        translatedText += translations[i] + ' ';
                    }
                    targetTranscript.innerHTML = `<p>${translatedText}</p>`;
                }, 500);
                
                phraseIndex++;
            } else {
                stopRecording();
            }
        }, 3000);
    } else {
        stopRecording();
    }
}

function stopRecording() {
    isRecording = false;
    const micButton = document.getElementById('micButton');
    if (micButton) {
        micButton.classList.remove('recording');
    }
    clearInterval(recordingInterval);
}

function playTranslation() {
    showNotification('🔊 Playing translated audio...', 'info');
}

function saveTranscript() {
    showNotification('💾 Transcript saved successfully!', 'success');
}

function shareSession() {
    const sessionLink = 'https://app.voicetranslate.com/session/abc123';
    navigator.clipboard.writeText(sessionLink).then(() => {
        showNotification('🔗 Session link copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy link. Please try again.', 'error');
    });
}

function exportTranscript() {
    showNotification('📄 Transcript exported as PDF', 'success');
}

function createNewSession() {
    const sessionId = 'SES-' + Math.floor(Math.random() * 10000);
    const accessKey = Math.random().toString(36).substring(2, 15).toUpperCase();
    showNotification(`✅ New session created! Session ID: ${sessionId}, Access Key: ${accessKey}`, 'success');
}

// Add ripple animation keyframes
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Make functions globally available
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.handleProfilePictureChange = handleProfilePictureChange;
window.handleLogout = handleLogout;
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleRecording = toggleRecording;
window.playTranslation = playTranslation;
window.saveTranscript = saveTranscript;
window.shareSession = shareSession;
window.exportTranscript = exportTranscript;
window.createNewSession = createNewSession;