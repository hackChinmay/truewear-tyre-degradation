import React from 'react';
import { InteractiveCircuitMap } from './InteractiveCircuitMap';

/**
 * Backwards compatibility wrapper for MonzaCircuitMap.
 * Renders the dynamic InteractiveCircuitMap supporting Monza, Silverstone, Spa, and any selected circuit.
 */
export const MonzaCircuitMap: React.FC = () => {
  return <InteractiveCircuitMap />;
};

export default MonzaCircuitMap;
