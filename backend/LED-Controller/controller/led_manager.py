import board
import neopixel
import time

# ==========================================
# 1. BUILDING CLASS
# ==========================================
class Building:
    def __init__(self, name, start_index, led_count, strip_ref):
        """
        :param name: e.g. "Hospital"
        :param start_index: The global index on the strip where this building starts
        :param led_count: How many LEDs are inside this building
        :param strip_ref: Reference to the main neopixel object
        """
        self.name = name
        self.start = start_index
        self.count = led_count
        self.end = start_index + led_count
        self.strip = strip_ref
        
    def set_color(self, r, g, b):
        """Sets all LEDs in this specific building to a color."""
        for i in range(self.start, self.end):
            self.strip[i] = (r, g, b)
        self.strip.show()

    def set_status(self, status):
        """Helper for GridSafe specific states."""
        if status == "normal":
            self.set_color(0, 255, 0)   # Green
        elif status == "warning":
            self.set_color(255, 140, 0) # Orange
        elif status == "attack":
            self.set_color(255, 0, 0)   # Red
        elif status == "offline":
            self.set_color(0, 0, 0)     # Off

# ==========================================
# 2. SECTION CLASS
# ==========================================
class Section:
    def __init__(self, name):
        self.name = name
        self.buildings = {} # Dictionary of Building objects

    def add_building(self, building_obj):
        self.buildings[building_obj.name] = building_obj

    def get_building(self, name):
        return self.buildings.get(name)

    def set_color(self, r, g, b):
        """Sets the entire section to one color."""
        for building in self.buildings.values():
            # We set internal pixels directly to avoid calling show() 10 times
            for i in range(building.start, building.end):
                building.strip[i] = (r, g, b)
        # One show() at the end
        list(self.buildings.values())[0].strip.show()

# ==========================================
# 3. MAIN SYSTEM CONTROLLER
# ==========================================
class GridSystem:
    def __init__(self, pin=board.D18, total_leds=300, brightness=0.5):
        # Initialize Hardware
        self.strip = neopixel.NeoPixel(pin, total_leds, brightness=brightness, auto_write=False)
        self.sections = {}
        self.total_leds = total_leds

    def create_section(self, name):
        """Creates a new empty section (e.g. 'downtown')."""
        self.sections[name] = Section(name)
        return self.sections[name]

    def add_building(self, section_name, building_name, start_index, count):
        """Registers a building to a section."""
        if section_name not in self.sections:
            raise ValueError(f"Section '{section_name}' does not exist.")
            
        b = Building(building_name, start_index, count, self.strip)
        self.sections[section_name].add_building(b)

    # --- Global Controls ---
    def wipe_off(self):
        self.strip.fill((0, 0, 0))
        self.strip.show()

    def set_section_color(self, section_name, r, g, b):
        if section_name == "all":
            self.strip.fill((r, g, b))
            self.strip.show()
            return True, "Set all lights"
        
        if section_name in self.sections:
            self.sections[section_name].set_color(r, g, b)
            return True, f"Set {section_name} to ({r},{g},{b})"
        
        return False, f"Section '{section_name}' not found"

    def set_building_color(self, section_name, building_name, r, g, b):
        """Target a specific building."""
        sec = self.sections.get(section_name)
        if not sec: return False, "Section not found"
        
        bld = sec.get_building(building_name)
        if not bld: return False, "Building not found"
        
        bld.set_color(r, g, b)
        return True, f"Set {building_name} in {section_name}"

# ==========================================
# 4. CONFIGURATION (Edit this part!)
# ==========================================
# Instantiate the system
grid = GridSystem(total_leds=100) # Change to your actual total LED count

# --- DEFINE YOUR LAYOUT HERE ---
# 1. Create Sections
downtown = grid.create_section("downtown")
suburbs = grid.create_section("suburbs")
industrial = grid.create_section("industrial")

# 2. Add Buildings to Sections
# (Section Name, Building Name, Start LED Index, Number of LEDs)
grid.add_building("downtown", "hospital", 0, 5)     # LEDs 0-4
grid.add_building("downtown", "bank", 5, 5)         # LEDs 5-9
grid.add_building("suburbs", "house_1", 10, 3)      # LEDs 10-12
grid.add_building("suburbs", "house_2", 13, 3)      # LEDs 13-15
grid.add_building("industrial", "plant", 20, 10)    # LEDs 20-29

# Export 'grid' so app.py can use it
# In app.py, you will now import 'grid' instead of 'led_manager'
led_manager = grid