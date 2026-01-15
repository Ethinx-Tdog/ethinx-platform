# Placeholder scheduler
class EthinxScheduler:
    def __init__(self, persistence):
        self.persistence = persistence
    
    def start(self, background=True):
        pass
    
    def stop(self):
        pass
    
    def get_status(self):
        return {"running": False}