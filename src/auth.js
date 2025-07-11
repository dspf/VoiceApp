import { auth, onAuthStateChange } from './lib/supabase.js'

// Show loading state
function showLoading(button, loadingText) {
  const originalText = button.innerHTML
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`
  button.disabled = true
  return originalText
}

// Hide loading state
function hideLoading(button, originalText) {
  button.innerHTML = originalText
  button.disabled = false
}

// Show error message
function showError(message) {
  // Create or update error message element
  let errorElement = document.querySelector('.auth-error')
  if (!errorElement) {
    errorElement = document.createElement('div')
    errorElement.className = 'auth-error'
    errorElement.style.cssText = `
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #fecaca;
      font-size: 0.9rem;
    `
  }
  errorElement.textContent = message
  
  // Insert at the top of the active modal
  const activeModal = document.querySelector('.modal[style*="block"]')
  if (activeModal) {
    const form = activeModal.querySelector('form')
    if (form && !form.querySelector('.auth-error')) {
      form.insertBefore(errorElement, form.firstChild)
    }
  }
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (errorElement.parentNode) {
      errorElement.remove()
    }
  }, 5000)
}

// Show success message
function showSuccess(message) {
  let successElement = document.querySelector('.auth-success')
  if (!successElement) {
    successElement = document.createElement('div')
    successElement.className = 'auth-success'
    successElement.style.cssText = `
      background: #d1fae5;
      color: #065f46;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #a7f3d0;
      font-size: 0.9rem;
    `
  }
  successElement.textContent = message
  
  const activeModal = document.querySelector('.modal[style*="block"]')
  if (activeModal) {
    const form = activeModal.querySelector('form')
    if (form && !form.querySelector('.auth-success')) {
      form.insertBefore(successElement, form.firstChild)
    }
  }
}

// Clear messages
function clearMessages() {
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => el.remove())
}

// Handle signup form submission
export async function handleSignup(event) {
  event.preventDefault()
  clearMessages()
  
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = showLoading(submitBtn, 'Creating Account...')
  
  const formData = new FormData(form)
  const userData = {
    full_name: formData.get('fullName'),
    company: formData.get('company'),
    use_case: formData.get('useCase')
  }
  
  const email = formData.get('email')
  const password = formData.get('password')
  
  // Basic validation
  if (!email || !password || !userData.full_name || !userData.use_case) {
    showError('Please fill in all required fields')
    hideLoading(submitBtn, originalText)
    return
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters long')
    hideLoading(submitBtn, originalText)
    return
  }
  
  try {
    const { data, error } = await auth.signUp(email, password, userData)
    
    if (error) {
      throw error
    }
    
    if (data.user) {
      showSuccess('Account created successfully! Please check your email to verify your account.')
      form.reset()
      
      // Close modal after 2 seconds
      setTimeout(() => {
        closeModal()
      }, 2000)
    }
  } catch (error) {
    console.error('Signup error:', error)
    showError(error.message || 'Failed to create account. Please try again.')
  } finally {
    hideLoading(submitBtn, originalText)
  }
}

// Handle login form submission
export async function handleLogin(event) {
  event.preventDefault()
  clearMessages()
  
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = showLoading(submitBtn, 'Signing In...')
  
  const formData = new FormData(form)
  const email = formData.get('email')
  const password = formData.get('password')
  
  if (!email || !password) {
    showError('Please enter both email and password')
    hideLoading(submitBtn, originalText)
    return
  }
  
  try {
    const { data, error } = await auth.signIn(email, password)
    
    if (error) {
      throw error
    }
    
    if (data.user) {
      showSuccess('Login successful! Redirecting to dashboard...')
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        window.location.href = 'Dashboard.html'
      }, 1000)
    }
  } catch (error) {
    console.error('Login error:', error)
    showError(error.message || 'Invalid email or password. Please try again.')
  } finally {
    hideLoading(submitBtn, originalText)
  }
}

// Check if user is already logged in
export async function checkAuthState() {
  try {
    const { user, error } = await auth.getCurrentUser()
    
    if (error) {
      console.error('Auth check error:', error)
      return
    }
    
    // If user is logged in and on index page, redirect to dashboard
    if (user && window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      window.location.href = 'Dashboard.html'
    }
  } catch (error) {
    console.error('Auth state check failed:', error)
  }
}

// Listen for auth state changes
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in:', session.user.email)
    // Redirect will be handled by the login function
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
    // Redirect to home page if on dashboard
    if (window.location.pathname.includes('Dashboard.html')) {
      window.location.href = 'index.html'
    }
  }
})

// Make functions globally available
window.handleSignup = handleSignup
window.handleLogin = handleLogin