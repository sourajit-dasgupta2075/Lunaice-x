
import numpy as np
def normalize(a):
    return (a-a.min())/(a.max()-a.min()+1e-8)
def build_features(h,c,s,p,e):
    return np.column_stack([h.flatten(),c.flatten(),s.flatten(),p.flatten(),e.flatten()])
