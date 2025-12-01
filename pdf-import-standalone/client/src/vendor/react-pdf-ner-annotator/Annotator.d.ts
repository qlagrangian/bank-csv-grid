import React from 'react';
import { Entity, IEntityHover } from './interfaces/entity';
import { Annotation } from './interfaces/annotation';
import { TextLayer } from './interfaces/textLayer';
import { Config } from './interfaces/config';
interface Props {
    config?: Config;
    url?: string;
    data?: Uint8Array | BufferSource | string;
    initialScale?: number;
    tokenizer?: RegExp;
    entity?: Entity;
    initialTextMap?: Array<TextLayer>;
    defaultAnnotations?: Array<Annotation>;
    hoveredEntities?: Array<IEntityHover>;
    rotation?: number;
    getAnnotations(annotations: Array<Annotation>): void;
    getTextMaps?(textMaps: Array<TextLayer>): void;
    onLoadSuccess?(totalPages: number): void;
}
declare const _default: React.MemoExoticComponent<React.ForwardRefExoticComponent<Props & React.RefAttributes<any>>>;
export default _default;
