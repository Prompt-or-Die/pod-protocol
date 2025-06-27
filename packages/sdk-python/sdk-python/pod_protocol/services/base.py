"""
Base service class for PoD Protocol Python SDK services
"""

from typing import Optional
from anchorpy import Program

class BaseService:
    def __init__(self, config: dict):
        self.connection = config.get('connection')
        self.program_id = config.get('program_id')
        self.commitment = config.get('commitment')
        self.program: Optional[Program] = None

    def set_program(self, program: Program):
        self.program = program

    def is_initialized(self) -> bool:
        return self.program is not None

    async def cleanup(self):
        pass
