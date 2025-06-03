 Super Rugby Fixtures Manager

A Next.js application for managing and searching Super Rugby Pacific fixtures data.

## Features

- Upload CSV files containing Super Rugby fixtures
- Store data in MongoDB
- Real-time search functionality
- Detailed fixture information display
- Responsive design

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up MongoDB connection string and Virustotal API key
1. Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string
4. Create a free account at [https://www.virustotal.com/gui/join-us](https://www.virustotal.com/gui/sign-in)
5. Find your Virustotal API key
6. Create a `.env.local` file in the root directory and include them:

```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/super-rugby-db?retryWrites=true&w=majority
VIRUSTOTAL_API_KEY=your-API-key
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000] to view the application.
