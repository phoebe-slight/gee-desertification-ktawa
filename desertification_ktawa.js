//========
//  AOI
//========

// Define the Area of Interest (AOI). Replace with your own FeatureCollection if using a different region.

var geometry = ee.FeatureCollection("users/phoebeslight1/Ktawa_Overall_Geometry");

//=====================
//Training data assets
//=====================
// Define each training dataset and assign land-cover class codes

var Bare = ee.FeatureCollection("users/phoebeslight1/Bare_Ktawa")
  .map(function(feature) { return feature.set('landcover', 60); });

var Desertified = ee.FeatureCollection("users/phoebeslight1/Desertified_Ktawa")  
  .map(function(feature) { return feature.set('landcover', 110); });

var Vegetated = ee.FeatureCollection("users/phoebeslight1/Vegetation_Ktawa")
  .map(function(feature) { return feature.set('landcover', 10); });

var Builtup = ee.FeatureCollection("users/phoebeslight1/Built_Up_Ktawa")
  .map(function(feature) { return feature.set('landcover', 150); });
  
var Mountainous = ee.FeatureCollection("users/phoebeslight1/Mountainous_Polygon_1") 
  .map(function(feature) { return feature.set('landcover', 200); });

  
 
 
//Sentinel-2
// This function takes a Sentinel-2 image as input, processes it to mask out // clouds and cirrus clouds, scales the values, and selects the relevant bands. 

function maskS2clouds(image) {
  var qa = image.select('QA60')
  var cloudBitMask = ee.Number(2).pow(10).int()
  var cirrusBitMask = ee.Number(2).pow(11).int()
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0))
  return image.updateMask(mask).divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start"])
}

// This code retrieves a median composite image from the Sentinel-2 ImageCollection ('COPERNICUS/S2') for a specific time period
// while filtering out cloudy pixels and clipping the result to a specified geometry.

var S2 = ee.ImageCollection("COPERNICUS/S2")
  .filterDate('2021-06-01', '2021-8-31') 
  .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 5))
  .filterBounds(geometry)
  .map(maskS2clouds)
  .select(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12' ,'B8A'])
  .median()
  .clip(geometry);


// Tasseled Cap (Step 1 to 5)

// Step 1: Define a 2D array 'S2_coeff' that contains Tasseled Cap coefficients for spectral transformation.

var S2_coeff = ee.Array([
 [0.0356, 0.0822, 0.1360, 0.2611, 0.2964, 0.3338, 0.3877, 0.3895, 0.949, 0.0009, 0.3882, 0.1366, 0.4750],
 [-0.0635, -0.1128, -0.1680, -0.3480, -0.3303, 0.0852, 0.3302, 0.3165, 0.0467 ,-0.0009, -0.4578, -0.4064, 0.3625],
 [0.0649, 0.1363, 0.2802, 0.3072, 0.5288, 0.1379, -0.0001, -0.0807, -0.0302, 0.0003, -0.4064, -0.5602, -0.1389],
]);

// Step 2: Convert the 2D array 'S2_coeff' to a 1D array 'arrayImage1D'.

var arrayImage1D = S2.toArray();
print(arrayImage1D);
  
// Step 3: Convert the 1D array 'arrayImage1D' to a 2D array 'arrayImage2D'.

var arrayImage2D = arrayImage1D.toArray(1); 

// Step 4: Perform a matrix multiplication of 'S2_coeff' and 'arrayImage2D', then project and flatten the resulting array into an image.
 
var componentsImage = ee.Image(S2_coeff)
  .matrixMultiply(arrayImage2D)
  .arrayProject([0])
  .arrayFlatten(
    [['brightness', 'greenness', 'wetness']]);


// Step 5: Define visualization parameters for the components image.

var vizParams = {
  bands: ['brightness', 'greenness', 'wetness'],
  min: [0.3754, -0.3038, -0.1134],
  max: [1.5125, 0.1667, 0.0968]
};


// Add Sentinel-2 and its Tasseled Cap components to the map with specified visualization parameters.

Map.addLayer(S2, {bands: ['B8', 'B4', 'B3'], min: 0, max: 0.5}, 'S2', false);
Map.addLayer(componentsImage, vizParams, 'components', false);

// Define training classes, color map, and merge Sentinel-1 and Tasseled Cap components.
// Input your classes here
var landcover_train = Desertified.merge(Bare).merge(Vegetated).merge(Builtup).merge(Mountainous);
print(landcover_train)

// Define a color map for visualization.
var sld_intervals =
'<RasterSymbolizer>' +
  '<ColorMap type="intervals" extended="false">' +
    '<ColorMapEntry color="#ff7043" quantity="150" label="Builtup"/>' + 
    '<ColorMapEntry color="#F2F4F4" quantity="60" label="Bare"/>' +
    '<ColorMapEntry color="#fff176" quantity="10" label="Vegetated"/>' + 
    '<ColorMapEntry color="#9fa8da" quantity="110" label="Desertified"/>' + 
    '<ColorMapEntry color="#8B7765" quantity="200" label="Mountainous"/>' + 
  '</ColorMap>' +
'</RasterSymbolizer>';

// Load Sentinel-1 data.
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
                    .filterDate('2021-06-01', '2021-8-31');

// Filter Sentinel-1 data by polarization and mode.
var vvIw = sentinel1
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'));

// Separate ascending and descending orbits.
var vvIwAsc = vvIw.filter(
  ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var vvIwDesc = vvIw.filter(
  ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

// Calculate the mean of VV polarization for both orbits.
var vvIwAscDescMean = vvIwAsc.merge(vvIwDesc).mean();

// Merge Tasseled Cap components and Sentinel-1 data.
var merged = ee.Image(componentsImage.addBands(S2.addBands(vvIwAscDescMean)));

// Training data sampling.
var training = merged.sampleRegions({
  collection: landcover_train,
  properties: ['landcover'],
  scale: 10
});
 
// Train a Random Forest classifier.
var classifier = ee.Classifier.smileRandomForest(10)
    .train({
      features: training,
      classProperty: 'landcover',
      inputProperties: ['brightness', 'greenness', 'wetness', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12' ,'B8A', 'VV']
    });

// Classify the input imagery.
var classified = merged.classify(classifier);
 
// Add classified image to the map with styling.
Map.addLayer(classified.sldStyle(sld_intervals), {}, 'RF_class2', false);

// Display desert regions.
var desert = classified.eq(110);
Map.addLayer(desert.mask(desert), {palette: 'F87A2D'}, 'desert', false);

var mountain = classified.eq(200);
Map.addLayer(mountain.mask(mountain), {palette: '8B7765'}, 'mountainous', false);


// add in training data
Map.addLayer(landcover_train, {}, 'training') 
 
// Center the map on a specific geometry.
Map.centerObject(geometry)
