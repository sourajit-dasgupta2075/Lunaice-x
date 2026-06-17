
import numpy as np
def compute_slope(dem):
    dx=np.gradient(dem,axis=1)
    dy=np.gradient(dem,axis=0)
    return np.degrees(np.arctan(np.sqrt(dx**2+dy**2)))
