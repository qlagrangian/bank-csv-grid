import React from 'react';
interface Props {
    children: React.ReactNode;
    message: string;
}
declare const Tooltip: ({ children, message }: Props) => React.JSX.Element;
export default Tooltip;
