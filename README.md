## Random Forest Desertification Classification (Google Earth Engine)

This repository contains a Google Earth Engine (GEE) script for mapping land cover and desertification using Sentinel-2, Sentinel-1 and Tasseled Cap components.

The script was adapted from a desertification detection workflow by Dr Louise Rayne (Newcastle University) and updated and maintained by **Phoebe Slight (2025)**.

## What the script does

The script:

- Uses an Area of Interest (AOI) for the Ktawa region.
- Loads **Sentinel-2 Level-2A** imagery (surface reflectance).
- Applies a simple **cloud and cirrus mask** using the `QA60` band.
- Creates a **median composite** for summer 2021 (June–August).
- Computes **Tasseled Cap components**:
  - Brightness  
  - Greenness  
  - Wetness
- Loads **Sentinel-1 GRD IW VV** data (ascending + descending) and calculates the mean.
- Combines:
  - Tasseled Cap components  
  - Sentinel-2 bands B1–B12, B8A  
  - Sentinel-1 VV
- Uses **training polygons** with land-cover labels to train a **Random Forest classifier**.
- Classifies the imagery into land-cover classes.
- Creates separate layers for:
  - Full Random Forest classification  
  - Desertified areas only  
  - Mountainous areas only  
  - Training data

## Land-cover classes

Each training FeatureCollection is given a numeric class code:

- Vegetated — `10`
- Bare — `60`
- Desertified — `110`
- Built-up — `150`
- Mountainous — `200`

These codes are stored in the `landcover` property and are used by the classifier.

## Inputs you must provide

You need to replace the asset paths with your own GEE assets:

- **AOI geometry**  
  - `users/phoebeslight1/Ktawa_Overall_Geometry`
- **Training data polygons**  
  - Bare: `users/phoebeslight1/Bare_Ktawa`  
  - Desertified: `users/phoebeslight1/Desertified_Ktawa`  
  - Vegetation: `users/phoebeslight1/Vegetation_Ktawa`  
  - Built-up: `users/phoebeslight1/Built_Up_Ktawa`  
  - Mountainous: `users/phoebeslight1/Mountainous_Polygon_1`

If you use a different study area, upload your own FeatureCollections and update these paths.

## How to use the script

1. Open the **Google Earth Engine Code Editor**.
2. Make sure your AOI and training polygons are uploaded as **FeatureCollections**.
3. Replace the asset paths at the top of the script with your own.
4. Paste the full script into a new GEE script.
5. Click **Run**.

You should see the following layers (you can turn them on/off in the Layers panel):

- `S2` — Sentinel-2 composite (false colour)
- `components` — Tasseled Cap brightness, greenness, wetness
- `RF_class2` — Random Forest land-cover classification (styled)
- `desert` — pixels classified as Desertified (`110`)
- `mountainous` — pixels classified as Mountainous (`200`)
- `training` — your training polygons

The map will centre on the AOI geometry.

## Requirements

- A Google Earth Engine account.
- Access to:
  - `COPERNICUS/S2` (Sentinel-2 Level-2A)
  - `COPERNICUS/S1_GRD` (Sentinel-1 GRD)
- AOI and training data uploaded as FeatureCollections.

## Attribution

- Original concept/script: **Dr Louise Rayne**, Newcastle University  
- Adapted and maintained by: **Phoebe Slight (2025)**  
- Contact (original author): `louiserayne@googlemail.com` / `louise.rayne@ncl.ac.uk`
