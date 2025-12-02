import React from 'react';
import { TextLayerItem } from '../../interfaces/textLayer';
interface Props {
    textLayerItem: TextLayerItem;
    tokens: Array<string>;
    offset: number;
    pageNumber: number;
}
declare const _default: React.MemoExoticComponent<({ textLayerItem, tokens, offset, pageNumber }: Props) => React.JSX.Element>;
export default _default;
