'use client';

import { useState } from 'react';

const RouteOptimizer = ({ dustbins, onRouteCalculated, garageLocation, disposalSite }) => {
  const [optimalRoute, setOptimalRoute] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const getRoadRoute = async (start, end) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return data.routes[0].geometry.coordinates.map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching road route:', error);
      return [];
    }
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
        onRouteCalculated([], garageLocation, disposalSite);
        return;
      }

      // Calculate distance between two points using road distance
      const calculateRoadDistance = async (point1, point2) => {
        try {
          const route = await getRoadRoute(point1, point2);
          if (route.length === 0) return Infinity;
          
          // Calculate total distance of the route
          let totalDistance = 0;
          for (let i = 1; i < route.length; i++) {
            const R = 6371; // Earth's radius in km
            const dLat = (route[i].lat - route[i-1].lat) * Math.PI / 180;
            const dLng = (route[i].lng - route[i-1].lng) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(route[i-1].lat * Math.PI / 180) * Math.cos(route[i].lat * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            totalDistance += R * c;
          }
          return totalDistance;
        } catch (error) {
          console.error('Error calculating road distance:', error);
          return Infinity;
        }
      };

      // Start with garage location
      let currentLocation = garageLocation;
      let unvisited = [...redDustbins];
      let route = [];
      let roadRoute = [];

      while (unvisited.length > 0) {
        // Find nearest unvisited dustbin using road distance
        let nearestIndex = 0;
        let minDistance = await calculateRoadDistance(currentLocation, unvisited[0]);

        for (let i = 1; i < unvisited.length; i++) {
          const distance = await calculateRoadDistance(currentLocation, unvisited[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }

        if (minDistance === Infinity) {
          alert('Unable to calculate route to some dustbins. Please check the locations and try again.');
          return;
        }

        // Add to route and update current location
        route.push(unvisited[nearestIndex]);
        currentLocation = unvisited[nearestIndex];
        unvisited.splice(nearestIndex, 1);
      }

      // Get road route from last dustbin to disposal site
      const finalRoute = await getRoadRoute(currentLocation, disposalSite);
      if (finalRoute.length === 0) {
        alert('Unable to calculate route to disposal site. Please check the location and try again.');
        return;
      }
      roadRoute = [...route, ...finalRoute];

      setOptimalRoute(route);
      onRouteCalculated(roadRoute, garageLocation, disposalSite);
    } catch (error) {
      console.error('Error calculating optimal route:', error);
      alert('An error occurred while calculating the route. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const redDustbinsCount = dustbins.filter(d => d.status === 'red').length;

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

        <RoutePointsCard route={optimalRoute} dustbins={dustbins} />

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

const RoutePointsCard = ({ route, dustbins }) => {
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
    </div>
  );
};

export default RouteOptimizer; 