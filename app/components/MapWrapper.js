'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-200 animate-pulse" />
});

const MapWrapper = ({ dustbins, onToggleStatus, onDustbinAdd, onDustbinRemove, route, alternativeRoute, garageLocation, disposalSite, onGarageLocationSet, onDisposalSiteSet }) => {
  return (
    <Map
      dustbins={dustbins}
      onToggleStatus={onToggleStatus}
      onDustbinAdd={onDustbinAdd}
      onDustbinRemove={onDustbinRemove}
      route={route}
      alternativeRoute={alternativeRoute}
      garageLocation={garageLocation}
      disposalSite={disposalSite}
      onGarageLocationSet={onGarageLocationSet}
      onDisposalSiteSet={onDisposalSiteSet}
    />
  );
};

export default MapWrapper; 