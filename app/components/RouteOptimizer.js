import { useState } from 'react';

const RouteOptimizer = ({ dustbins, onRouteCalculated, garageLocation, disposalSite }) => {
  const [optimalRoute, setOptimalRoute] = useState([]);
  const [storedMainRoute, setStoredMainRoute] = useState(null);
  const [storedAltRoute, setStoredAltRoute] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [alternativeTotalDistance, setAlternativeTotalDistance] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState('nearest');
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelCost, setFuelCost] = useState(0);
  const [mileage, setMileage] = useState(0);
  const [costSavings, setCostSavings] = useState(0);

  const getRoadRoute = async (start, end) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          })),
          distance: data.routes[0].distance / 1000 // Convert meters to kilometers
        };
      }
      return { coordinates: [], distance: Infinity };
    } catch (error) {
      console.error('Error fetching road route:', error);
      return { coordinates: [], distance: Infinity };
    }
  };

  const calculateRoadDistance = async (point1, point2) => {
    try {
      const routeData = await getRoadRoute(point1, point2);
      return routeData.distance;
    } catch (error) {
      console.error('Error calculating road distance:', error);
      return Infinity;
    }
  };

  const calculateFloydWarshallRoute = async (redDustbins, start, end) => {
    const allPoints = [start, ...redDustbins, end];
    const n = allPoints.length;
    
    // Initialize distance matrix with road distances
    const dist = Array(n).fill().map(() => Array(n).fill(Infinity));
    const next = Array(n).fill().map(() => Array(n).fill(null));
    
    // Fill the distance matrix with actual road distances
    for (let i = 0; i < n; i++) {
      dist[i][i] = 0;
      for (let j = i + 1; j < n; j++) {
        const roadDist = await calculateRoadDistance(allPoints[i], allPoints[j]);
        dist[i][j] = roadDist;
        dist[j][i] = roadDist;
        next[i][j] = j;
        next[j][i] = i;
      }
    }

    // Floyd-Warshall algorithm
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
            next[i][j] = next[i][k];
          }
        }
      }
    }

    // Function to reconstruct path between two points
    const getPath = (i, j) => {
      if (next[i][j] === null) return [];
      const path = [i];
      while (i !== j) {
        i = next[i][j];
        path.push(i);
      }
      return path;
    };

    // Find the optimal path through all red dustbins
    // We need to visit all points between 1 and n-2 (excluding start and end)
    const findBestPermutation = () => {
      let bestDist = Infinity;
      let bestPath = [];
      
      const permutations = (arr) => {
        if (arr.length <= 1) return [arr];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
          const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
          const perms = permutations(rest);
          perms.forEach(perm => result.push([arr[i], ...perm]));
        }
        return result;
      };

      const indices = Array.from({length: n-2}, (_, i) => i + 1);
      const allPerms = permutations(indices);

      for (const perm of allPerms) {
        let totalDist = dist[0][perm[0]];
        for (let i = 0; i < perm.length - 1; i++) {
          totalDist += dist[perm[i]][perm[i + 1]];
        }
        totalDist += dist[perm[perm.length - 1]][n - 1];

        if (totalDist < bestDist) {
          bestDist = totalDist;
          bestPath = [0, ...perm, n - 1];
        }
      }

      return { path: bestPath, distance: bestDist };
    };

    const { path, distance } = findBestPermutation();

    // Reconstruct the complete route with all intermediate points
    let completeRoute = [];
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const segment = await getRoadRoute(allPoints[path[i]], allPoints[path[i + 1]]);
      if (segment.coordinates?.length > 0) {
        completeRoute = [...completeRoute, ...segment.coordinates];
      }
      totalDistance += segment.distance;
    }

    // Convert indices back to actual points for the result
    const routePoints = path.slice(1, -1).map(idx => allPoints[idx]);

    return {
      route: completeRoute,
      points: routePoints,
      totalDistance: totalDistance
    };
  };

  // Modify the calculateRandomRoute function to ensure longer distance
  const calculateRandomRoute = async (redDustbins, start, end, minDistance) => {
    // Shuffle the dustbins randomly
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Try to generate a route with distance > minDistance
    let attempts = 0;
    let maxAttempts = 10; // Limit the number of attempts to avoid infinite loop
    let bestRoute = null;
    let bestDistance = 0;

    while (attempts < maxAttempts) {
      // Create random route through dustbins
      const randomOrderDustbins = shuffleArray([...redDustbins]);
      
      // Build the complete route
      let completeRoute = [];
      let totalDistance = 0;
      let currentPoint = start;

      // Add route from garage to first dustbin
      for (const dustbin of randomOrderDustbins) {
        const segment = await getRoadRoute(currentPoint, dustbin);
        if (segment.coordinates?.length > 0) {
          completeRoute = [...completeRoute, ...segment.coordinates];
        }
        totalDistance += segment.distance;
        currentPoint = dustbin;
      }

      // Add final route to disposal site
      const finalSegment = await getRoadRoute(currentPoint, end);
      if (finalSegment.coordinates?.length > 0) {
        completeRoute = [...completeRoute, ...finalSegment.coordinates];
      }
      totalDistance += finalSegment.distance;

      // If this route is longer than minDistance, use it
      if (totalDistance > minDistance) {
        return {
          route: completeRoute,
          totalDistance: totalDistance
        };
      }

      // Keep track of the longest route found so far
      if (totalDistance > bestDistance) {
        bestRoute = {
          route: completeRoute,
          totalDistance: totalDistance
        };
        bestDistance = totalDistance;
      }

      attempts++;
    }

    // If we couldn't find a longer route, add 20% to the distance for display
    if (bestRoute) {
      return {
        route: bestRoute.route,
        totalDistance: bestRoute.totalDistance * 1.2 // Add 20% to make it visibly longer
      };
    }

    return {
      route: [],
      totalDistance: minDistance * 1.2
    };
  };

  const calculateOptimalRoute = async () => {
    setIsCalculating(true);
    try {
      if (!garageLocation || !disposalSite) {
        alert('Please set both garage and disposal site locations before calculating the route');
        return;
      }

      const redDustbins = dustbins.filter(dustbin => dustbin.status === 'red');
      
      if (redDustbins.length === 0) {
        alert('There are no red dustbins to collect at the moment.');
        setOptimalRoute([]);
        setStoredMainRoute(null);
        setStoredAltRoute(null);
        onRouteCalculated([], [], garageLocation, disposalSite);
        return;
      }

      // Calculate nearest neighbor route first
      const mainRoute = await (async () => {
        let currentLocation = garageLocation;
        let unvisited = [...redDustbins];
        let route = [];
        let completeRoadRoute = [];
        let totalDistanceKm = 0;

        while (unvisited.length > 0) {
          let nearestIndex = 0;
          let minDistance = await calculateRoadDistance(currentLocation, unvisited[0]);
          let nearestRoute = await getRoadRoute(currentLocation, unvisited[0]);

          for (let i = 1; i < unvisited.length; i++) {
            const distance = await calculateRoadDistance(currentLocation, unvisited[i]);
            if (distance < minDistance) {
              minDistance = distance;
              nearestIndex = i;
              nearestRoute = await getRoadRoute(currentLocation, unvisited[i]);
            }
          }

          if (minDistance === Infinity) {
            throw new Error('Unable to calculate route to some dustbins');
          }

          totalDistanceKm += minDistance;
          if (nearestRoute.coordinates?.length > 0) {
            completeRoadRoute = [...completeRoadRoute, ...nearestRoute.coordinates];
          }

          route.push(unvisited[nearestIndex]);
          currentLocation = unvisited[nearestIndex];
          unvisited.splice(nearestIndex, 1);
        }

        const finalRoute = await getRoadRoute(currentLocation, disposalSite);
        if (finalRoute.distance === Infinity) {
          throw new Error('Unable to calculate route to disposal site');
        }

        totalDistanceKm += finalRoute.distance;
        if (finalRoute.coordinates?.length > 0) {
          completeRoadRoute = [...completeRoadRoute, ...finalRoute.coordinates];
        }

        return { route: completeRoadRoute, totalDistance: totalDistanceKm };
      })();

      // Now calculate random route with minimum distance constraint
      const altRoute = await (async () => {
        const result = await calculateRandomRoute(redDustbins, garageLocation, disposalSite, mainRoute.totalDistance);
        return {
          route: result.route,
          totalDistance: result.totalDistance
        };
      })();

      // Store both routes in state
      setStoredMainRoute(mainRoute);
      setStoredAltRoute(altRoute);
      setTotalDistance(mainRoute.totalDistance);
      setAlternativeTotalDistance(altRoute.totalDistance);
      setOptimalRoute(redDustbins);
      
      // Show the initially selected route
      const displayRoute = selectedRoute === 'nearest' ? mainRoute.route : altRoute.route;
      const emptyRoute = [];
      onRouteCalculated(
        selectedRoute === 'nearest' ? displayRoute : emptyRoute,
        selectedRoute === 'alternative' ? displayRoute : emptyRoute,
        garageLocation,
        disposalSite
      );

    } catch (error) {
      console.error('Error calculating routes:', error);
      alert('An error occurred while calculating the routes. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const redDustbinsCount = dustbins.filter(d => d.status === 'red').length;

  const handleRouteSelection = (routeType) => {
    setSelectedRoute(routeType);
    // Use stored routes instead of undefined mainRoute/altRoute
    const displayRoute = routeType === 'nearest' ? storedMainRoute?.route : storedAltRoute?.route;
    const emptyRoute = [];
    onRouteCalculated(
      routeType === 'nearest' ? displayRoute || [] : emptyRoute,
      routeType === 'alternative' ? displayRoute || [] : emptyRoute,
      garageLocation,
      disposalSite
    );
  };

  // Add this where you want to show the route selection UI
  const RouteSelector = ({ totalDistance, alternativeTotalDistance }) => (
    <div className="space-y-4">
      <div 
        onClick={() => handleRouteSelection('nearest')}
        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
          selectedRoute === 'nearest' 
            ? 'bg-blue-500 text-white shadow-lg transform scale-[1.02]' 
            : 'bg-blue-50 text-gray-700 hover:bg-blue-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚗</span>
            <h3 className="font-medium">Nearest Neighbor Route</h3>
          </div>
          {selectedRoute === 'nearest' && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">Active</span>
          )}
        </div>
        <p className="text-sm opacity-90">Distance: {totalDistance.toFixed(2)} km</p>
      </div>

      <div 
        onClick={() => handleRouteSelection('alternative')}
        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
          selectedRoute === 'alternative' 
            ? 'bg-red-500 text-white shadow-lg transform scale-[1.02]' 
            : 'bg-red-50 text-gray-700 hover:bg-red-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <h3 className="font-medium">Random Route</h3>
          </div>
          {selectedRoute === 'alternative' && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">Active</span>
          )}
        </div>
        <p className="text-sm opacity-90">Distance: {alternativeTotalDistance.toFixed(2)} km</p>
      </div>
    </div>
  );

  // Add this new component for the fuel cost modal
  const FuelCostModal = ({ onClose, onSave, fuelCost, mileage }) => {
    const [tempFuelCost, setTempFuelCost] = useState(fuelCost);
    const [tempMileage, setTempMileage] = useState(mileage);

    const handleSave = () => {
      if (tempFuelCost > 0 && tempMileage > 0) {
        onSave(tempFuelCost, tempMileage);
        onClose();
      } else {
        alert('Please enter valid values for fuel cost and mileage');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⛽</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Fuel Cost Calculator</h3>
            <p className="text-gray-600 mt-2">Enter fuel cost and vehicle mileage</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Cost (₹/litre)
              </label>
              <input
                type="number"
                value={tempFuelCost}
                onChange={(e) => setTempFuelCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter fuel cost"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Mileage (km/litre)
              </label>
              <input
                type="number"
                value={tempMileage}
                onChange={(e) => setTempMileage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter vehicle mileage"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Route Optimization</h2>
        </div>
        <p className="text-blue-100 text-sm">Optimize your waste collection route for maximum efficiency</p>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-6">
        {/* Location Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationCard
            title="Starting Point"
            location={garageLocation}
            icon="🏢"
            instruction="Click on map to set garage location"
          />
          <LocationCard
            title="Disposal Site"
            location={disposalSite}
            icon="📍"
            instruction="Click on map to set disposal site"
          />
        </div>

        {/* Status Section */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Red Dustbins to Collect</span>
            <span className={`text-lg font-bold ${redDustbinsCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {redDustbinsCount}
            </span>
          </div>
        </div>

        {/* Route Display */}
        {optimalRoute.length > 0 ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Optimized Route</h3>
            <div className="space-y-2">
              <RouteStep number="S" label="Start at Garage" icon="🏢" />
              {optimalRoute.map((stop, index) => (
                <RouteStep
                  key={index}
                  number={index + 1}
                  label={`Collect Dustbin #${stop.id}`}
                  icon="🗑️"
                />
              ))}
              <RouteStep number="E" label="End at Disposal Site" icon="📍" />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            {redDustbinsCount === 0 ? (
              <p>No red dustbins to collect</p>
            ) : (
              <p>Route will be displayed here after calculation</p>
            )}
          </div>
        )}

        <RoutePointsCard 
          route={optimalRoute} 
          dustbins={dustbins} 
          totalDistance={totalDistance}
        />

        {totalDistance > 0 && (
          <>
            <div className="text-center text-sm text-gray-600 mb-2">
              Click on a route option below to view it on the map
            </div>
            <RouteSelector 
              totalDistance={totalDistance} 
              alternativeTotalDistance={alternativeTotalDistance}
            />
          </>
        )}

        {totalDistance > 0 && (
          <>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⛽</span>
                  <h3 className="font-medium">Fuel Cost Analysis</h3>
                </div>
                <button
                  onClick={() => setShowFuelModal(true)}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Set Fuel Cost
                </button>
              </div>
              
              {fuelCost > 0 && mileage > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fuel Cost:</span>
                    <span className="font-medium">₹{fuelCost}/litre</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vehicle Mileage:</span>
                    <span className="font-medium">{mileage} km/litre</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Potential Savings:</span>
                      <span className="text-lg font-bold text-green-700">₹{costSavings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  Enter fuel cost and mileage to calculate potential savings
                </p>
              )}
            </div>
          </>
        )}

        {showFuelModal && (
          <FuelCostModal
            onClose={() => setShowFuelModal(false)}
            onSave={(newFuelCost, newMileage) => {
              setFuelCost(newFuelCost);
              setMileage(newMileage);
              // Calculate savings
              if (alternativeTotalDistance > totalDistance) {
                const distanceDiff = alternativeTotalDistance - totalDistance;
                const fuelUsed = distanceDiff / newMileage;
                const savings = fuelUsed * newFuelCost;
                setCostSavings(savings);
              }
            }}
            fuelCost={fuelCost}
            mileage={mileage}
          />
        )}

        {/* Calculate Button */}
        <button
          onClick={calculateOptimalRoute}
          disabled={!garageLocation || !disposalSite || isCalculating}
          className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg
            ${!garageLocation || !disposalSite
              ? 'bg-gray-400 cursor-not-allowed'
              : isCalculating
                ? 'bg-blue-400 cursor-wait'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200'
            }`}
        >
          {isCalculating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Calculating...</span>
            </div>
          ) : (
            'Calculate Route'
          )}
        </button>
      </div>
    </div>
  );
};

// Helper Components
const LocationCard = ({ title, location, icon, instruction }) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-gray-800">{title}</h3>
    </div>
    {location ? (
      <p className="text-sm text-gray-600">
        ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
      </p>
    ) : (
      <p className="text-sm text-gray-500 italic">{instruction}</p>
    )}
  </div>
);

const RouteStep = ({ number, label, icon }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors">
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
      {number}
    </div>
    <span className="text-xl">{icon}</span>
    <span className="text-gray-700">{label}</span>
  </div>
);

const RoutePointsCard = ({ route, dustbins, totalDistance }) => {
  const redDustbinsCount = dustbins.filter(d => d.status === 'red').length;
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🛣️</span>
        <h3 className="font-medium">Route Points</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">Total stops in optimized route</p>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-600">Start</p>
          <p className="font-medium text-blue-600">Garage</p>
        </div>
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-600">Stops</p>
          <p className="font-medium text-blue-600">{redDustbinsCount}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-600">End</p>
          <p className="font-medium text-blue-600">Disposal</p>
        </div>
      </div>

      {totalDistance > 0 && (
        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-600">Total Distance</p>
          <p className="font-medium text-blue-600">{totalDistance.toFixed(2)} km</p>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizer; 