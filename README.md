# VoiceTranslate Website

A modern voice translation website built with Vite and vanilla JavaScript.

## Features

- Real-time voice translation
- Modern, responsive design
- Multiple language support
- User authentication with Supabase
- Payment integration with Stripe

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## GitHub Pages Deployment

To deploy this website to GitHub Pages:

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository named `voicetranslate-website`
2. Make it public (required for free GitHub Pages)
3. Don't initialize with README (we already have files)

### 2. Push Code to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit"

# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/voicetranslate-website.git

# Push to main branch
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically deploy your site

### 4. Access Your Site

After deployment, your site will be available at:
`https://YOUR_USERNAME.github.io/voicetranslate-website/`

## Configuration

- The site is configured to work with GitHub Pages using the base path `/voicetranslate-website/`
- GitHub Actions workflow automatically builds and deploys on push to main branch
- Environment variables should be set in GitHub repository secrets for production

## Environment Variables

For production deployment, set these secrets in your GitHub repository:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

## License

MIT License