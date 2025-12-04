import time
from rpi_ws281x import PixelStrip, Color

# LED STRIP CONFIGURATION
LED_COUNT = 1500        # Number of LED pixels.
LED_PIN = 18          # GPIO pin connected to the pixels (18 uses PWM!).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 10          # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 255  # Set to 0 for darkest and 255 for brightest
LED_INVERT = False    # True to invert the signal (when using NPN transistor level shift)
LED_CHANNEL = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53

# SECTION DEFINITIONS (Name: [Start Index, End Index])
# Adjust these ranges based on your physical setup
SECTIONS = {
    "all": (0, LED_COUNT),
    "left": (0, 20),
    "center": (20, 40),
    "right": (40, 60)
}

class LEDController:
    def __init__(self):
        self.strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
        self.strip.begin()

    def wipe_off(self):
        """Turn off all LEDs"""
        for i in range(self.strip.numPixels()):
            self.strip.setPixelColor(i, Color(0, 0, 0))
        self.strip.show()

    def set_section_color(self, section_name, r, g, b):
        """Sets a specific section to a specific RGB color"""
        if section_name not in SECTIONS:
            return False, "Section not found"

        start, end = SECTIONS[section_name]
        
        # Convert RGB to Color object
        color = Color(r, g, b)

        for i in range(start, end):
            # Safety check to ensure we don't go out of bounds
            if i < self.strip.numPixels():
                self.strip.setPixelColor(i, color)
        
        self.strip.show()
        return True, f"Set {section_name} to ({r},{g},{b})"

# Create a singleton instance to be imported by the API
led_manager = LEDController()