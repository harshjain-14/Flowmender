# FlowMender

**AI-Powered PRD Edge Case Finder**

FlowMender is an intelligent web application that analyzes Product Requirements Documents (PRDs) using Google Gemini AI to identify missing user journeys, edge cases, and potential issues that could impact product development and user experience.

## 🚀 Features

- **Smart Document Analysis**: Upload PDF, DOCX, or TXT files for comprehensive AI analysis
- **Advanced Edge Case Detection**: Identify missing flows, inconsistencies, UX gaps, and logical contradictions
- **User Journey Mapping**: Automatically extract and visualize user workflows from PRDs
- **Comprehensive Reporting**: Export findings as PDF, Markdown, or JSON
- **Team Collaboration**: Save analysis history and share insights with your team
- **Credit-Based System**: Flexible usage with transparent credit management
- **Real-time Processing**: Live progress tracking during AI analysis

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Google Gemini 2.0 Flash
- **Build Tool**: Vite
- **Deployment**: Netlify
- **Analytics**: Microsoft Clarity

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- A Supabase account and project
- A Google AI API key (Gemini)
- Git for version control

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flowmender.git
   cd flowmender
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the migrations in the `supabase/migrations` folder
   - Enable email authentication in Supabase Auth settings

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

### Netlify Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - Set environment variables in Netlify dashboard
   - Deploy with build command: `npm run build`
   - Publish directory: `dist`

### Environment Variables for Production

Set these in your Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

## 📊 Database Schema

The application uses the following main tables:

- **documents**: Store uploaded PRD files
- **analysis_results**: Store AI analysis results
- **user_credits**: Manage user credit balances
- **credit_usage_log**: Track credit consumption
- **payment_transactions**: Handle payment processing

## 🔐 Authentication

FlowMender uses Supabase Auth with:
- Email/password authentication
- Email verification required
- Row Level Security (RLS) for data protection
- Automatic user credit initialization

## 🤖 AI Integration

### Google Gemini AI
- **Model**: Gemini 2.0 Flash
- **Features**: Document analysis, edge case detection, user journey extraction
- **Fallback**: Demo data when AI service is unavailable

### Analysis Process
1. Document parsing and validation
2. User journey extraction
3. Edge case identification
4. Business impact assessment
5. Comprehensive report generation

## 💳 Credit System

- **Free Credits**: 3 credits for new users
- **Credit Usage**: 1 credit per analysis
- **Payment**: Integrated with Instamojo (India)
- **Tracking**: Complete usage history and analytics

## 📁 Project Structure

```
flowmender/
├── src/
│   ├── components/          # React components
│   ├── services/           # Business logic and API calls
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Third-party integrations
│   └── App.tsx             # Main application component
├── supabase/
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── netlify.toml           # Netlify configuration
```

## 🧪 Key Components

- **FileUpload**: Document upload with validation
- **EdgeCaseFinder**: AI-powered analysis engine
- **ResultsViewer**: Interactive analysis results display
- **AuthModal**: User authentication interface
- **CreditDisplay**: Credit balance and usage tracking
- **ExportOptions**: Multiple export format support

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Tailwind CSS for styling
- Modular architecture with clear separation of concerns

## 📈 Analytics

FlowMender includes comprehensive analytics tracking:
- User interactions and behavior
- Analysis completion rates
- Credit usage patterns
- Export preferences
- Error tracking and debugging

## 🛡️ Security

- Row Level Security (RLS) on all database tables
- Environment variable protection
- Content Security Policy headers
- Input validation and sanitization
- Secure authentication flow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful document analysis
- **Supabase** for backend infrastructure
- **Tailwind CSS** for beautiful UI components
- **React** and **TypeScript** for robust frontend development

---

**Built with ❤️ for product teams who want to ship better products faster.**