from flask import Flask, request, jsonify
from flask_cors import CORS
# We import the instantiated 'grid' object (aliased as led_manager) from your library
from controller.led_manager import led_manager 

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def read_root():
    """Health check: Lists available sections."""
    # We access .sections.keys() because 'led_manager' is now a GridSystem object
    return jsonify({
        "status": "LED System Online", 
        "available_sections": list(led_manager.sections.keys())
    })

@app.route("/set-color", methods=["POST"])
def set_color():
    """
    Control lights. Can target an entire section OR a specific building.
    
    Example Body (Section):
    { "section": "downtown", "r": 255, "g": 0, "b": 0 }

    Example Body (Specific Building):
    { "section": "downtown", "building": "hospital", "r": 0, "g": 255, "b": 0 }
    """
    data = request.json
    
    # 1. Extract params
    section = data.get("section")
    building = data.get("building") # Optional parameter
    r = data.get("r")
    g = data.get("g")
    b = data.get("b")

    # 2. Validate essentials
    if not section or any(c is None for c in [r, g, b]):
        return jsonify({"error": "Missing parameters. Requires 'section', 'r', 'g', 'b'"}), 400

    # 3. Choose logic based on if a building name was provided
    if building:
        # Target specific building
        success, message = led_manager.set_building_color(section, building, int(r), int(g), int(b))
    else:
        # Target entire section
        success, message = led_manager.set_section_color(section, int(r), int(g), int(b))
    
    # 4. Return result
    if not success:
        return jsonify({"status": "error", "message": message}), 404
    
    return jsonify({"status": "success", "message": message})

@app.route("/off", methods=["POST"])
def turn_off():
    """Turns all lights off."""
    led_manager.wipe_off()
    return jsonify({"status": "success", "message": "All lights off"})

if __name__ == "__main__":
    # Standard Flask startup
    app.run(host="0.0.0.0", port=8000, debug=False)