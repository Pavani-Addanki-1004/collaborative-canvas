# Collaborative Canvas

Minimal real-time collaborative drawing canvas using vanilla JS + Node.js + Socket.io.

Setup

1. Clone the repository and cd into the folder:

	git clone <repo> && cd collaborative-canvas

2. Install dependencies:

	npm install

3. Start the server:

	npm start

4. Open multiple browser windows and visit http://localhost:3000. Use the same room id to join the same canvas.

If you plan to deploy, see the Deployment section below.

Notes about this environment

- I created the project scaffold inside this workspace. I could not run `npm install` here because the execution environment does not have network access to fetch packages. Running locally on your machine will install Express and Socket.io normally.

Testing with multiple users

- Open two different browsers (or an incognito window) and join the same room id.
- Drawing in one should show strokes in the other (real-time). Undo/redo are server-driven and broadcast.

Known limitations

- Small, minimal implementation focused on demonstrating protocol and canvas usage.
- Undo/redo is implemented on the server as history & redo stack. Clients keep a local mirror but do not request a fresh history on every undo; refreshing the page syncs full state.
- Cursor rendering is scaffolded but not fully implemented visually.

Time spent: ~2 hours (scaffold + core features)

Deployment

1) Heroku (recommended quick deploy)

- Create a Heroku app and push the repository. Heroku will run `npm install` and use the `Procfile` to start the server.

Example (PowerShell):

```powershell
heroku login
cd path\to\collaborative-canvas
git init
heroku git:remote -a <your-heroku-app-name>
git add .
git commit -m "deploy"
git push heroku main
```

2) Render

- Create a new Web Service on Render, connect your GitHub repo, set the build command `npm install` and start command `npm start`.

3) Docker (any container host)

Build and run locally with Docker:

```powershell
cd path\to\collaborative-canvas
docker build -t collaborative-canvas .
docker run -p 3000:3000 collaborative-canvas
```

Offline / air-gapped environments

If your deployment host cannot fetch npm packages, you have two options:

- Preinstall node_modules locally and include them in the container image / artifact you upload (less ideal and increases repo size).
- Use a private npm registry (Artifactory/Nexus) or vendor the required packages (create a tarball of node_modules and copy it during build).

Troubleshooting

- If you see "Cannot find module 'express'" when running `node server/server.js`, run `npm install` in the project root to install dependencies.
- Make sure Node.js 16+ is installed on the deployment host.


This is my deployed app :
Access it from this link i have given beolw:
https://690cc74a8306857ada8ebc74--unrivaled-souffle-4953ba.netlify.app/
