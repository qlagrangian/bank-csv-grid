import React from 'react';
import { TextLayerItem } from '../../interfaces/textLayer';
interface Props {
    inView: boolean;
    shouldRender: boolean;
    canvasInitialized: boolean;
    textLayer: Array<TextLayerItem> | null;
    needsTokenization: boolean;
    pageNumber: number;
}
declare const _default: React.MemoExoticComponent<({ inView, shouldRender, canvasInitialized, textLayer, needsTokenization, pageNumber }: Props) => React.JSX.Element>;
export default _default;
