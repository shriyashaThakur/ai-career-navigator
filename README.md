# 🚀 AI Career Navigator

AI Career Navigator is a comprehensive, AI-powered platform designed to help students and job seekers navigate their professional journeys. From deep resume analysis to interactive career roadmaps and alumni networking, this tool leverages state-of-the-art AI to bridge the gap between education and employment.

**🌐 Live Demo:** [https://ai-career-navigator-ashen.vercel.app/](https://ai-career-navigator-ashen.vercel.app/)

---

## ✨ Key Features

- **📄 AI Resume Analyzer:** Upload your resume to get a real-time ATS compatibility score. Receive deep insights into keyword matching, formatting warnings, and AI-suggested improvements using the professional "XYZ formula."
- **🗺️ AI Roadmap Agent:** Generate personalized, step-of-step career roadmaps based on your target role and current skill level to help you navigate your learning journey.
- **💬 RAG-Powered AI Chatbot:** A context-aware career assistant powered by Gemini. Because it uses **Retrieval-Augmented Generation (RAG)**, you can ask specific questions about your uploaded resumes and generated roadmaps for personalized, data-driven advice.
- **🎓 Alumni Connect:** Browse professional profiles of successful alumni and directly access their **LinkedIn** profiles to build meaningful connections, seek mentorship, or request referrals from those already in the industry.
- **📊 Centralized Dashboard:** A unified hub to quickly view and access your past resume analyses and saved career roadmaps without searching through different pages.

---

## 🛠️ Tech Stack

| Category           | Technology                                                                 |
|--------------------|----------------------------------------------------------------------------|
| **Framework** | Next.js 16.2.1 (App Router + Turbopack)                                   |
| **AI Engine** | Google Gemini 1.5/2.0 Flash                                               |
| **Database** | Neon (Serverless PostgreSQL)                                              |
| **ORM** | Drizzle ORM                                                               |
| **Authentication** | Clerk                                                                     |
| **Deployment** | Vercel                                                                    |
| **PDF Processing** | PDF-Parse (Custom Worker Implementation)                                  |
| **Styling** | Tailwind CSS + Shadcn UI                                                  |

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone [https://github.com/shriyashaThakur/ai-career-navigator.git](https://github.com/shriyashaThakur/ai-career-navigator.git)
cd ai-career-navigator
```
### 2. Install Dependencies

```bash
npm install
```
---
### 3. Environment Variables

* Create a .env.local file in the root directory and add the following:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

DATABASE_URL=your_neon_db_url
GEMINI_API_KEY=your_google_gemini_api_key
```
---
### 4. Run the development server

```bash
npm run dev
```
* Open http://localhost:3002 to see the result.
---
