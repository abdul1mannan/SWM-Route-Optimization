'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import RouteOptimizer from './components/RouteOptimizer';

const MapWrapper = dynamic(() => import('./components/MapWrapper'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-200 animate-pulse rounded-lg shadow-lg" />
});


export default function Home() {
  const [dustbins, setDustbins] = useState([]);
  const [route, setRoute] = useState([]);
  const [alternativeRoute, setAlternativeRoute] = useState([]);
  const [garageLocation, setGarageLocation] = useState(null);
  const [disposalSite, setDisposalSite] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDustbinStatus = (id) => {
      setDustbins(prevDustbins => {
      const updatedDustbins = prevDustbins.map(dustbin => 
        dustbin.id === id 
          ? { ...dustbin, status: dustbin.status === 'red' ? 'green' : 'red' }
          : dustbin
      );
      return updatedDustbins;
    });
    setRoute([]);
  };

  const handleDustbinAdd = (newDustbin) => {

    setDustbins(prevDustbins => {
      const updatedDustbins = [...prevDustbins, newDustbin];
      return updatedDustbins;
    });
    setRoute([]);
  };

  const handleDustbinRemove = (id) => {
    setDustbins(prevDustbins => prevDustbins.filter(dustbin => dustbin.id !== id));
    setRoute([]);
  };

  const handleGarageLocationSet = (location) => {
    setGarageLocation(location);
    setRoute([]);
  };

  const handleDisposalSiteSet = (location) => {
    setDisposalSite(location);
    setRoute([]);
  };

  const handleRouteCalculated = (newRoute, newAlternativeRoute, garage, disposal) => {
    setRoute(newRoute);
    setAlternativeRoute(newAlternativeRoute);
    if (garage) setGarageLocation(garage);
    if (disposal) setDisposalSite(disposal);
  };

  useEffect(() => {
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-600">
            IIT Dhanbad Waste Management System
          </span>
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <MapWrapper 
                dustbins={dustbins} 
                onToggleStatus={toggleDustbinStatus}
                onDustbinAdd={handleDustbinAdd}
                onDustbinRemove={handleDustbinRemove}
                route={route}
                alternativeRoute={alternativeRoute}
                garageLocation={garageLocation}
                disposalSite={disposalSite}
                onGarageLocationSet={handleGarageLocationSet}
                onDisposalSiteSet={handleDisposalSiteSet}
              />
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-100/50 hover:shadow-2xl transition-all duration-300">
              <RouteOptimizer 
                dustbins={dustbins}
                onRouteCalculated={handleRouteCalculated}
                garageLocation={garageLocation}
                disposalSite={disposalSite}
              />
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-100/50 hover:shadow-2xl transition-all duration-300">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-semibold text-gray-800">System Status</h3>
                </div>
                <p className="text-gray-600 text-sm mb-6">Real-time monitoring of waste management operations</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard 
                  label="Total Dustbins" 
                  value={dustbins.length}
                  icon="🗑️"
                  trend={dustbins.length > 0 ? '+' : ''}
                />
                <StatCard 
                  label="Red Dustbins" 
                  value={dustbins.filter(d => d.status === 'red').length}
                  icon="🔴"
                  trend="!"
                  urgency={true}
                />
              </div>
              
              <div className="space-y-4">
                <StatusItem 
                  label="Garage Location" 
                  value={garageLocation ? 'Active' : 'Not Set'}
                  icon="🏢"
                  status={garageLocation ? 'active' : 'inactive'}
                />
                <StatusItem 
                  label="Disposal Site" 
                  value={disposalSite ? 'Active' : 'Not Set'}
                  icon="📍"
                  status={disposalSite ? 'active' : 'inactive'}
                />
        
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// New StatCard component for key metrics
const StatCard = ({ label, value, icon, trend, urgency = false }) => (
  <div className={`p-4 rounded-xl ${
    urgency && value > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
  } border shadow-sm hover:shadow-md transition-all duration-300`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-2xl">{icon}</span>
      {trend && (
        <span className={`text-sm font-bold ${
          urgency && value > 0 ? 'text-red-500' : 'text-green-500'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-2">
      <h4 className="text-sm text-gray-600">{label}</h4>
      <p className={`text-2xl font-bold ${
        urgency && value > 0 ? 'text-red-700' : 'text-blue-700'
      }`}>
        {value}
      </p>
    </div>
  </div>
);

// Enhanced StatusItem component
const StatusItem = ({ label, value, icon, status }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${statusColors[status]} transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className={`px-3 py-1 rounded-lg ${
        status === 'active' ? 'bg-green-200/50' : 'bg-gray-200/50'
      }`}>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
};
