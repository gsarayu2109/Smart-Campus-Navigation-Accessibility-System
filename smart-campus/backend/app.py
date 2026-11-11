from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
try:
    from .routing import load_campus, multi_stop_route
except ImportError:
    from routing import load_campus, multi_stop_route

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
STATIC_ROOT = PROJECT_ROOT / "frontend" / "static"

app = Flask(__name__, static_folder=str(STATIC_ROOT), static_url_path="/static")
campus = load_campus()


@app.after_request
def disable_dev_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIST, "index.html")


@app.get("/assets/<path:filename>")
def frontend_assets(filename):
    return send_from_directory(FRONTEND_DIST / "assets", filename)


@app.get("/api/locations")
def locations():
    return jsonify(campus["nodes"])


@app.get("/api/route")
def route():
    stops = request.args.get("stops", "").split(",")
    stops = [stop.strip() for stop in stops if stop.strip()]
    mode = request.args.get("mode", "normal")
    try:
        return jsonify(multi_stop_route(campus, stops, mode))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)
