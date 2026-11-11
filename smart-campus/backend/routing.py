import heapq
import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "database" / "campus_data.json"
WALKING_SPEED_MPS = 1.3


def load_campus():
    with DATA_PATH.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def build_graph(campus):
    graph = {node["id"]: [] for node in campus["nodes"]}
    for edge in campus["edges"]:
        graph[edge["from"]].append(edge)
        graph[edge["to"]].append({**edge, "from": edge["to"], "to": edge["from"]})
    return graph


def shortest_path(campus, start_id, end_id, mode="normal"):
    nodes = {node["id"]: node for node in campus["nodes"]}
    if start_id not in nodes or end_id not in nodes:
        raise ValueError("Unknown start or destination location")
    graph = build_graph(campus)
    queue = [(0, start_id)]
    distances = {start_id: 0}
    previous = {}

    while queue:
        distance, current = heapq.heappop(queue)
        if distance != distances[current]:
            continue
        if current == end_id:
            break
        for edge in graph[current]:
            if mode == "accessible" and edge.get("stairs", False):
                continue
            candidate = distance + edge["distance"]
            if candidate < distances.get(edge["to"], float("inf")):
                distances[edge["to"]] = candidate
                previous[edge["to"]] = (current, edge)
                heapq.heappush(queue, (candidate, edge["to"]))

    if end_id not in distances:
        raise ValueError("No route is available for this journey")

    path = []
    current = end_id
    while current != start_id:
        prior, edge = previous[current]
        path.append({"from": prior, "to": current, "distance": edge["distance"], "hint": edge.get("hint", "Continue ahead.")})
        current = prior
    path.reverse()
    return {
        "from": nodes[start_id],
        "to": nodes[end_id],
        "nodes": [nodes[start_id], *[nodes[leg["to"]] for leg in path]],
        "legs": path,
        "distance": distances[end_id],
        "minutes": round(distances[end_id] / WALKING_SPEED_MPS / 60, 1),
    }


def multi_stop_route(campus, stops, mode="normal"):
    if len(stops) < 2:
        raise ValueError("At least a starting location and destination are required")
    segments = [shortest_path(campus, start, end, mode) for start, end in zip(stops, stops[1:])]
    return {
        "mode": mode,
        "accessibility": {
            "step_free_requested": mode == "accessible",
            "stairs_avoided": mode == "accessible" and any(
                leg.get("stairs", False)
                for segment in segments
                for leg in segment["legs"]
            ),
            "status": "Step-free data checked; no verified stair edges are in the current prototype." if mode == "accessible" else "Standard walking route.",
        },
        "segments": segments,
        "distance": sum(segment["distance"] for segment in segments),
        "minutes": round(sum(segment["minutes"] for segment in segments), 1),
    }
