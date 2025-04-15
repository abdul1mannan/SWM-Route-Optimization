'use client';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState, useEffect } from "react";

const DefaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const yellowIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  return null;
}

const Map = ({
  dustbins,
  onToggleStatus,
  onDustbinAdd,
  onDustbinRemove,
  route = [],
  alternativeRoute = [],
  garageLocation,
  disposalSite,
  onGarageLocationSet,
  onDisposalSiteSet,
}) => {
  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState(null);
  const [clickMode, setClickMode] = useState("dustbin");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setClickedLocation({ lat, lng });
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (!clickedLocation) return;

    if (clickMode === 'dustbin') {
      const newDustbin = {
        id: dustbins.length + 1,
        lat: clickedLocation.lat,
        lng: clickedLocation.lng,
        status: 'green'
      };
      onDustbinAdd(newDustbin);
    } else if (clickMode === 'garage') {
      if (garageLocation) {
        alert('Garage location is already set. Please remove the existing garage before setting a new one.');
        return;
      }
      onGarageLocationSet(clickedLocation);
    } else if (clickMode === 'disposal') {
      if (disposalSite) {
        alert('Disposal site is already set. Please remove the existing disposal site before setting a new one.');
        return;
      }
      onDisposalSiteSet(clickedLocation);
    }

    setShowConfirmation(false);
    setClickedLocation(null);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setClickedLocation(null);
  };

  if (!mounted) {
    return <div className="h-[600px] w-full bg-gray-200 animate-pulse" />;
  }

  const routeCoordinates =
    route && route.length > 0
      ? route.map((point) => [point.lat, point.lng])
      : [];

  return (
    <div className="h-[600px] w-full relative rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Map Controls</h3>
          <div className="flex flex-col gap-2">
            <MapButton
              active={clickMode === "dustbin"}
              onClick={() => setClickMode("dustbin")}
              icon="🗑️"
              label="Add Dustbin"
            />
            <MapButton
              active={clickMode === "garage"}
              onClick={() => setClickMode("garage")}
              icon="🏢"
              label="Set Garage"
              disabled={garageLocation !== null}
            />
            <MapButton
              active={clickMode === "disposal"}
              onClick={() => setClickMode("disposal")}
              icon="📍"
              label="Set Disposal"
              disabled={disposalSite !== null}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 transform transition-all">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">
                  {clickMode === "dustbin" ? "🗑️" : clickMode === "garage" ? "🏢" : "📍"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Confirm Location</h3>
              <p className="text-gray-600 mt-2">
                Add {clickMode === "dustbin" ? "a dustbin" : clickMode === "garage" ? "the garage" : "the disposal site"} at
                ({clickedLocation?.lat.toFixed(4)}, {clickedLocation?.lng.toFixed(4)})?
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={[23.8143, 86.4412]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        whenCreated={setMap}
        className="z-0"
      >
        <MapClickHandler onMapClick={handleMapClick} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {garageLocation && (
          <Marker
            position={[garageLocation.lat, garageLocation.lng]}
            icon={blueIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">Garage</p>
                <p>Starting Point</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGarageLocationSet(null);
                    map?.closePopup();
                    setClickMode("garage");
                  }}
                  className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove Garage
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {disposalSite && (
          <Marker
            position={[disposalSite.lat, disposalSite.lng]}
            icon={yellowIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">Disposal Site</p>
                <p>End Point</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisposalSiteSet(null);
                    map?.closePopup();
                  }}
                  className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove Disposal Site
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {route.length > 0 && (
          <Polyline
            positions={route.map(point => [point.lat, point.lng])}
            color="#3388ff"
            weight={4}
            opacity={0.7}
          />
        )}

        {alternativeRoute.length > 0 && (
          <Polyline
            positions={alternativeRoute.map(point => [point.lat, point.lng])}
            color="#ff3333"
            weight={4}
            opacity={0.7}
          />
        )}

        {dustbins &&
          dustbins.map((dustbin) => (
            <Marker
              key={dustbin.id}
              position={[dustbin.lat, dustbin.lng]}
              icon={dustbin.status === "red" ? redIcon : greenIcon}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold">Dustbin #{dustbin.id}</p>
                  <p>
                    Status:{" "}
                    {dustbin.status === "red" ? "Needs Collection" : "Clean"}
                  </p>
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => onToggleStatus(dustbin.id)}
                      className={`px-3 py-1 rounded ${
                        dustbin.status === "red" ? "bg-red-500" : "bg-green-500"
                      } text-white hover:opacity-90`}
                    >
                      Toggle Status
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDustbinRemove(dustbin.id);
                        map?.closePopup();
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove Dustbin
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

const MapButton = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
      ${active 
        ? 'bg-blue-500 text-white shadow-md' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'hover:scale-[1.02]'
      }
    `}
  >
    <span className="text-lg">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default Map;
