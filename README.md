# 🚀 AI Career Navigator

AI Career Navigator is a comprehensive, AI-powered platform designed to help students and job seekers navigate their professional journeys. From deep resume analysis to interactive career roadmaps and alumni networking, this tool leverages state-of-the-art AI to bridge the gap between education and employment.

**🌐 Live Demo:** [https://ai-career-navigator-ashen.vercel.app/](https://ai-career-navigator-ashen.vercel.app/)

---

## ✨ Key Features

- **📄 AI Resume Analyzer:** Upload your resume to get a real-time ATS compatibility score. Receive deep insights into keyword matching, formatting warnings, and AI-suggested improvements using the "XYZ formula."
- **🗺️ AI Roadmap Agent:** Generate personalized, step-by-step career roadmaps based on your target role and current skill level.
- **💬 AI Chat Assistant:** A 24/7 career coach powered by Gemini to answer industry-specific questions and provide guidance.
- **🎓 Alumni Network:** Connect with seniors and alumni through an integrated database to gain mentorship and referral opportunities.
- **📊 User Dashboard:** Track your progress, saved resumes, and generated roadmaps in one centralized location.

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
### 2️⃣ Install Dependencies

```bash
npm install
```
---
### 3️⃣ Environment Variables

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
### 4️⃣ Run the development server

```bash
npm run dev
```
* Open http://localhost:3002 to see the result.
---
