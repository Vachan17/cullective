# Cullective AI 📸

> AI-powered photo culling and workflow management platform for photographers, videographers, and editors.

![Cullective AI](https://img.shields.io/badge/Cullective-AI-gold?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-20-green?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square)

---

## 🚀 Overview

Cullective AI is a production-ready MERN stack application that helps photographers save time by automatically analyzing, organizing, and culling large photo shoots using AI. Perfect for wedding photographers, event photographers, and professional editors.

---

## ✨ Features

- **Smart Upload** — Drag & drop bulk upload with real-time progress
- **AI Photo Analysis** — Detect blurry, closed eyes, duplicates, over/underexposed images
- **Duplicate Grouping** — pHash-based similarity detection with best-pick suggestions
- **Smart Collections** — Auto-organized folders: Best Picks, Portraits, Blurry, etc.
- **AI Recommendations** — Editing suggestions with Lightroom/Photoshop integration
- **Advanced Search** — Natural language search across your photo library
- **Analytics Dashboard** — Quality distribution charts and shoot statistics
- **Cinematic UI** — Dark glassmorphism design with Framer Motion animations

---

## 🗂 Project Structure

```
cullective-ai/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Base components (Button, Card, Modal, etc.)
│   │   │   ├── layout/        # Navbar, Sidebar, Footer
│   │   │   ├── dashboard/     # Dashboard-specific components
│   │   │   ├── upload/        # Upload components
│   │   │   ├── photos/        # Photo viewer components
│   │   │   ├── collections/   # Collections components
│   │   │   └── auth/          # Auth forms
│   │   ├── pages/             # Route-level pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand state stores
│   │   ├── utils/             # Utility functions
│   │   └── lib/               # Third-party integrations
│   └── public/
├── server/                    # Node.js + Express backend
│   ├── controllers/           # Route handlers
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Express routers
│   ├── middleware/            # Auth, error, upload middleware
│   ├── services/              # AI analysis, Cloudinary, etc.
│   ├── utils/                 # Helpers
│   └── config/                # DB, Cloudinary config
└── docker-compose.yml
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| State | Zustand |
| Routing | React Router v6 |
| UI Kit | shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Storage | Cloudinary |
| Auth | JWT, Google OAuth |
| AI/Vision | Sharp, pHash, face-api.js |
| Charts | Recharts |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Cloudinary account

### 1. Clone & Install

```bash
git clone https://github.com/yourname/cullective-ai.git
cd cullective-ai

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Environment Variables

**server/.env**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cullective
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**client/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Run Development

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start backend
cd server && npm run dev

# Terminal 3: Start frontend
cd client && npm run dev
```

Visit: http://localhost:5173

---

## 📡 API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/google` | Google OAuth login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/stats` | Project statistics |

### Photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/photos/upload` | Upload photos |
| GET | `/api/photos/:projectId` | List project photos |
| GET | `/api/photos/detail/:id` | Photo detail |
| DELETE | `/api/photos/:id` | Delete photo |
| PUT | `/api/photos/:id/status` | Update status |
| POST | `/api/photos/bulk-action` | Bulk operations |
| GET | `/api/photos/search` | Search photos |

### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/analyze/:photoId` | Analyze single photo |
| POST | `/api/analysis/analyze-project/:projectId` | Analyze full project |
| GET | `/api/analysis/results/:projectId` | Get analysis results |
| GET | `/api/analysis/duplicates/:projectId` | Get duplicate groups |

### Collections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collections/:projectId` | List collections |
| POST | `/api/collections` | Create collection |
| PUT | `/api/collections/:id/photos` | Add/remove photos |

---

## 🗄 Database Schema

### User
```js
{
  name, email, password (hashed),
  googleId, avatar,
  plan: ['free', 'pro', 'studio'],
  storageUsed, storageLimit,
  createdAt, updatedAt
}
```

### Project
```js
{
  name, description, userId,
  coverImage, shootDate, shootType,
  status: ['uploading', 'analyzing', 'ready'],
  totalPhotos, analyzedPhotos,
  tags, createdAt
}
```

### Photo
```js
{
  projectId, userId,
  filename, originalName,
  cloudinaryId, url, thumbnailUrl,
  width, height, fileSize, format,
  status: ['pending', 'analyzed', 'rejected', 'starred'],
  aiScore, aiTags, analysis: { ... },
  pHash, duplicateGroup,
  createdAt
}
```

### Analysis
```js
{
  photoId, projectId,
  sharpness, exposure, faceCount,
  eyesOpen, blur, noise,
  dominantColors, composition,
  recommendations: [{ issue, fix, params }],
  processedAt
}
```

---

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual Production
```bash
# Build frontend
cd client && npm run build

# Serve with PM2
cd server && pm2 start ecosystem.config.js
```

---

## 🗺 Development Roadmap

### Phase 1 (MVP) ✅
- [x] User authentication (JWT + Google)
- [x] Project management
- [x] Bulk photo upload to Cloudinary
- [x] Basic AI analysis (blur, exposure)
- [x] Dashboard with analytics
- [x] Smart Collections

### Phase 2 (AI Enhancement)
- [ ] Advanced face detection with face-api.js
- [ ] pHash duplicate detection
- [ ] Burst shot grouping
- [ ] AI scene classification
- [ ] Natural language search (OpenAI embeddings)

### Phase 3 (Pro Features)
- [ ] Lightroom Classic plugin
- [ ] Photoshop direct open
- [ ] Team collaboration
- [ ] Client gallery sharing
- [ ] Mobile app (React Native)
- [ ] Local folder sync

### Phase 4 (Scale)
- [ ] GPU-accelerated analysis
- [ ] Python microservice for CV
- [ ] Real-time progress via WebSockets
- [ ] CDN optimization
- [ ] Enterprise SSO

---

## 📄 License

MIT © 2024 Cullective AI
#   c u l l e c t i v e  
 