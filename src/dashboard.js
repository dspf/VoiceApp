import { auth, onAuthStateChange } from './lib/supabase.js'
import { dashboardAPI } from './lib/dashboard-api.js'

// Global user data
let currentUser = null;
let userProfile = null;
let userSettings = null;
let subscriptionPlans = [];
let currentSubscription = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthAndLoadProfile();
    initializeDashboard();
    await loadDashboardData();
});

// Check authentication and load user profile
async function checkAuthAndLoadProfile() {
    try {
        const { user, error } = await auth.getCurrentUser();
        
        if (error || !user) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Load user profile
        const { data: profile, error: profileError } = await auth.getUserProfile(user.id);
        
        if (profileError) {
            console.error('Error loading profile:', profileError);
            userProfile = {
                full_name: user.email.split('@')[0],
                company: 'Not specified',
                use_case: 'general',
                plan_type: 'professional',
                billing_status: 'active',
                available_credits: 2450,
                monthly_limit_minutes: 5000
            };
        } else {
            userProfile = profile;
        }
        
        // Load user settings
        const { data: settings, error: settingsError } = await dashboardAPI.getUserSettings(user.id);
        if (!settingsError) {
            userSettings = settings;
        }
        
        updateUserInterface();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    }
}

// Load all dashboard data
async function loadDashboardData() {
    if (!currentUser) return;
    
    try {
        // Load dashboard stats
        await loadDashboardStats();
        
        // Load recent sessions
        await loadRecentSessions();
        
        // Load current usage
        await loadCurrentUsage();
        
        // Load subscription data
        await loadSubscriptionData();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    const { data: stats, error } = await dashboardAPI.getDashboardStats(currentUser.id);
    
    if (error) {
        console.error('Error loading stats:', error);
        return;
    }
    
    // Update stat cards
    updateStatCard('totalSessions', stats.totalSessions || 0, '+12% from last month');
    updateStatCard('totalMinutes', stats.totalMinutes || 0, '+8% from last month');
    updateStatCard('languagesUsed', '28', '+3 new languages');
    updateStatCard('accuracyRate', '99.2%', '+0.3% improvement');
}

// Update stat card values
function updateStatCard(type, value, change) {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        const valueElement = card.querySelector('.value');
        const changeElement = card.querySelector('.change');
        
        // Add null checks to prevent errors
        if (!valueElement || !changeElement) {
            return; // Skip this card if elements are missing
        }
        
        if (card.textContent.includes('Total Sessions') && type === 'totalSessions') {
            valueElement.textContent = value.toLocaleString();
            changeElement.textContent = change;
        } else if (card.textContent.includes('Minutes Translated') && type === 'totalMinutes') {
            valueElement.textContent = value.toLocaleString();
            changeElement.textContent = change;
        } else if (card.textContent.includes('Languages Used') && type === 'languagesUsed') {
            valueElement.textContent = value;
            changeElement.textContent = change;
        } else if (card.textContent.includes('Accuracy Rate') && type === 'accuracyRate') {
            valueElement.textContent = value;
            changeElement.textContent = change;
        }
    });
}

// Load recent sessions
async function loadRecentSessions() {
    const { data: sessions, error } = await dashboardAPI.getSessions(currentUser.id);
    
    if (error) {
        console.error('Error loading sessions:', error);
        return;
    }
    
    // Update recent sessions table
    const tbody = document.querySelector('#dashboard table tbody');
    if (tbody && sessions && sessions.length > 0) {
        tbody.innerHTML = sessions.slice(0, 3).map(session => `
            <tr>
                <td>${session.session_name}</td>
                <td>${session.source_language.toUpperCase()} → ${session.target_language.toUpperCase()}</td>
                <td>${session.duration_minutes} min</td>
                <td><span class="status ${session.status}">${session.status.charAt(0).toUpperCase() + session.status.slice(1)}</span></td>
                <td>${formatTimeAgo(session.created_at)}</td>
            </tr>
        `).join('');
    }
}

// Load current usage for billing page
async function loadCurrentUsage() {
    try {
        const { data: usage, error } = await dashboardAPI.getCurrentUsage(currentUser.id);
        
        if (error) {
            console.error('Error loading usage:', error);
            // Use default values when API fails
            const minutesUsed = 0;
            const apiCalls = 0;
            const monthlyLimit = userProfile?.monthly_limit_minutes || 5000;
            const apiLimit = 50000;
            
            updateProgressBar('minutes', minutesUsed, monthlyLimit);
            updateProgressBar('api', apiCalls, apiLimit);
            return;
        }
        
        // Update usage progress bars with real data
        const minutesUsed = usage.minutes_used || 0;
        const apiCalls = usage.api_calls_count || 0;
        const monthlyLimit = userProfile?.monthly_limit_minutes || 5000;
        const apiLimit = 50000;
        
        updateProgressBar('minutes', minutesUsed, monthlyLimit);
        updateProgressBar('api', apiCalls, apiLimit);
    } catch (error) {
        console.error('Error loading usage:', error);
        // Use default values when fetch fails
        const minutesUsed = 0;
        const apiCalls = 0;
        const monthlyLimit = userProfile?.monthly_limit_minutes || 5000;
        const apiLimit = 50000;
        
        updateProgressBar('minutes', minutesUsed, monthlyLimit);
        updateProgressBar('api', apiCalls, apiLimit);
    }
}

// Load subscription data
async function loadSubscriptionData() {
    try {
        // Load subscription plans
        const { data: plans, error: plansError } = await dashboardAPI.getSubscriptionPlans();
        if (!plansError && plans) {
            subscriptionPlans = plans;
        }
        
        // Load current subscription
        const { data: subscription, error: subError } = await dashboardAPI.getUserSubscription(currentUser.id);
        if (!subError) {
            currentSubscription = subscription;
        }
        
        // Update billing UI
        updateBillingInterface();
        
    } catch (error) {
        console.error('Error loading subscription data:', error);
    }
}

// Update billing interface
function updateBillingInterface() {
    // Update current plan info
    const planNameEl = document.getElementById('currentPlanName');
    const planPriceEl = document.getElementById('currentPlanPrice');
    const planStatusEl = document.getElementById('currentPlanStatus');
    
    if (currentSubscription && currentSubscription.subscription_plans) {
        const plan = currentSubscription.subscription_plans;
        if (planNameEl) planNameEl.textContent = plan.name || 'Professional Plan';
        if (planPriceEl) planPriceEl.textContent = `$${plan.amount || 49}/month`;
        if (planStatusEl) {
            planStatusEl.textContent = currentSubscription.status || 'active';
            planStatusEl.className = `plan-status ${currentSubscription.status || 'active'}`;
        }
    } else {
        if (planNameEl) planNameEl.textContent = userProfile?.plan_type || 'Free Plan';
        if (planPriceEl) planPriceEl.textContent = '$0/month';
        if (planStatusEl) {
            planStatusEl.textContent = 'free';
            planStatusEl.className = 'plan-status free';
        }
    }
}

// Update progress bar
function updateProgressBar(type, used, limit) {
    const percentage = Math.min((used / limit) * 100, 100);
    
    if (type === 'minutes') {
        const progressBar = document.querySelector('.progress-fill');
        const usageText = document.querySelector('.progress-bar').previousElementSibling;
        
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            // Add color coding based on usage
            if (percentage > 90) {
                progressBar.style.background = 'linear-gradient(90deg, #dc3545, #fd7e14)';
            } else if (percentage > 75) {
                progressBar.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #FF4444, #000000)';
            }
        }
        if (usageText) {
            usageText.querySelector('span:last-child').textContent = `${used.toLocaleString()} / ${limit.toLocaleString()}`;
        }
    } else if (type === 'api') {
        const apiProgressBar = document.getElementById('apiCallsProgress');
        const apiUsageText = document.getElementById('usageApiCalls');
        
        if (apiProgressBar) {
            apiProgressBar.style.width = percentage + '%';
            if (percentage > 90) {
                apiProgressBar.style.background = 'linear-gradient(90deg, #dc3545, #fd7e14)';
            } else if (percentage > 75) {
                apiProgressBar.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
            } else {
                apiProgressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            }
        }
        if (apiUsageText) {
            apiUsageText.textContent = `${used.toLocaleString()} / ${limit.toLocaleString()}`;
        }
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
    if (profileRole) profileRole.textContent = userProfile.plan_type || 'Professional Plan';
    if (companyName) companyName.textContent = userProfile.company || 'No Company';
    
    // Update profile initials
    if (profileInitials) {
        const initials = getInitials(userProfile.full_name || 'User');
        profileInitials.textContent = initials;
        const profileInitialsLarge = document.getElementById('profileInitialsLarge');
        if (profileInitialsLarge) profileInitialsLarge.textContent = initials;
    }
    
    // Update header credits
    const creditsDisplay = document.querySelector('.header-actions span:nth-child(2)');
    if (creditsDisplay) {
        creditsDisplay.textContent = `Credits: ${(userProfile.available_credits || 2450).toLocaleString()}`;
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
    if (saveText) saveText.style.display = 'none';
    if (saveLoading) saveLoading.style.display = 'inline-flex';
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
        if (saveText) saveText.style.display = 'inline';
        if (saveLoading) saveLoading.style.display = 'none';
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

// Translation functionality
let isRecording = false;
let recordingInterval;
let currentSessionId = null;

async function toggleRecording() {
    const micButton = document.getElementById('micButton');
    const sourceTranscript = document.getElementById('sourceTranscript');
    const targetTranscript = document.getElementById('targetTranscript');
    
    if (!micButton || !sourceTranscript || !targetTranscript) return;
    
    if (!isRecording) {
        // Create new session
        const sourceLanguage = document.getElementById('sourceLanguage')?.value || 'en';
        const targetLanguage = document.getElementById('targetLanguage')?.value || 'es';
        
        const { data: session, error } = await dashboardAPI.createSession(currentUser.id, {
            name: `Session ${new Date().toLocaleTimeString()}`,
            sourceLanguage,
            targetLanguage
        });
        
        if (error) {
            showNotification('Failed to create session', 'error');
            return;
        }
        
        currentSessionId = session.id;
        
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
    
    // Update session duration
    if (currentSessionId) {
        dashboardAPI.updateSession(currentSessionId, {
            status: 'completed',
            duration_minutes: 5, // Simulated duration
            completed_at: new Date().toISOString()
        });
    }
}

async function saveTranscript() {
    if (!currentSessionId) {
        showNotification('No active session to save', 'error');
        return;
    }
    
    const sourceText = document.getElementById('sourceTranscript')?.textContent || '';
    const translatedText = document.getElementById('targetTranscript')?.textContent || '';
    
    if (!sourceText || !translatedText) {
        showNotification('No transcript content to save', 'error');
        return;
    }
    
    const { data, error } = await dashboardAPI.saveTranscript(currentUser.id, {
        sessionId: currentSessionId,
        title: `Transcript ${new Date().toLocaleString()}`,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        sourceText,
        translatedText,
        duration: 5
    });
    
    if (error) {
        showNotification('Failed to save transcript', 'error');
    } else {
        showNotification('💾 Transcript saved successfully!', 'success');
    }
}

async function createNewSession() {
    const { data: session, error } = await dashboardAPI.createSession(currentUser.id, {
        name: `New Session ${new Date().toLocaleString()}`
    });
    
    if (error) {
        showNotification('Failed to create session', 'error');
    } else {
        showNotification(`✅ New session created! Session ID: ${session.access_key}`, 'success');
        // Reload sessions if on sessions page
        if (document.getElementById('sessions').classList.contains('active')) {
            loadSessionsPage();
        }
    }
}

// Load sessions page data
async function loadSessionsPage() {
    const { data: sessions, error } = await dashboardAPI.getSessions(currentUser.id);
    
    if (error) {
        console.error('Error loading sessions:', error);
        return;
    }
    
    const tbody = document.querySelector('#sessions table tbody');
    if (tbody) {
        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td>${session.access_key}</td>
                <td>${session.session_name}</td>
                <td>${session.participants_count} participants</td>
                <td><span class="status ${session.status}">${session.status.charAt(0).toUpperCase() + session.status.slice(1)}</span></td>
                <td>${session.access_key}</td>
                <td>
                    <button class="btn btn-secondary" onclick="joinSession('${session.id}')">🔗 Join</button>
                    <button class="btn btn-secondary" onclick="editSession('${session.id}')">⚙️ Settings</button>
                </td>
            </tr>
        `).join('');
    }
}

// Load transcripts page data
async function loadTranscriptsPage() {
    const { data: transcripts, error } = await dashboardAPI.getTranscripts(currentUser.id);
    
    if (error) {
        console.error('Error loading transcripts:', error);
        return;
    }
    
    const tbody = document.querySelector('#transcripts table tbody');
    if (tbody) {
        tbody.innerHTML = transcripts.map(transcript => `
            <tr>
                <td>${transcript.title}</td>
                <td>${transcript.source_language.toUpperCase()} → ${transcript.target_language.toUpperCase()}</td>
                <td>${transcript.duration_minutes} min</td>
                <td>${formatDate(transcript.created_at)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewTranscript('${transcript.id}')">👁️ View</button>
                    <button class="btn btn-secondary" onclick="exportTranscript('${transcript.id}')">📄 Export</button>
                </td>
            </tr>
        `).join('');
    }
}

// Load billing page data
async function loadBillingPage() {
    // Load subscription data first
    await loadSubscriptionData();
    
    const { data: billingHistory, error } = await dashboardAPI.getBillingHistory(currentUser.id);
    
    if (error) {
        console.error('Error loading billing history:', error);
        return;
    }
    
    const tbody = document.querySelector('#billing table tbody');
    if (tbody) {
        tbody.innerHTML = billingHistory.map(bill => `
            <tr>
                <td>${formatDate(bill.created_at)}</td>
                <td>${bill.description}</td>
                <td>R${bill.amount}</td>
                <td><span class="status ${bill.status}">${bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</span></td>
                <td><button class="btn btn-secondary">📄 Download</button></td>
            </tr>
        `).join('');
    }
}

// Load support page data
async function loadSupportPage() {
    const { data: tickets, error } = await dashboardAPI.getSupportTickets(currentUser.id);
    
    if (error) {
        console.error('Error loading support tickets:', error);
        return;
    }
    
    const tbody = document.querySelector('#support table tbody');
    if (tbody) {
        tbody.innerHTML = tickets.map(ticket => `
            <tr>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.subject}</td>
                <td><span class="status ${ticket.status.replace('_', '-')}">${ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}</span></td>
                <td>${formatDate(ticket.created_at)}</td>
            </tr>
        `).join('');
    }
}

// Load settings page data
async function loadSettingsPage() {
    if (!userSettings) return;
    
    // Update settings form
    const settingsForm = document.querySelector('#settings form');
    if (settingsForm) {
        const inputs = settingsForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            const name = input.name || input.id;
            if (userSettings[name] !== undefined) {
                if (input.type === 'checkbox') {
                    input.checked = userSettings[name];
                } else {
                    input.value = userSettings[name];
                }
            }
        });
    }
    
    // Update API key display
    const apiKeyInput = document.querySelector('input[value*="vt_sk_live_"]');
    if (apiKeyInput && userSettings.api_key) {
        apiKeyInput.value = userSettings.api_key.substring(0, 20) + '••••••••••••••••';
    }
}

// Subscription Management Functions

// Open plan selector modal
async function openPlanSelector() {
    const modal = document.getElementById('planModal');
    const plansContainer = document.getElementById('plansComparison');
    
    if (!modal || !plansContainer) return;
    
    // Load plans if not already loaded
    if (subscriptionPlans.length === 0) {
        const { data: plans, error } = await dashboardAPI.getSubscriptionPlans();
        if (!error && plans) {
            subscriptionPlans = plans;
        }
    }
    
    // Render plans
    plansContainer.innerHTML = subscriptionPlans.map(plan => {
        const isCurrent = currentSubscription && 
                         currentSubscription.subscription_plans && 
                         currentSubscription.subscription_plans.id === plan.id;
        
        const isPopular = plan.name.toLowerCase().includes('professional');
        
        return `
            <div class="plan-card ${isCurrent ? 'current' : ''} ${isPopular ? 'popular' : ''}">
                <h4 class="plan-name">${plan.name}</h4>
                <div class="plan-price">
                    <span class="currency">$</span>${plan.amount}
                    <span class="period">/month</span>
                </div>
                <p class="plan-description">${plan.description || `Perfect for ${plan.name.toLowerCase()} users`}</p>
                <ul class="plan-features">
                    <li>${plan.monthly_minutes.toLocaleString()} translation minutes</li>
                    <li>${plan.monthly_api_calls ? plan.monthly_api_calls.toLocaleString() + ' API calls' : 'Unlimited API calls'}</li>
                    <li>${plan.features ? plan.features.join('</li><li>') : 'Standard features'}</li>
                    ${plan.name.toLowerCase().includes('enterprise') ? '<li>Priority support</li><li>Custom integrations</li>' : ''}
                </ul>
                <button class="plan-button ${isCurrent ? 'current' : 'primary'}" 
                        onclick="${isCurrent ? '' : `selectPlan('${plan.stripe_price_id}')`}"
                        ${isCurrent ? 'disabled' : ''}>
                    ${isCurrent ? 'Current Plan' : 'Select Plan'}
                </button>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close plan selector modal
function closePlanModal() {
    const modal = document.getElementById('planModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Select a subscription plan
async function selectPlan(priceId) {
    const loadingModal = document.getElementById('billingLoadingModal');
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Show loading modal
    if (loadingModal) {
        loadingModal.style.display = 'block';
        if (loadingMessage) loadingMessage.textContent = 'Creating checkout session...';
    }
    
    try {
        const { data, error } = await dashboardAPI.createCheckoutSession(priceId);
        
        if (error) {
            throw error;
        }
        
        if (data.checkout_url) {
            // Update loading message
            if (loadingMessage) loadingMessage.textContent = 'Redirecting to checkout...';
            
            // Redirect to Stripe checkout
            window.location.href = data.checkout_url;
        }
    } catch (error) {
        console.error('Error creating checkout session:', error);
        showNotification('Failed to create checkout session. Please try again.', 'error');
        
        // Hide loading modal
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
}

// Open Stripe customer portal
async function openCustomerPortal() {
    const loadingModal = document.getElementById('billingLoadingModal');
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Show loading modal
    if (loadingModal) {
        loadingModal.style.display = 'block';
        if (loadingMessage) loadingMessage.textContent = 'Opening billing portal...';
    }
    
    try {
        const { data, error } = await dashboardAPI.createPortalSession();
        
        if (error) {
            throw error;
        }
        
        if (data.portal_url) {
            // Redirect to Stripe customer portal
            window.location.href = data.portal_url;
        }
    } catch (error) {
        console.error('Error opening customer portal:', error);
        showNotification('Failed to open billing portal. Please try again.', 'error');
        
        // Hide loading modal
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
}

// Handle successful checkout (called from URL params)
function handleCheckoutSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        showNotification('🎉 Subscription activated successfully!', 'success');
        
        // Reload subscription data
        setTimeout(() => {
            loadSubscriptionData();
        }, 2000);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Utility functions
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show notification
function showNotification(message, type = 'info') {
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
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#FF4444'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

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
    
    // Load page-specific data
    switch(pageId) {
        case 'sessions':
            loadSessionsPage();
            break;
        case 'transcripts':
            loadTranscriptsPage();
            break;
        case 'billing':
            loadBillingPage();
            break;
        case 'support':
            loadSupportPage();
            break;
        case 'settings':
            loadSettingsPage();
            break;
        case 'billing':
            loadBillingPage();
            break;
    }
}

// Initialize dashboard functionality
function initializeDashboard() {
    // Handle checkout success
    handleCheckoutSuccess();
    
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
            this.style.borderColor = '#FF4444';
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

// Placeholder functions for UI interactions
function playTranslation() {
    showNotification('🔊 Playing translated audio...', 'info');
}

function shareSession() {
    const sessionLink = 'https://app.voicetranslate.com/session/abc123';
    navigator.clipboard.writeText(sessionLink).then(() => {
        showNotification('🔗 Session link copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy link. Please try again.', 'error');
    });
}

function exportTranscript(transcriptId) {
    showNotification('📄 Transcript exported as PDF', 'success');
}

function viewTranscript(transcriptId) {
    showNotification('Opening transcript viewer...', 'info');
}

function joinSession(sessionId) {
    showNotification('Joining session...', 'info');
}

function editSession(sessionId) {
    showNotification('Opening session settings...', 'info');
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
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Make functions globally available
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.handleLogout = handleLogout;
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleRecording = toggleRecording;
window.playTranslation = playTranslation;
window.saveTranscript = saveTranscript;
window.shareSession = shareSession;
window.exportTranscript = exportTranscript;
window.createNewSession = createNewSession;
window.viewTranscript = viewTranscript;
window.joinSession = joinSession;
window.editSession = editSession;
window.openPlanSelector = openPlanSelector;
window.closePlanModal = closePlanModal;
window.selectPlan = selectPlan;
window.openCustomerPortal = openCustomerPortal;
window.sendMessage = sendMessage;
window.clearChat = clearChat;
window.toggleVoiceInput = toggleVoiceInput;

// Chat functionality
let isVoiceInputActive = false;
let recognition = null;

// Initialize speech recognition if available
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatInput').value = transcript;
        sendMessage();
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        showNotification('Voice input failed. Please try again.', 'error');
        stopVoiceInput();
    };
    
    recognition.onend = function() {
        stopVoiceInput();
    };
}

// Send message function
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add message to chat
    addMessageToChat(message, 'sent');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate translation delay
    setTimeout(() => {
        translateAndAddMessage(message);
        hideTypingIndicator();
    }, 1000 + Math.random() * 1000);
}

// Add message to chat
function addMessageToChat(message, type, translation = null) {
    const chatMessages = document.getElementById('chatMessages');
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${type}`;
    
    const messageContent = document.createElement('p');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    messageBubble.appendChild(messageContent);
    
    // Add translation if provided
    if (translation && translation !== message) {
        const translationDiv = document.createElement('div');
        translationDiv.className = 'message-translation';
        translationDiv.textContent = `Translation: ${translation}`;
        messageBubble.appendChild(translationDiv);
    }
    
    // Add timestamp
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageBubble.appendChild(timeDiv);
    
    messageGroup.appendChild(messageBubble);
    chatMessages.appendChild(messageGroup);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Translate message and add to chat
function translateAndAddMessage(originalMessage) {
    const targetLanguage = document.getElementById('chatTargetLanguage').value;
    
    // Simulate translation (in real app, this would call a translation API)
    const translations = {
        'es': {
            'Hello': 'Hola',
            'How are you?': '¿Cómo estás?',
            'Good morning': 'Buenos días',
            'Thank you': 'Gracias',
            'Goodbye': 'Adiós'
        },
        'fr': {
            'Hello': 'Bonjour',
            'How are you?': 'Comment allez-vous?',
            'Good morning': 'Bonjour',
            'Thank you': 'Merci',
            'Goodbye': 'Au revoir'
        },
        'de': {
            'Hello': 'Hallo',
            'How are you?': 'Wie geht es dir?',
            'Good morning': 'Guten Morgen',
            'Thank you': 'Danke',
            'Goodbye': 'Auf Wiedersehen'
        }
    };
    
    // Get translation or simulate one
    let translatedMessage = originalMessage;
    if (translations[targetLanguage] && translations[targetLanguage][originalMessage]) {
        translatedMessage = translations[targetLanguage][originalMessage];
    } else if (targetLanguage !== 'en') {
        // Simulate translation by adding language prefix
        const languageNames = {
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        };
        translatedMessage = `[${languageNames[targetLanguage]}] ${originalMessage}`;
    }
    
    // Add translated message as received
    addMessageToChat(translatedMessage, 'received', targetLanguage !== 'en' ? translatedMessage : null);
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Clear chat
function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="message-bubble system">
                    <i class="fas fa-robot"></i>
                    <p>Welcome to Live Chat Translation! Messages will be automatically translated to your selected language.</p>
                </div>
            </div>
        `;
        showNotification('Chat cleared successfully!', 'success');
    }
}

// Toggle voice input
function toggleVoiceInput() {
    if (!recognition) {
        showNotification('Voice input is not supported in your browser.', 'error');
        return;
    }
    
    if (isVoiceInputActive) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

// Start voice input
function startVoiceInput() {
    if (!recognition) return;
    
    isVoiceInputActive = true;
    const voiceIcon = document.getElementById('voiceIcon');
    const voiceBtn = voiceIcon.closest('button');
    
    voiceIcon.className = 'fas fa-stop';
    voiceBtn.classList.add('recording');
    voiceBtn.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
    
    recognition.start();
    showNotification('🎤 Listening... Speak now', 'info');
}

// Stop voice input
function stopVoiceInput() {
    if (!recognition) return;
    
    isVoiceInputActive = false;
    const voiceIcon = document.getElementById('voiceIcon');
    const voiceBtn = voiceIcon.closest('button');
    
    voiceIcon.className = 'fas fa-microphone';
    voiceBtn.classList.remove('recording');
    voiceBtn.style.background = '';
    
    recognition.stop();
}

// Handle Enter key in chat input
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});