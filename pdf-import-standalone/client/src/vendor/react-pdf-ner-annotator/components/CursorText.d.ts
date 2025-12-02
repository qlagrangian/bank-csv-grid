import { FC } from 'react';
import { Entity } from '../interfaces/entity';
import { Point } from '../interfaces/point';
interface Props {
    mouseCoords: Point;
    entity?: Entity;
}
declare const CursorText: FC<Props>;
export default CursorText;
