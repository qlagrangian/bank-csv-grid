import React from 'react';
interface Props {
    scale: number;
    setScale: (scale: number) => void;
}
declare const ButtonGroup: ({ scale, setScale }: Props) => React.JSX.Element;
export default ButtonGroup;
