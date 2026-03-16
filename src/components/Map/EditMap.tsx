'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Next.js Leaflet default marker missing error
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface EditMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  isMapContainerReady: boolean;
}

export default function EditMap({ lat, lng, onLocationChange, isMapContainerReady }: EditMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (isMapContainerReady && mapContainerRef.current && !mapInstanceRef.current) {
      const initialLat = lat || -36.8485;
      const initialLng = lng || 174.7633;
      
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], lat ? 15 : 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      map.on('click', (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        onLocationChange(newLat, newLng);
        
        if (!markerRef.current) {
          markerRef.current = L.marker([newLat, newLng]).addTo(map);
        } else {
          markerRef.current.setLatLng([newLat, newLng]);
        }
      });

      mapInstanceRef.current = map;
    }

    // Effect for handling external coordinate updates via prop changes (e.g., Geocode search)
    if (mapInstanceRef.current && lat && lng) {
      mapInstanceRef.current.setView([lat, lng], 16);
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    return () => {
      if (mapInstanceRef.current && !isMapContainerReady) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isMapContainerReady]); // specifically removing lat/lng from the generic setup dependencies avoiding re-render flickering
  
  useEffect(() => {
      // Small isolated effect purely to fly map if location changes heavily 
      if (mapInstanceRef.current && lat && lng) {
          if(!markerRef.current) {
               markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else {
               markerRef.current.setLatLng([lat, lng]);
          }
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
      }
  }, [lat, lng]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
