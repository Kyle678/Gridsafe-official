from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from controller import led_manager

app = FastAPI()

class LightCommand(BaseModel):
    section: str
    r: int
    g: int
    b: int

@app.get("/")
def read_root():
    return {"status": "LED System Online", "available_sections": list(led_manager.SECTIONS.keys())}

@app.post("/set-color")
def set_color(command: LightCommand):
    """
    Example JSON Body:
    {
        "section": "all",
        "r": 50,
        "g": 0,
        "b": 0
    }
    """
    success, message = led_manager.set_section_color(
        command.section, 
        command.r, 
        command.g, 
        command.b
    )
    
    if not success:
        raise HTTPException(status_code=404, detail=message)
    
    return {"status": "success", "message": message}

@app.post("/off")
def turn_off():
    led_manager.wipe_off()
    return {"status": "success", "message": "All lights off"}