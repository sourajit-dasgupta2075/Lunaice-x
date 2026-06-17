
import rasterio
def read_raster(path):
    with rasterio.open(path) as src:
        return src.read(1),src.profile
