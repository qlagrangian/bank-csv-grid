import React from 'react';
import { Rectangle } from 'tesseract.js';
interface Props {
    isDragging: boolean;
    coordinates: Rectangle;
}
declare const SelectionRectangle: ({ isDragging, coordinates }: Props) => React.JSX.Element;
export default SelectionRectangle;
