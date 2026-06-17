
import numpy as np
def landing_score(slope,ice,illum,rough):
    return 0.4*(1-slope)+0.25*ice+0.2*illum+0.15*(1-rough)
