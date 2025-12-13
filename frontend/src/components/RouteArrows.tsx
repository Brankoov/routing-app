import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-polylinedecorator';

type Props = {
  positions: [number, number][];
};

export function RouteArrows({ positions }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!map || !positions || positions.length === 0) return;

    // FIX: Vi använder (L as any) för att TypeScript inte ska klaga
    // på att polylineDecorator saknas i typdefinitionen.
    const decorator = (L as any).polylineDecorator(positions, {
      patterns: [
        {
          offset: '10%',      
          repeat: '80px',     
          // FIX: Samma sak här för L.Symbol
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 15,    
            polygon: false,   
            pathOptions: { 
                stroke: true, 
                color: '#fff', 
                weight: 4,     
                opacity: 1 
            }
          })
        }
      ]
    });

    decorator.addTo(map);

    return () => {
      decorator.remove();
    };
  }, [map, positions]); 

  return null; 
}