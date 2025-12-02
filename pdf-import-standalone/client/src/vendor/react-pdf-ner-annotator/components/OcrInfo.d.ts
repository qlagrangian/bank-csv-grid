import React from 'react';
interface Props {
    loading: boolean;
    error?: string;
    message?: string;
}
declare const OcrInfo: ({ loading, error, message }: Props) => React.JSX.Element;
export default OcrInfo;
