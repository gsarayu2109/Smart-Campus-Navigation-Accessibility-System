# Smart Campus Navigation

A Flask MVP for campus-wide navigation. It supports any start and destination, up to three optional middle stops, normal/accessibility route modes, step directions, distance/time totals, and local image cards for every mapped place.

## Run in development

From this folder:

```powershell
python -m pip install -r requirements.txt
python backend/app.py
```

In a second PowerShell window, run the React development server:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:5173. The Vite server proxies API requests to Flask.

## Run the built application

```powershell
npm install
npm run build
python backend/app.py
```

Open http://127.0.0.1:5000. Flask serves the React production build.

## Route API

```text
GET /api/locations
GET /api/route?stops=gate,library,canteen&mode=normal
```

The current graph is a schematic prototype based on estimated distances. Replace the node coordinates and edge distances in `database/campus_data.json` with verified GPS/path data before deployment.
